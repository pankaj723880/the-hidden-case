import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { PostModel } from "../models/Post.js";
import { RevisionModel } from "../models/Revision.js";
import { createPostRevision } from "../utils/revisions.js";

export const revisionsRouter = Router();

async function findOwnedPost(req, res, { ownerOnly = false } = {}) {
  if (!mongoose.isValidObjectId(req.params.postId)) {
    res.status(404).json({ error: "Post not found" });
    return null;
  }

  const post = await PostModel.findById(req.params.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return null;
  }

  const isOwner = post.author?.toString() === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && (!isAdmin || ownerOnly)) {
    res.status(403).json({ error: "Not allowed" });
    return null;
  }

  return post;
}

revisionsRouter.get("/posts/:postId/revisions", requireAuth, async (req, res) => {
  const post = await findOwnedPost(req, res);
  if (!post) return;

  const revisions = await RevisionModel.find({ post: post._id })
    .select("_id versionNumber savedAt")
    .sort({ savedAt: -1 })
    .lean();

  return res.json({ revisions });
});

revisionsRouter.get(
  "/posts/:postId/revisions/:revisionId",
  requireAuth,
  async (req, res) => {
    const post = await findOwnedPost(req, res);
    if (!post) return;

    const revision = await RevisionModel.findOne({
      _id: req.params.revisionId,
      post: post._id,
    }).lean();

    if (!revision) return res.status(404).json({ error: "Revision not found" });

    return res.json({ revision });
  },
);

revisionsRouter.post(
  "/posts/:postId/revisions/:revisionId/restore",
  requireAuth,
  async (req, res) => {
    const post = await findOwnedPost(req, res, { ownerOnly: true });
    if (!post) return;

    const revision = await RevisionModel.findOne({
      _id: req.params.revisionId,
      post: post._id,
    });

    if (!revision) return res.status(404).json({ error: "Revision not found" });

    await createPostRevision(post);

    post.title = revision.title;
    post.content = revision.content;
    await post.save();

    return res.json({ post });
  },
);
