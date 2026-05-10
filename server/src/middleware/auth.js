import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getEffectiveRole } from "../config/admin.js";
import { UserModel } from "../models/User.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;

  if (!token) return res.status(401).json({ error: "Missing access token" });
  if (!env.JWT_SECRET)
    return res.status(401).json({ error: "Auth not configured" });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const id = String(decoded.sub ?? decoded.id ?? "");

    if (!id) return res.status(401).json({ error: "Invalid token payload" });

    const user = await UserModel.findById(id).select("email role").lean();
    if (!user) return res.status(401).json({ error: "User not found" });

    const role = getEffectiveRole(user);
    req.user = { id, _id: id, role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;

  if (!token || !env.JWT_SECRET) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const id = String(decoded.sub ?? decoded.id ?? "");
    if (!id) {
      next();
      return;
    }

    const user = await UserModel.findById(id).select("email role").lean();
    if (!user) {
      next();
      return;
    }

    req.user = { id, _id: id, role: getEffectiveRole(user) };
  } catch {
    // Public endpoints should remain public when an optional token is invalid.
  }

  next();
}
