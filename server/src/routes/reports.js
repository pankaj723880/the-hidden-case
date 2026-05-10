import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/isAdmin.js";
import { ReportModel } from "../models/Report.js";
import { PostModel } from "../models/Post.js";
import { CommentModel } from "../models/Comment.js";
import { MessageModel } from "../models/Message.js";
import { logAction } from "../utils/audit.js";

export const reportsRouter = Router();

const allowedReasons = [
  "spam",
  "inappropriate",
  "harassment",
  "misinformation",
  "other",
];

reportsRouter.post("/", requireAuth, async (req, res) => {
  const { contentType, contentId, reason } = req.body;
  const description =
    typeof req.body.description === "string"
      ? req.body.description.trim().slice(0, 500)
      : "";

  if (!["post", "comment", "message"].includes(contentType)) {
    return res.status(400).json({ error: "Invalid content type" });
  }
  if (!mongoose.isValidObjectId(contentId)) {
    return res.status(400).json({ error: "Invalid content id" });
  }
  if (!allowedReasons.includes(reason)) {
    return res.status(400).json({ error: "Invalid reason" });
  }

  const existing = await ReportModel.findOne({
    reporter: req.user.id,
    contentId,
  }).lean();

  if (existing) return res.status(400).json({ error: "Already reported" });

  try {
    await ReportModel.create({
      reporter: req.user.id,
      contentType,
      contentId,
      reason,
      description,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ error: "Already reported" });
    }
    throw err;
  }

  return res.status(201).json({ message: "Report submitted" });
});

reportsRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const reports = await ReportModel.find({})
    .populate("reporter", "name")
    .sort({ createdAt: -1 })
    .lean();

  const postIds = reports
    .filter((report) => report.contentType === "post")
    .map((report) => report.contentId);
  const commentIds = reports
    .filter((report) => report.contentType === "comment")
    .map((report) => report.contentId);
  const messageIds = reports
    .filter((report) => report.contentType === "message")
    .map((report) => report.contentId);

  const [posts, comments, messages] = await Promise.all([
    PostModel.find({ _id: { $in: postIds } }).select("title").lean(),
    CommentModel.find({ _id: { $in: commentIds } })
      .select("text post")
      .lean(),
    MessageModel.find({ _id: { $in: messageIds } })
      .select("text sender recipient deleted")
      .populate("sender", "name")
      .populate("recipient", "name")
      .lean(),
  ]);

  const postsById = new Map(posts.map((post) => [post._id.toString(), post]));
  const commentsById = new Map(
    comments.map((comment) => [comment._id.toString(), comment]),
  );
  const messagesById = new Map(
    messages.map((message) => [message._id.toString(), message]),
  );

  return res.json({
    reports: reports.map((report) => {
      const content =
        report.contentType === "post"
          ? postsById.get(report.contentId.toString())
          : report.contentType === "comment"
            ? commentsById.get(report.contentId.toString())
            : messagesById.get(report.contentId.toString());

      return {
        ...report,
        content,
        targetPostId:
          report.contentType === "post"
            ? report.contentId
            : content?.post ?? null,
      };
    }),
  });
});

reportsRouter.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Report not found" });
  }
  if (!["reviewed", "dismissed"].includes(req.body.status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const report = await ReportModel.findByIdAndUpdate(
    req.params.id,
    { $set: { status: req.body.status } },
    { new: true },
  )
    .populate("reporter", "name")
    .lean();

  if (!report) return res.status(404).json({ error: "Report not found" });

  if (req.body.status === "dismissed") {
    await logAction({
      admin: req.user._id,
      action: "Report dismissed",
      targetType: "report",
      targetId: report._id,
      targetName: `${report.contentType} report`,
      details: report.reason,
      ip: req.ip,
    });
  }

  return res.json({ report });
});
