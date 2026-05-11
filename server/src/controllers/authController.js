import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";

import { UserModel } from "../models/User.js";
import { LoginActivityModel } from "../models/LoginActivity.js";
import { env } from "../config/env.js";
import { emailQueue } from "../queues/index.js";
import { sendWelcomeEmail } from "../utils/email.js";
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  getEffectiveRole,
  normalizeEmail,
} from "../config/admin.js";
import { trackAction } from "../utils/suspicion.js";

const googleClient = new OAuth2Client();

function signAccessToken(user) {
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: getEffectiveRole(user),
      name: user.name,
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: "15m" },
  );
}

function signRefreshToken(userId) {
  if (!env.JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET missing");
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

function signTempToken(userId) {
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.sign({ sub: userId, purpose: "2fa" }, env.JWT_SECRET, { expiresIn: "5m" });
}

async function recordLoginActivity(req, user, refreshToken) {
  const ua = new UAParser(req.headers["user-agent"]).getResult();
  const geo = geoip.lookup(req.ip);
  await LoginActivityModel.create({
    user: user._id,
    ip: req.ip,
    city: geo?.city || "Unknown",
    country: geo?.country || "Unknown",
    device: `${ua.browser.name || "Unknown"} on ${ua.os.name || "Unknown"}`,
    sessionToken: refreshToken.slice(0, 8),
  });

  const records = await LoginActivityModel.find({ user: user._id })
    .sort({ createdAt: -1 })
    .skip(10)
    .select("_id")
    .lean();
  if (records.length > 0) {
    await LoginActivityModel.deleteMany({ _id: { $in: records.map((item) => item._id) } });
  }
}

async function issueSession(req, res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save();

  const isCrossSiteClient = /^https:\/\//i.test(env.CLIENT_URL);
  const refreshCookieOptions = {
    httpOnly: true,
    secure: isCrossSiteClient || process.env.NODE_ENV === "production",
    sameSite: isCrossSiteClient ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  await recordLoginActivity(req, user, refreshToken);
  return res.json({ accessToken });
}

async function ensureDefaultAdmin() {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  const admin = await UserModel.findOne({ email: DEFAULT_ADMIN_EMAIL });

  if (!admin) {
    await UserModel.create({
      name: "Admin",
      email: DEFAULT_ADMIN_EMAIL,
      password: passwordHash,
      role: "admin",
    });
    return;
  }

  admin.name = admin.name || "Admin";
  admin.password = passwordHash;
  admin.role = "admin";
  await admin.save();

  await UserModel.updateMany(
    { email: { $ne: DEFAULT_ADMIN_EMAIL }, role: "admin" },
    { $set: { role: "user" } },
  );
}

export async function register(req, res) {
  const { name, email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "name, email, password are required" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }
  if (normalizedEmail === DEFAULT_ADMIN_EMAIL) {
    return res
      .status(400)
      .json({ error: "This email is reserved for the admin account" });
  }

  const existing = await UserModel.findOne({ email: normalizedEmail }).lean();
  if (existing)
    return res.status(409).json({ error: "Email already registered" });
  void trackAction(null, req.ip, "register").catch(() => {});

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({
    name,
    email: normalizedEmail,
    password: passwordHash,
    role: "user",
  });

  if (emailQueue) {
    void emailQueue.add({ type: "welcome", data: { user } }).catch(() => {});
  } else {
    void sendWelcomeEmail(user).catch(() => {});
  }

  return res.status(201).json({ id: user._id.toString() });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  if (normalizedEmail === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
    await ensureDefaultAdmin();
  }

  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  if (!user.password) {
    return res
      .status(401)
      .json({ error: "Use Google login for this account" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  if (user.twoFactorEnabled) {
    return res.json({
      requiresTwoFactor: true,
      tempToken: signTempToken(user._id.toString()),
    });
  }

  return issueSession(req, res, user);
}

export async function googleLogin(req, res) {
  const credential =
    typeof req.body.credential === "string" ? req.body.credential : "";

  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === "your_google_oauth_client_id_here") {
    return res.status(500).json({ error: "Google login is not configured" });
  }

  if (!credential) {
    return res.status(400).json({ error: "Google credential is required" });
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = normalizeEmail(payload?.email);
  const googleId = payload?.sub;
  const name = payload?.name || email?.split("@")[0] || "Google User";
  const avatar = payload?.picture || "";

  if (!email || !googleId) {
    return res.status(401).json({ error: "Invalid Google credential" });
  }

  if (email === DEFAULT_ADMIN_EMAIL) {
    return res
      .status(403)
      .json({ error: "Use admin password login for this account" });
  }

  let user = await UserModel.findOne({ email });
  if (!user) {
    user = await UserModel.create({
      name,
      email,
      password: "",
      role: "user",
      avatar,
      googleId,
      authProvider: "google",
    });
  } else {
    user.googleId = user.googleId || googleId;
    user.authProvider = user.authProvider || "google";
    user.avatar = user.avatar || avatar;
    user.name = user.name || name;
    await user.save();
  }

  return issueSession(req, res, user);
}

export async function refresh(req, res) {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken)
    return res.status(401).json({ error: "Missing refresh token" });
  if (!env.JWT_REFRESH_SECRET)
    return res.status(500).json({ error: "Server JWT_REFRESH_SECRET missing" });

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

    const userId = String(decoded.sub ?? "");
    if (!userId)
      return res.status(401).json({ error: "Invalid refresh token" });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      return res
        .status(401)
        .json({ error: "Refresh token rotated/invalidated" });
    }

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

export async function logout(req, res) {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      const userId = String(decoded.sub ?? "");
      if (userId) {
        await UserModel.updateOne(
          { _id: userId },
          { $set: { refreshToken: "" } },
        );
        await LoginActivityModel.updateOne(
          { user: userId, sessionToken: refreshToken.slice(0, 8), loggedOutAt: null },
          { $set: { loggedOutAt: new Date() } },
        );
      }
    } catch {
      // ignore invalid token
    }
  }

  const isCrossSiteClient = /^https:\/\//i.test(env.CLIENT_URL);
  res.clearCookie("refreshToken", {
    path: "/api/auth/refresh",
    secure: isCrossSiteClient || process.env.NODE_ENV === "production",
    sameSite: isCrossSiteClient ? "none" : "lax",
  });
  return res.status(200).json({ ok: true });
}

export async function logoutAll(req, res) {
  const refreshToken = req.cookies?.refreshToken ?? "";
  let currentUserId = "";
  try {
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      currentUserId = String(decoded.sub ?? "");
    }
  } catch {
    currentUserId = "";
  }

  if (!currentUserId) return res.status(401).json({ error: "Missing session" });

  await UserModel.updateOne({ _id: currentUserId }, { $set: { refreshToken: "" } });
  await LoginActivityModel.updateMany(
    {
      user: currentUserId,
      sessionToken: { $ne: refreshToken.slice(0, 8) },
      loggedOutAt: null,
    },
    { $set: { loggedOutAt: new Date() } },
  );

  return res.json({ success: true });
}

export async function setupTwoFactor(req, res) {
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const secret = speakeasy.generateSecret({
    name: `The Hidden Case (${user.email})`,
  });
  const recoveryCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex"),
  );

  user.twoFactorSecret = secret.base32;
  user.twoFactorRecoveryCodes = await Promise.all(
    recoveryCodes.map((code) => bcrypt.hash(code, 12)),
  );
  await user.save();

  const qrCode = await qrcode.toDataURL(secret.otpauth_url);
  return res.json({ qrCode, secret: secret.base32, recoveryCodes });
}

export async function verifyTwoFactorSetup(req, res) {
  const token = String(req.body.token ?? "");
  const user = await UserModel.findById(req.user.id);
  if (!user?.twoFactorSecret) {
    return res.status(400).json({ error: "2FA setup has not been started" });
  }

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1,
  });
  if (!valid) return res.status(400).json({ error: "Invalid 2FA code" });

  user.twoFactorEnabled = true;
  await user.save();
  return res.json({ success: true });
}

export async function disableTwoFactor(req, res) {
  const token = String(req.body.token ?? "");
  const user = await UserModel.findById(req.user.id);
  if (!user?.twoFactorSecret) return res.status(400).json({ error: "2FA is not enabled" });

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1,
  });
  if (!valid) return res.status(400).json({ error: "Invalid 2FA code" });

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.twoFactorRecoveryCodes = [];
  await user.save();
  return res.json({ success: true });
}

export async function loginTwoFactor(req, res) {
  const { tempToken, token } = req.body;
  let decoded;
  try {
    decoded = jwt.verify(tempToken, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired 2FA session" });
  }
  if (decoded.purpose !== "2fa") {
    return res.status(401).json({ error: "Invalid 2FA session" });
  }

  const user = await UserModel.findById(decoded.sub);
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ error: "2FA is not enabled" });
  }

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: String(token ?? ""),
    window: 1,
  });
  if (!valid) return res.status(401).json({ error: "Invalid 2FA code" });

  return issueSession(req, res, user);
}
