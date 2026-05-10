import { Router } from "express";
import mongoose from "mongoose";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { PollModel } from "../models/Poll.js";
import { PostModel } from "../models/Post.js";

export const pollsRouter = Router();

function serializePoll(poll, userId) {
  const options = poll.options ?? [];
  const userIdString = userId ? String(userId) : "";
  const totalVotes = options.reduce(
    (sum, option) => sum + (option.votes?.length ?? 0),
    0,
  );
  const userVoted = Boolean(
    userIdString &&
      options.some((option) =>
        (option.votes ?? []).some((vote) => String(vote) === userIdString),
      ),
  );

  return {
    _id: poll._id,
    question: poll.question,
    options: options.map((option) => ({
      text: option.text,
      count: option.votes?.length ?? 0,
      votedByMe: Boolean(
        userIdString &&
          (option.votes ?? []).some((vote) => String(vote) === userIdString),
      ),
    })),
    totalVotes,
    userVoted,
  };
}

function cleanOptions(options) {
  return (Array.isArray(options) ? options : [])
    .map((option) => String(option ?? "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

async function requireOwnedPost(postId, userId) {
  if (!mongoose.isValidObjectId(postId)) return null;
  const post = await PostModel.findById(postId).select("author");
  if (!post) return null;
  if (String(post.author) !== String(userId)) {
    const error = new Error("Only the post author can manage its poll");
    error.statusCode = 403;
    throw error;
  }
  return post;
}

pollsRouter.post("/posts/:postId/poll", requireAuth, async (req, res) => {
  const question = String(req.body.question ?? "").trim();
  const optionTexts = cleanOptions(req.body.options);

  if (!question) return res.status(400).json({ error: "Poll question is required" });
  if (question.length > 200) {
    return res.status(400).json({ error: "Poll question must be 200 characters or less" });
  }
  if (optionTexts.length < 2) {
    return res.status(400).json({ error: "Add at least two poll options" });
  }

  let post = null;
  try {
    post = await requireOwnedPost(req.params.postId, req.user.id);
  } catch (error) {
    return res.status(error.statusCode ?? 400).json({ error: error.message });
  }
  if (!post) return res.status(404).json({ error: "Post not found" });

  const poll = await PollModel.findOneAndUpdate(
    { post: post._id },
    {
      post: post._id,
      question,
      options: optionTexts.map((text) => ({ text, votes: [] })),
      createdBy: req.user.id,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return res.status(201).json({ poll: { _id: poll._id } });
});

pollsRouter.get("/posts/:postId/poll", optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const poll = await PollModel.findOne({ post: req.params.postId }).lean();
  return res.json({ poll: poll ? serializePoll(poll, req.user?.id) : null });
});

pollsRouter.get("/polls/:pollId", optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.pollId)) {
    return res.status(404).json({ error: "Poll not found" });
  }

  const poll = await PollModel.findById(req.params.pollId).lean();
  if (!poll) return res.status(404).json({ error: "Poll not found" });

  return res.json({ poll: serializePoll(poll, req.user?.id) });
});

pollsRouter.post("/polls/:pollId/vote", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.pollId)) {
    return res.status(404).json({ error: "Poll not found" });
  }

  const optionIndex = Number(req.body.optionIndex);
  const poll = await PollModel.findById(req.params.pollId);
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
    return res.status(400).json({ error: "Invalid poll option" });
  }

  const hasVoted = poll.options.some((option) =>
    (option.votes ?? []).some((vote) => String(vote) === String(req.user.id)),
  );
  if (hasVoted) return res.status(400).json({ error: "You already voted in this poll" });

  poll.options[optionIndex].votes.push(req.user.id);
  await poll.save();

  return res.json({ poll: serializePoll(poll.toObject(), req.user.id) });
});
