import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/isAdmin.js";
import { ChallengeModel } from "../models/Challenge.js";
import { PostModel } from "../models/Post.js";

export const challengesRouter = Router();

function toStatus(value) {
  return ["upcoming", "active", "voting", "ended"].includes(value)
    ? value
    : null;
}

function publicChallenge(challenge) {
  return {
    ...challenge,
    entryCount: challenge.entries?.length ?? 0,
  };
}

function entryWithVotes(entry, challenge, userId) {
  const postId = String(entry._id);
  const votes = challenge.votes ?? [];
  return {
    ...entry,
    challengeVotesCount: votes.filter((vote) => String(vote.post) === postId).length,
    hasVoted:
      Boolean(userId) &&
      votes.some(
        (vote) => String(vote.post) === postId && String(vote.user) === String(userId),
      ),
  };
}

challengesRouter.get("/", async (_req, res) => {
  const challenges = await ChallengeModel.find({})
    .populate("createdBy", "name")
    .sort({ startDate: -1 })
    .lean();

  return res.json({
    challenges: challenges.map(publicChallenge),
  });
});

challengesRouter.get("/:id", optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  const challenge = await ChallengeModel.findById(req.params.id)
    .populate("createdBy", "name")
    .populate({
      path: "entries",
      select: "title type content author coAuthors coverImage likes createdAt status challenge tags",
      populate: [
        { path: "author", select: "name avatar" },
        { path: "coAuthors", select: "name avatar" },
      ],
    })
    .lean({ virtuals: true });

  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const entries = (challenge.entries ?? []).map((entry) =>
    entryWithVotes(entry, challenge, req.user?.id),
  );

  return res.json({
    challenge: publicChallenge({ ...challenge, entries }),
  });
});

challengesRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { title, description, prompt, startDate, endDate } = req.body;

  if (!title?.trim() || !description?.trim() || !prompt?.trim()) {
    return res.status(400).json({ error: "Title, description, and prompt are required" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: "Choose a valid start and end date" });
  }

  const challenge = await ChallengeModel.create({
    title: title.trim(),
    description: description.trim(),
    prompt: prompt.trim(),
    startDate: start,
    endDate: end,
    status: toStatus(req.body.status) ?? "upcoming",
    createdBy: req.user._id,
  });

  return res.status(201).json({ challenge });
});

challengesRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const challenge = await ChallengeModel.findById(req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const { title, description, prompt, startDate, endDate } = req.body;
  if (typeof title === "string" && title.trim()) challenge.title = title.trim();
  if (typeof description === "string" && description.trim()) {
    challenge.description = description.trim();
  }
  if (typeof prompt === "string" && prompt.trim()) challenge.prompt = prompt.trim();
  if (startDate) challenge.startDate = new Date(startDate);
  if (endDate) challenge.endDate = new Date(endDate);

  const status = toStatus(req.body.status);
  if (status) challenge.status = status;

  await challenge.save();
  return res.json({ challenge });
});

challengesRouter.post("/:id/enter", requireAuth, async (req, res) => {
  const { postId } = req.body;
  const challenge = await ChallengeModel.findById(req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (challenge.status !== "active") {
    return res.status(400).json({ error: "This challenge is not accepting entries" });
  }

  const post = await PostModel.findOne({
    _id: postId,
    author: req.user.id,
    status: { $in: ["approved", "published"] },
  });
  if (!post) return res.status(404).json({ error: "Approved post not found" });

  const alreadyEntered = challenge.entries.some((id) => String(id) === String(post._id));
  if (!alreadyEntered) challenge.entries.push(post._id);

  const challengeTag = `challenge:${challenge._id}`;
  if (!post.tags.includes(challengeTag)) post.tags.push(challengeTag);
  post.challenge = challenge._id;

  await Promise.all([challenge.save(), post.save()]);

  const updated = await ChallengeModel.findById(challenge._id)
    .populate("createdBy", "name")
    .populate({
      path: "entries",
      select: "title type content author coAuthors coverImage likes createdAt status challenge tags",
      populate: [
        { path: "author", select: "name avatar" },
        { path: "coAuthors", select: "name avatar" },
      ],
    })
    .lean({ virtuals: true });

  return res.json({ challenge: publicChallenge(updated) });
});

challengesRouter.post("/:id/vote/:postId", requireAuth, async (req, res) => {
  const challenge = await ChallengeModel.findById(req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (challenge.status !== "voting") {
    return res.status(400).json({ error: "Voting is not open for this challenge" });
  }

  const postId = String(req.params.postId);
  if (!challenge.entries.some((id) => String(id) === postId)) {
    return res.status(404).json({ error: "Entry not found" });
  }

  const userId = String(req.user.id);
  const existingVote = challenge.votes.find((vote) => String(vote.user) === userId);
  let hasVoted = true;

  if (existingVote && String(existingVote.post) === postId) {
    challenge.votes = challenge.votes.filter((vote) => String(vote.user) !== userId);
    hasVoted = false;
  } else if (existingVote) {
    existingVote.post = postId;
  } else {
    challenge.votes.push({ user: req.user.id, post: postId });
  }

  await challenge.save();

  const voteCount = challenge.votes.filter((vote) => String(vote.post) === postId).length;
  return res.json({ voteCount, hasVoted });
});
