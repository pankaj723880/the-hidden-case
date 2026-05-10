import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { PostModel } from "../models/Post.js";
import { ReadDepthModel } from "../models/ReadDepth.js";
import { PostViewModel } from "../models/PostView.js";

export const analyticsRouter = Router();

async function assertPostOwner(postId, userId) {
  if (!mongoose.isValidObjectId(postId)) return null;
  const post = await PostModel.findById(postId).select("author");
  if (!post || String(post.author) !== String(userId)) return null;
  return post;
}

analyticsRouter.get("/posts/:postId/heatmap", requireAuth, async (req, res) => {
  const post = await assertPostOwner(req.params.postId, req.user.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const rows = await ReadDepthModel.find({ post: req.params.postId })
    .select("depth sessionId")
    .lean();
  const totalReaders = new Set(rows.map((row) => row.sessionId)).size;
  const buckets = Array.from({ length: 10 }, (_, index) => {
    const min = index * 10;
    const max = min + 10;
    const reached = new Set(
      rows.filter((row) => row.depth >= min).map((row) => row.sessionId),
    ).size;
    return {
      range: `${min}-${max}`,
      percent: totalReaders ? Math.round((reached / totalReaders) * 100) : 0,
    };
  });

  return res.json({ totalReaders, buckets });
});

analyticsRouter.get("/posts/:postId/traffic", requireAuth, async (req, res) => {
  const post = await assertPostOwner(req.params.postId, req.user.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const rows = await PostViewModel.aggregate([
    { $match: { post: new mongoose.Types.ObjectId(req.params.postId) } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const sources = rows.map((row) => ({
    source: row._id,
    count: row.count,
    percent: total ? Math.round((row.count / total) * 100) : 0,
  }));

  return res.json({ sources, total });
});
