import { Router } from "express";
import mongoose from "mongoose";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
import { PostModel } from "../models/Post.js";
import { LoginActivityModel } from "../models/LoginActivity.js";
import { CommentModel } from "../models/Comment.js";
import { NotificationModel } from "../models/Notification.js";
import { MessageModel } from "../models/Message.js";
import { KudosModel } from "../models/Kudos.js";
import bcrypt from "bcryptjs";
import { getEffectiveRole } from "../config/admin.js";
import { imageUpload } from "../middleware/upload.js";
import { createNotification } from "../utils/notify.js";
import { checkBadges } from "../utils/checkBadges.js";
import { awardXP } from "../utils/xp.js";
import { progressQuest } from "../utils/quests.js";
import { trackAction } from "../utils/suspicion.js";

export const usersRouter = Router();

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: getEffectiveRole(user),
    avatar: user.avatar,
    bio: user.bio,
    following: user.following ?? [],
    followers: user.followers ?? [],
    blockedUsers: user.blockedUsers ?? [],
    bookmarks: user.bookmarks ?? [],
    followedTags: user.followedTags ?? [],
    emailNotifications: user.emailNotifications ?? true,
    badges: user.badges ?? [],
    xp: user.xp ?? 0,
    level: user.level ?? "Apprentice",
    currentStreak: user.currentStreak ?? 0,
    longestStreak: user.longestStreak ?? 0,
    lastWrittenAt: user.lastWrittenAt,
  };
}

function sanitizeTag(value) {
  return String(value ?? "").trim().replace(/^#+/, "").toLowerCase();
}

usersRouter.get("/me", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({ user: toPublicUser(user) });
});

async function updateMe(req, res) {
  const { name, bio } = req.body;
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (typeof name === "string" && name.trim()) user.name = name.trim();
  if (typeof bio === "string") user.bio = bio.trim();
  if (typeof req.body.emailNotifications === "boolean") {
    user.emailNotifications = req.body.emailNotifications;
  }

  await user.save();

  return res.json({ user: toPublicUser(user) });
}

usersRouter.patch("/me", requireAuth, updateMe);
usersRouter.put("/me", requireAuth, updateMe);

usersRouter.get("/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 2) return res.json({ users: [] });

  const users = await UserModel.find({
    name: { $regex: query, $options: "i" },
  })
    .select("name avatar")
    .sort({ name: 1 })
    .limit(5)
    .lean();

  return res.json({
    users: users.map((user) => ({
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
    })),
  });
});

usersRouter.post(
  "/me/avatar",
  requireAuth,
  imageUpload.single("avatar"),
  async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Missing uploaded image" });

    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.avatar = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    await user.save();

    return res.json({ user: toPublicUser(user) });
  },
);

usersRouter.post("/me/bookmarks/:postId", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const [user, post] = await Promise.all([
    UserModel.findById(req.user.id),
    PostModel.findOne({
      _id: req.params.postId,
      status: { $in: ["approved", "published"] },
    }).select("_id"),
  ]);

  if (!user) return res.status(404).json({ error: "User not found" });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isBookmarked = user.bookmarks.some(
    (id) => id.toString() === req.params.postId,
  );

  if (isBookmarked) {
    user.bookmarks = user.bookmarks.filter(
      (id) => id.toString() !== req.params.postId,
    );
  } else {
    user.bookmarks.push(req.params.postId);
  }

  await user.save();

  return res.json({ bookmarked: !isBookmarked });
});

usersRouter.get("/me/bookmarks", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user.id)
    .select("bookmarks")
    .populate({
      path: "bookmarks",
      match: { status: { $in: ["approved", "published"] } },
      select: "title type content author coAuthors coverImage likes createdAt status",
      populate: [
        { path: "author", select: "name avatar" },
        { path: "coAuthors", select: "name avatar" },
      ],
      options: { sort: { createdAt: -1 } },
    });

  if (!user) return res.status(404).json({ error: "User not found" });

  const bookmarks = (user.bookmarks ?? [])
    .filter(Boolean)
    .map((post) => post.toObject({ virtuals: true }));

  return res.json({ bookmarks });
});

usersRouter.post("/me/follow-tag", requireAuth, async (req, res) => {
  const tag = sanitizeTag(req.body.tag);
  if (!tag) return res.status(400).json({ error: "Missing tag" });

  const user = await UserModel.findById(req.user.id).select("followedTags");
  if (!user) return res.status(404).json({ error: "User not found" });

  const followedTags = (user.followedTags ?? []).map(sanitizeTag).filter(Boolean);
  const isFollowing = followedTags.includes(tag);

  user.followedTags = isFollowing
    ? followedTags.filter((item) => item !== tag)
    : [...new Set([...followedTags, tag])];

  await user.save();

  return res.json({
    following: !isFollowing,
    followedTags: user.followedTags,
  });
});

usersRouter.get("/me/followed-tags", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user.id).select("followedTags").lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({ followedTags: user.followedTags ?? [] });
});

usersRouter.get("/me/login-activity", requireAuth, async (req, res) => {
  const activity = await LoginActivityModel.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return res.json({ activity });
});

usersRouter.get("/me/export-data", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [profile, posts, comments, messages, notifications, kudos] =
    await Promise.all([
      UserModel.findById(userId).select("-password -refreshToken -twoFactorSecret -twoFactorRecoveryCodes").lean(),
      PostModel.find({ author: userId }).lean(),
      CommentModel.find({ author: userId }).lean(),
      MessageModel.find({ $or: [{ from: userId }, { to: userId }] }).lean(),
      NotificationModel.find({ recipient: userId }).lean(),
      KudosModel.find({ $or: [{ from: userId }, { to: userId }] }).lean(),
    ]);

  const exportData = {
    exportedAt: new Date(),
    profile,
    posts,
    comments,
    messages,
    notifications,
    readingHistory: [],
    bookmarks: profile?.bookmarks ?? [],
    kudos,
  };

  res.set("Content-Type", "application/json");
  res.set("Content-Disposition", 'attachment; filename="my-hiddencase-data.json"');
  return res.json(exportData);
});

usersRouter.post("/me/request-deletion", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.password) {
    const ok = await bcrypt.compare(String(req.body.password ?? ""), user.password);
    if (!ok) return res.status(401).json({ error: "Invalid password" });
  }

  user.deletionRequestedAt = new Date();
  user.deletionScheduledFor = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await user.save();
  return res.json({
    message: `Account deletion scheduled for ${user.deletionScheduledFor.toISOString()}. You have 14 days to cancel.`,
    deletionScheduledFor: user.deletionScheduledFor,
  });
});

usersRouter.post("/me/cancel-deletion", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.deletionRequestedAt = null;
  user.deletionScheduledFor = null;
  await user.save();
  return res.json({ message: "Account deletion cancelled." });
});

usersRouter.post("/:id/follow", requireAuth, async (req, res) => {
  const currentUserId = String(req.user.id);
  const targetUserId = String(req.params.id);

  if (currentUserId === targetUserId) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  const [currentUser, targetUser] = await Promise.all([
    UserModel.findById(currentUserId),
    UserModel.findById(targetUserId),
  ]);

  if (!currentUser || !targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const isFollowing = targetUser.followers.some(
    (id) => id.toString() === currentUserId,
  );

  if (isFollowing) {
    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== currentUserId,
    );
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserId,
    );
  } else {
    targetUser.followers.push(currentUserId);
    currentUser.following.push(targetUserId);
  }

  await Promise.all([targetUser.save(), currentUser.save()]);

  if (!isFollowing) {
    await createNotification({
      recipient: targetUser._id,
      type: "follow",
      actor: currentUser._id,
    });
    void awardXP(targetUser._id, "follower_gained").catch(() => {});
    void checkBadges(targetUser._id).catch(() => {});
    void progressQuest(currentUser._id, "follow").catch(() => {});
    void trackAction(currentUser._id, req.ip, "follow").catch(() => {});
  }

  return res.json({
    following: !isFollowing,
    followersCount: targetUser.followers.length,
  });
});

function mapConnectionUser(user) {
  const effectiveRole = getEffectiveRole(user);
  const mappedUser = {
    id: user._id.toString(),
    _id: user._id,
    name: user.name,
    avatar: user.avatar,
    bio: user.bio,
  };
  if (effectiveRole === "admin") mappedUser.role = "admin";
  return mappedUser;
}

async function getUserConnections(req, res, field) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = await UserModel.findById(req.params.id)
    .select(field)
    .populate({
      path: field,
      select: "name avatar role bio",
      options: { sort: { name: 1 } },
    })
    .lean();

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({
    users: (user[field] ?? []).filter(Boolean).map(mapConnectionUser),
  });
}

usersRouter.get("/:id/followers", async (req, res) =>
  getUserConnections(req, res, "followers"),
);

usersRouter.get("/:id/following", async (req, res) =>
  getUserConnections(req, res, "following"),
);

usersRouter.get("/:id/posts", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "User not found" });
  }

  const posts = await PostModel.find({
    author: req.params.id,
    status: { $in: ["approved", "published"] },
  })
    .populate("author", "name avatar")
    .populate("coAuthors", "name avatar")
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  return res.json({ posts });
});

usersRouter.get("/:id", optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = await UserModel.findById(req.params.id)
    .select("name bio avatar role createdAt followers following leaderboardBadge monthlyScore currentStreak longestStreak lastWrittenAt badges xp level")
    .lean();

  if (!user) return res.status(404).json({ error: "User not found" });

  const postsCount = await PostModel.countDocuments({
    author: req.params.id,
    status: { $in: ["approved", "published"] },
  });

  const followers = user.followers ?? [];
  const following = user.following ?? [];

  const effectiveRole = getEffectiveRole(user);
  const publicUser = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      createdAt: user.createdAt,
      followersCount: followers.length,
      followingCount: following.length,
      isFollowing: followers.some((id) => id.toString() === req.user?.id),
      leaderboardBadge: user.leaderboardBadge,
      monthlyScore: user.monthlyScore ?? 0,
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      lastWrittenAt: user.lastWrittenAt,
      badges: user.badges ?? [],
      xp: user.xp ?? 0,
      level: user.level ?? "Apprentice",
    };
  if (effectiveRole === "admin") publicUser.role = "admin";

  return res.json({
    user: publicUser,
    postsCount,
  });
});

usersRouter.delete("/:id", (_req, res) =>
  res.status(501).json({ error: "Not implemented" }),
);
