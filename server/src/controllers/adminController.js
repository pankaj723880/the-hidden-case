import { getAllPosts, setPostStatus } from "./postController.js";
import { UserModel } from "../models/User.js";
import { PostModel } from "../models/Post.js";
import { CommentModel } from "../models/Comment.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { PlagiarismReportModel } from "../models/PlagiarismReport.js";
import { SuspiciousActivityModel } from "../models/SuspiciousActivity.js";
import { logAction } from "../utils/audit.js";
import { getCache, setCache } from "../utils/cache.js";

export async function getAllPostsForAdmin(req, res) {
  return getAllPosts(req, res);
}

export async function patchPostStatus(req, res) {
  return setPostStatus(req, res);
}

export async function toggleFeaturedPost(req, res) {
  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (!post.featured) {
    const featuredCount = await PostModel.countDocuments({ featured: true });
    if (featuredCount >= 3) {
      return res.status(400).json({
        error: "Only 3 posts can be featured at once. Unfeature another post first.",
      });
    }

    post.featured = true;
    post.featuredAt = new Date();
  } else {
    post.featured = false;
    post.featuredAt = null;
  }

  await post.save();
  const updatedPost = await PostModel.findById(post._id)
    .populate("author", "name email role avatar bio followers following")
    .lean({ virtuals: true });

  recordAdminEvent(
    post.featured ? "Post featured" : "Post unfeatured",
    "admin",
    { postId: post._id, postTitle: post.title },
  );
  await logAction({
    admin: req.user._id,
    action: post.featured ? "Post featured" : "Post unfeatured",
    targetType: "post",
    targetId: post._id,
    targetName: post.title,
    ip: req.ip,
  });

  return res.json({ post: updatedPost });
}

export async function getAllUsers(_req, res) {
  const users = await UserModel.find({})
    .select("-password -refreshToken")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ users });
}

export async function deleteUser(req, res) {
  const userId = req.params.id;

  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Delete user's posts and comments
  await PostModel.deleteMany({ author: userId });
  await CommentModel.deleteMany({ author: userId });

  // Delete the user
  await UserModel.deleteOne({ _id: userId });

  await logAction({
    admin: req.user._id,
    action: "User banned",
    targetType: "user",
    targetId: user._id,
    targetName: user.name,
    details: user.email,
    ip: req.ip,
  });

  return res.json({ ok: true });
}

export async function getAuditLog(req, res) {
  const page = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit ?? "50", 10) || 50);
  const filter = {};

  if (typeof req.query.action === "string" && req.query.action.trim()) {
    filter.action = req.query.action.trim();
  }
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) {
      const fromDate = new Date(req.query.dateFrom);
      if (!Number.isNaN(fromDate.getTime())) filter.createdAt.$gte = fromDate;
    }
    if (req.query.dateTo) {
      const toDate = new Date(req.query.dateTo);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  const [logs, total] = await Promise.all([
    AuditLogModel.find(filter)
      .populate("admin", "name avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  return res.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function getPlagiarismReports(_req, res) {
  const reports = await PlagiarismReportModel.find({ status: "flagged" })
    .populate({
      path: "post",
      select: "title author status",
      populate: { path: "author", select: "name email" },
    })
    .populate("matchedPost", "title")
    .sort({ checkedAt: -1 })
    .lean();

  return res.json({ reports });
}

export async function updatePlagiarismReport(req, res) {
  const status =
    req.body.status === "cleared" || req.body.status === "dismissed"
      ? req.body.status
      : null;
  if (!status) {
    return res.status(400).json({ error: "Status must be cleared or dismissed" });
  }

  const report = await PlagiarismReportModel.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true },
  ).populate("post", "title");
  if (!report) return res.status(404).json({ error: "Report not found" });

  await logAction({
    admin: req.user._id,
    action: status === "cleared" ? "Plagiarism report cleared" : "Plagiarism report dismissed",
    targetType: "post",
    targetId: report.post?._id,
    targetName: report.post?.title,
    details: `Similarity score: ${report.similarityScore}%`,
    ip: req.ip,
  });

  return res.json({ report });
}

export async function getSuspiciousActivity(_req, res) {
  const activities = await SuspiciousActivityModel.find({})
    .populate("user", "name email")
    .sort({ detectedAt: -1 })
    .lean();
  return res.json({ activities });
}

export async function updateSuspiciousActivity(req, res) {
  const status =
    req.body.status === "reviewed" || req.body.status === "dismissed"
      ? req.body.status
      : null;
  if (!status) return res.status(400).json({ error: "Status must be reviewed or dismissed" });

  const activity = await SuspiciousActivityModel.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true },
  ).populate("user", "name email");
  if (!activity) return res.status(404).json({ error: "Activity not found" });

  return res.json({ activity });
}

export async function getAnalytics(_req, res) {
  const cached = await getCache("analytics:summary");
  if (cached) return res.json(cached);

  const totalUsers = await UserModel.countDocuments();
  const totalPosts = await PostModel.countDocuments();
  const approvedPosts = await PostModel.countDocuments({
    status: { $in: ["approved", "published"] },
  });
  const pendingPosts = await PostModel.countDocuments({ status: "pending" });
  const rejectedPosts = await PostModel.countDocuments({ status: "rejected" });
  const totalComments = await CommentModel.countDocuments();

  // Recent posts
  const recentPosts = await PostModel.find({})
    .populate("author", "name email")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Recent comments
  const recentComments = await CommentModel.find({})
    .populate("author", "name email")
    .populate("post", "title")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const payload = {
    totalUsers,
    totalPosts,
    approvedPosts,
    pendingPosts,
    rejectedPosts,
    totalComments,
    recentPosts,
    recentComments,
  };
  await setCache("analytics:summary", payload, 60);
  return res.json(payload);
}

// Admin events log (simple in-memory event tracking)
// In production, you'd store these in a dedicated Events collection
const eventLog = [];

export function recordAdminEvent(type, user, details) {
  const event = { type, user, time: new Date(), details };
  eventLog.push(event);
  // Keep only last 100 events in memory
  if (eventLog.length > 100) eventLog.shift();
}

export async function getEvents(_req, res) {
  return res.json({ events: eventLog.slice().reverse() });
}
