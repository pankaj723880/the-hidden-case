import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { QAModel } from "../models/QA.js";
import { UserModel } from "../models/User.js";

export const qaRouter = Router();

qaRouter.get("/users/:authorId/qa", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.authorId)) {
    return res.status(404).json({ error: "Author not found" });
  }

  const items = await QAModel.find({
    author: req.params.authorId,
    isAnswered: true,
    isPublic: true,
  })
    .populate("askedBy", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ items });
});

qaRouter.post("/users/:authorId/qa", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.authorId)) {
    return res.status(404).json({ error: "Author not found" });
  }
  if (String(req.params.authorId) === String(req.user.id)) {
    return res.status(400).json({ error: "You cannot ask yourself a question" });
  }

  const author = await UserModel.findById(req.params.authorId).select("_id");
  if (!author) return res.status(404).json({ error: "Author not found" });

  const question = String(req.body.question ?? "").trim();
  if (!question) return res.status(400).json({ error: "Question is required" });
  if (question.length > 300) {
    return res.status(400).json({ error: "Question must be 300 characters or less" });
  }

  const item = await QAModel.create({
    author: author._id,
    askedBy: req.user.id,
    question,
  });

  return res.status(201).json({ item });
});

qaRouter.get("/my-questions", requireAuth, async (req, res) => {
  const items = await QAModel.find({
    author: req.user.id,
    isAnswered: false,
  })
    .populate("askedBy", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ items });
});

qaRouter.put("/qa/:id/answer", requireAuth, async (req, res) => {
  const item = await QAModel.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Question not found" });
  if (String(item.author) !== String(req.user.id)) {
    return res.status(403).json({ error: "Only the author can answer this question" });
  }

  const answer = String(req.body.answer ?? "").trim();
  if (!answer) return res.status(400).json({ error: "Answer is required" });
  if (answer.length > 1000) {
    return res.status(400).json({ error: "Answer must be 1000 characters or less" });
  }

  item.answer = answer;
  item.isAnswered = true;
  item.isPublic = Boolean(req.body.isPublic);
  await item.save();

  const populated = await QAModel.findById(item._id)
    .populate("askedBy", "name avatar")
    .lean();

  return res.json({ item: populated });
});

qaRouter.delete("/qa/:id", requireAuth, async (req, res) => {
  const item = await QAModel.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Question not found" });

  const isAuthor = String(item.author) === String(req.user.id);
  const isAdmin = req.user.role === "admin";
  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: "Not allowed" });
  }

  await item.deleteOne();
  return res.json({ ok: true });
});
