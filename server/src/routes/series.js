import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { SeriesModel } from "../models/Series.js";
import { PostModel } from "../models/Post.js";

export const seriesRouter = Router();

function isOwner(series, userId) {
  return series.author?.toString() === userId;
}

function sortSeriesPosts(posts) {
  return [...(posts ?? [])].sort((a, b) => {
    const orderA = Number.isFinite(a.seriesOrder) ? a.seriesOrder : 999999;
    const orderB = Number.isFinite(b.seriesOrder) ? b.seriesOrder : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
  });
}

seriesRouter.get("/", async (_req, res) => {
  const series = await SeriesModel.find()
    .populate("author", "name")
    .sort({ updatedAt: -1 })
    .lean();

  return res.json({
    series: series.map((item) => ({
      ...item,
      postCount: item.posts?.length ?? 0,
    })),
  });
});

seriesRouter.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Series not found" });
  }

  const series = await SeriesModel.findById(req.params.id)
    .populate("author", "name avatar")
    .populate({
      path: "posts",
      match: { status: { $in: ["approved", "published"] } },
      select: "title author createdAt status seriesOrder coverImage type readTime",
      populate: { path: "author", select: "name avatar" },
    })
    .lean({ virtuals: true });

  if (!series) return res.status(404).json({ error: "Series not found" });

  return res.json({
    series: {
      ...series,
      posts: sortSeriesPosts(series.posts),
      postCount: series.posts?.length ?? 0,
    },
  });
});

seriesRouter.post("/", requireAuth, async (req, res) => {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const description =
    typeof req.body.description === "string" ? req.body.description.trim() : "";
  const coverImage =
    typeof req.body.coverImage === "string" ? req.body.coverImage.trim() : "";

  if (!title) return res.status(400).json({ error: "Title is required" });

  const series = await SeriesModel.create({
    title,
    description,
    coverImage,
    author: req.user.id,
  });

  return res.status(201).json({ series });
});

seriesRouter.put("/:id", requireAuth, async (req, res) => {
  const series = await SeriesModel.findById(req.params.id);
  if (!series) return res.status(404).json({ error: "Series not found" });
  if (!isOwner(series, req.user.id)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  if (typeof req.body.title === "string" && req.body.title.trim()) {
    series.title = req.body.title.trim();
  }
  if (typeof req.body.description === "string") {
    series.description = req.body.description.trim();
  }

  await series.save();
  return res.json({ series });
});

seriesRouter.post("/:id/posts", requireAuth, async (req, res) => {
  const { postId } = req.body;
  const order = Number(req.body.order);

  if (!mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  const [series, post] = await Promise.all([
    SeriesModel.findById(req.params.id),
    PostModel.findById(postId),
  ]);

  if (!series) return res.status(404).json({ error: "Series not found" });
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (!isOwner(series, req.user.id) || post.author?.toString() !== req.user.id) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const hasPost = series.posts.some((id) => id.toString() === postId);
  if (!hasPost) series.posts.push(postId);

  await SeriesModel.updateMany(
    { _id: { $ne: series._id }, posts: post._id },
    { $pull: { posts: post._id } },
  );

  post.series = series._id;
  post.seriesOrder = Number.isFinite(order) ? order : series.posts.length;

  await Promise.all([series.save(), post.save()]);
  return res.json({ series, post });
});

seriesRouter.delete("/:id/posts/:postId", requireAuth, async (req, res) => {
  const [series, post] = await Promise.all([
    SeriesModel.findById(req.params.id),
    PostModel.findById(req.params.postId),
  ]);

  if (!series) return res.status(404).json({ error: "Series not found" });
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (!isOwner(series, req.user.id) || post.author?.toString() !== req.user.id) {
    return res.status(403).json({ error: "Not allowed" });
  }

  series.posts = series.posts.filter(
    (id) => id.toString() !== req.params.postId,
  );
  post.series = null;
  post.seriesOrder = null;

  await Promise.all([series.save(), post.save()]);
  return res.json({ ok: true });
});

seriesRouter.delete("/:id", requireAuth, async (req, res) => {
  const series = await SeriesModel.findById(req.params.id);
  if (!series) return res.status(404).json({ error: "Series not found" });
  if (!isOwner(series, req.user.id)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  await PostModel.updateMany(
    { series: series._id },
    { $set: { series: null, seriesOrder: null } },
  );
  await series.deleteOne();

  return res.json({ ok: true });
});
