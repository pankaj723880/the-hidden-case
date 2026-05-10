import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { ContinuationModel } from "../models/Continuation.js";
import { PostModel } from "../models/Post.js";

export const continuationsRouter = Router();

function excerpt(content) {
  const text = String(content ?? "").replace(/<[^>]+>/g, "").trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

async function ensureOriginalAuthor(continuation, userId) {
  await continuation.populate("originalPost", "title author");
  return String(continuation.originalPost?.author) === String(userId);
}

continuationsRouter.get("/posts/:postId/continuations", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const continuations = await ContinuationModel.find({
    originalPost: req.params.postId,
    status: "approved",
  })
    .populate("author", "name avatar")
    .sort({ type: 1, createdAt: 1 })
    .lean();

  continuations.sort((a, b) => {
    if (a.type !== b.type) return a.type === "official" ? -1 : 1;
    return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
  });

  return res.json({
    continuations: continuations.map((item) => ({
      ...item,
      excerpt: excerpt(item.content),
    })),
  });
});

continuationsRouter.post("/posts/:postId/continuations", requireAuth, async (req, res) => {
  const post = await PostModel.findOne({
    _id: req.params.postId,
    type: "story",
    status: { $in: ["approved", "published"] },
  }).select("title author");

  if (!post) return res.status(404).json({ error: "Story not found" });
  if (String(post.author) === String(req.user.id)) {
    return res.status(400).json({ error: "You cannot continue your own story" });
  }

  const title = String(req.body.title ?? "").trim();
  const content = String(req.body.content ?? "").trim();
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const continuation = await ContinuationModel.create({
    originalPost: post._id,
    author: req.user.id,
    title,
    content,
  });

  return res.status(201).json({ continuation });
});

continuationsRouter.get("/my-continuations", requireAuth, async (req, res) => {
  const originals = await PostModel.find({ author: req.user.id }).select("_id");
  const originalIds = originals.map((post) => post._id);

  const continuations = await ContinuationModel.find({
    originalPost: { $in: originalIds },
    status: "pending",
  })
    .populate("author", "name avatar")
    .populate("originalPost", "title")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    continuations: continuations.map((item) => ({
      ...item,
      excerpt: excerpt(item.content),
    })),
  });
});

continuationsRouter.patch("/continuations/:id/approve", requireAuth, async (req, res) => {
  const continuation = await ContinuationModel.findById(req.params.id);
  if (!continuation) return res.status(404).json({ error: "Continuation not found" });

  if (!(await ensureOriginalAuthor(continuation, req.user.id))) {
    return res.status(403).json({ error: "Only the original author can approve this" });
  }

  continuation.status = "approved";
  continuation.type = "official";
  await continuation.save();

  const updated = await ContinuationModel.findById(continuation._id)
    .populate("author", "name avatar")
    .populate("originalPost", "title")
    .lean();

  return res.json({ continuation: updated });
});

continuationsRouter.patch("/continuations/:id/reject", requireAuth, async (req, res) => {
  const continuation = await ContinuationModel.findById(req.params.id);
  if (!continuation) return res.status(404).json({ error: "Continuation not found" });

  if (!(await ensureOriginalAuthor(continuation, req.user.id))) {
    return res.status(403).json({ error: "Only the original author can reject this" });
  }

  continuation.status = "rejected";
  await continuation.save();

  return res.json({ continuation });
});

continuationsRouter.delete("/continuations/:id", requireAuth, async (req, res) => {
  const continuation = await ContinuationModel.findById(req.params.id);
  if (!continuation) return res.status(404).json({ error: "Continuation not found" });

  const isAuthor = String(continuation.author) === String(req.user.id);
  const isAdmin = req.user.role === "admin";
  if (!isAuthor && !isAdmin) return res.status(403).json({ error: "Not allowed" });

  await continuation.deleteOne();
  return res.json({ ok: true });
});
