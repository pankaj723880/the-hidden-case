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

function publicChallenge(challenge, { includeEntrySummaries = false } = {}) {
  const entries = challenge.entries ?? [];
  const entrySummaries = includeEntrySummaries
    ? entries
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          _id: entry._id,
          title: entry.title,
          type: entry.type,
          status: entry.status,
          createdAt: entry.createdAt,
          author: entry.author,
        }))
    : undefined;

  return {
    ...challenge,
    entryCount: entries.length,
    ...(includeEntrySummaries ? { entrySummaries } : {}),
  };
}

async function populatedChallenge(id, { includeEntries = true } = {}) {
  let query = ChallengeModel.findById(id)
    .populate("createdBy", "name")
    .populate({
      path: "winner.post",
      select: "title type content coverImage tags author status createdAt likes",
      populate: { path: "author", select: "name avatar" },
    })
    .populate("winner.author", "name avatar");

  if (includeEntries) {
    query = query.populate({
      path: "entries",
      select: "title type content author coAuthors coverImage likes createdAt status challenge tags",
      populate: [
        { path: "author", select: "name avatar" },
        { path: "coAuthors", select: "name avatar" },
      ],
    });
  }

  return query.lean({ virtuals: true });
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

challengesRouter.get("/", optionalAuth, async (req, res) => {
  const isAdmin = req.user?.role === "admin";
  let query = ChallengeModel.find({})
    .populate("createdBy", "name")
    .sort({ startDate: -1 });

  if (isAdmin) {
    query = query.populate({
      path: "entries",
      select: "title type author status createdAt challenge",
      populate: { path: "author", select: "name avatar" },
    });
  }

  query = query
    .populate({
      path: "winner.post",
      select: "title type author status createdAt coverImage",
      populate: { path: "author", select: "name avatar" },
    })
    .populate("winner.author", "name avatar");

  const challenges = await query.lean();

  return res.json({
    challenges: challenges.map((challenge) =>
      publicChallenge(challenge, { includeEntrySummaries: isAdmin }),
    ),
  });
});

challengesRouter.get("/winners", async (_req, res) => {
  const challenges = await ChallengeModel.find({ "winner.post": { $ne: null } })
    .populate("createdBy", "name")
    .populate({
      path: "winner.post",
      select: "title type content coverImage tags author status createdAt likes",
      populate: { path: "author", select: "name avatar" },
    })
    .populate("winner.author", "name avatar")
    .sort({ "winner.selectedAt": -1 })
    .limit(6)
    .lean({ virtuals: true });

  return res.json({
    winners: challenges
      .filter((challenge) => challenge.winner?.post)
      .map((challenge) => publicChallenge(challenge)),
  });
});

challengesRouter.get("/:id", optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  const challenge = await populatedChallenge(req.params.id);

  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const isAdmin = req.user?.role === "admin";
  const entries = (challenge.entries ?? [])
    .filter((entry) => {
      const status = String(entry?.status ?? "").toLowerCase();
      const authorId = String(entry?.author?._id ?? entry?.author ?? "");
      return (
        ["approved", "published"].includes(status) ||
        isAdmin ||
        (req.user?.id && authorId === String(req.user.id))
      );
    })
    .map((entry) => entryWithVotes(entry, challenge, req.user?.id));

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

challengesRouter.patch("/:id/winner", requireAuth, requireAdmin, async (req, res) => {
  const { postId } = req.body;
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ error: "Invalid challenge or post" });
  }

  const challenge = await ChallengeModel.findById(req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const isEntry = challenge.entries.some((entryId) => String(entryId) === String(postId));
  if (!isEntry) return res.status(404).json({ error: "Entry not found in this challenge" });

  const post = await PostModel.findById(postId).select("author status");
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (!["approved", "published"].includes(post.status)) {
    return res
      .status(400)
      .json({ error: "Approve the story before announcing it as the winner" });
  }

  challenge.winner = {
    post: post._id,
    author: post.author,
    selectedAt: new Date(),
  };
  challenge.status = "ended";
  await challenge.save();

  const updated = await populatedChallenge(challenge._id);
  return res.json({ challenge: publicChallenge(updated) });
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

challengesRouter.post("/:id/enter-new", requireAuth, async (req, res) => {
  const challenge = await ChallengeModel.findById(req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (challenge.status !== "active") {
    return res.status(400).json({ error: "This challenge is not accepting entries" });
  }

  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (!title || !content) {
    return res.status(400).json({ error: "Title and story body are required" });
  }

  const challengeTag = `challenge:${challenge._id}`;
  const tags = Array.isArray(req.body.tags)
    ? req.body.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim())
    : [];
  if (!tags.includes(challengeTag)) tags.push(challengeTag);

  const post = await PostModel.create({
    title,
    type: "story",
    content,
    coverImage: typeof req.body.coverImage === "string" ? req.body.coverImage.trim() : "",
    tags,
    author: req.user.id,
    challenge: challenge._id,
    status: "pending",
    language:
      typeof req.body.language === "string" && /^[a-z]{2}$/i.test(req.body.language.trim())
        ? req.body.language.trim().toLowerCase()
        : "en",
  });

  challenge.entries.push(post._id);
  await challenge.save();

  const updated = await populatedChallenge(challenge._id);
  return res.status(201).json({
    post,
    challenge: publicChallenge(updated),
    message: "Challenge story sent to admin review.",
  });
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
