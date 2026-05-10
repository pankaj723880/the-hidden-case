import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { KudosModel } from "../models/Kudos.js";
import { PostModel } from "../models/Post.js";

export const kudosRouter = Router();

kudosRouter.post("/posts/:postId/kudos", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = await PostModel.findById(req.params.postId).select("author status");
  if (!post || !["approved", "published"].includes(post.status)) {
    return res.status(404).json({ error: "Post not found" });
  }
  if (String(post.author) === String(req.user.id)) {
    return res.status(400).json({ error: "You cannot leave kudos on your own post" });
  }

  const message = String(req.body.message ?? "").trim();
  if (!message) return res.status(400).json({ error: "Kudos message is required" });
  if (message.length > 80) {
    return res.status(400).json({ error: "Kudos must be 80 characters or less" });
  }

  const existing = await KudosModel.findOne({
    post: post._id,
    from: req.user.id,
  }).select("_id");
  if (existing) return res.status(400).json({ error: "Already left kudos" });

  const kudos = await KudosModel.create({
    post: post._id,
    from: req.user.id,
    message,
  });

  const populated = await KudosModel.findById(kudos._id)
    .populate("from", "name avatar")
    .lean();

  return res.status(201).json({ kudos: populated });
});

kudosRouter.get("/posts/:postId/kudos", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const kudos = await KudosModel.find({ post: req.params.postId })
    .populate("from", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ kudos });
});

kudosRouter.get("/my-kudos", requireAuth, async (req, res) => {
  const posts = await PostModel.find({ author: req.user.id }).select("_id");
  const postIds = posts.map((post) => post._id);

  const kudos = await KudosModel.find({ post: { $in: postIds } })
    .populate("post", "title")
    .populate("from", "name avatar")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.json({ kudos });
});
