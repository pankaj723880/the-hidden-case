import { PostModel } from "../models/Post.js";
import { env } from "../config/env.js";
import mongoose from "mongoose";
import { createPostRevision } from "../utils/revisions.js";
import { createNotification, parseMentions } from "../utils/notify.js";
import { logAction } from "../utils/audit.js";
import { UserModel } from "../models/User.js";
import { getIo } from "../socketState.js";
import { GroupModel } from "../models/Group.js";
import { updateStreak } from "../utils/streak.js";
import { CritiqueModel } from "../models/Critique.js";
import { generateCritique } from "../utils/generateCritique.js";
import { suggestTags } from "../utils/suggestTags.js";
import { PlagiarismReportModel } from "../models/PlagiarismReport.js";
import { checkPlagiarism } from "../utils/plagiarismCheck.js";
import { generateCoverArt } from "../utils/generateCoverArt.js";
import { detectMood } from "../utils/detectMood.js";
import { generateText } from "../utils/aiClient.js";
import { checkBadges } from "../utils/checkBadges.js";
import { awardXP } from "../utils/xp.js";
import { progressQuest } from "../utils/quests.js";
import { deleteCache, deleteCachePattern, getCache, setCache } from "../utils/cache.js";
import { trackAction } from "../utils/suspicion.js";
import { ReadDepthModel } from "../models/ReadDepth.js";
import { PostViewModel } from "../models/PostView.js";
import { uploadBufferToCloudinary } from "../middleware/upload.js";

const nextReadReasonCache = new Map();
const NEXT_READ_REASON_TTL_MS = 60 * 60 * 1000;

const critiqueGenerationInFlight = new Set();

function queueCritiqueGeneration(post) {
  const postId = String(post?._id ?? "");
  if (!postId || critiqueGenerationInFlight.has(postId)) return;

  critiqueGenerationInFlight.add(postId);
  void generateCritique(post)
    .then(async (critiqueData) => {
      if (!critiqueData) return;
      await CritiqueModel.findOneAndUpdate(
        { post: post._id },
        {
          post: post._id,
          author: post.author?._id ?? post.author,
          ...critiqueData,
          generatedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    })
    .catch((error) => {
      console.error("Failed to generate critique", error);
    })
    .finally(() => {
      critiqueGenerationInFlight.delete(postId);
    });
}

function queuePlagiarismCheck(post) {
  const postId = String(post?._id ?? "");
  if (!postId) return;

  void checkPlagiarism(post.content, post._id)
    .then(async (result) => {
      await PostModel.findByIdAndUpdate(post._id, {
        plagiarismCheck: {
          similarityScore: result?.similarityScore ?? 0,
          matchedPost: result?.matchedPostId ?? null,
          matchedPostTitle: result?.matchedPostTitle ?? "",
          isFlagged: Boolean(result?.isFlagged),
          checkedAt: new Date(),
        },
      });
      if (!result?.isFlagged) return;
      await PlagiarismReportModel.findOneAndUpdate(
        { post: post._id, status: "flagged" },
        {
          post: post._id,
          similarityScore: result.similarityScore,
          matchedPost: result.matchedPostId,
          matchedPostTitle: result.matchedPostTitle,
          status: "flagged",
          checkedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    })
    .catch((error) => {
      console.error("Failed to queue plagiarism report", error);
    });
}

async function runPlagiarismReview(post) {
  const result = await checkPlagiarism(post.content, post._id);
  const plagiarismCheck = {
    similarityScore: result?.similarityScore ?? 0,
    matchedPost: result?.matchedPostId ?? null,
    matchedPostTitle: result?.matchedPostTitle ?? "",
    isFlagged: Boolean(result?.isFlagged),
    checkedAt: new Date(),
  };

  post.plagiarismCheck = plagiarismCheck;
  await post.save();

  if (plagiarismCheck.isFlagged) {
    await PlagiarismReportModel.findOneAndUpdate(
      { post: post._id, status: "flagged" },
      {
        post: post._id,
        similarityScore: plagiarismCheck.similarityScore,
        matchedPost: plagiarismCheck.matchedPost,
        matchedPostTitle: plagiarismCheck.matchedPostTitle,
        status: "flagged",
        checkedAt: plagiarismCheck.checkedAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  return plagiarismCheck;
}

function queueMoodDetection(post) {
  const postId = String(post?._id ?? "");
  if (!postId) return;

  void detectMood(post.title, post.content)
    .then(async (mood) => {
      if (!mood) return;
      await PostModel.findByIdAndUpdate(post._id, { mood });
    })
    .catch(() => {});
}

function cacheNextReadReason(key, reason) {
  if (!key || !reason) return;
  nextReadReasonCache.set(key, {
    reason,
    expiresAt: Date.now() + NEXT_READ_REASON_TTL_MS,
  });
}

function readCachedNextReadReason(key) {
  const cached = nextReadReasonCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    nextReadReasonCache.delete(key);
    return null;
  }
  return cached.reason;
}

function queueNextReadReason({ userId, currentPost, recommendedPost }) {
  if (!userId || !currentPost?._id || !recommendedPost?._id) return;
  const key = `${userId}:${currentPost._id}`;
  if (readCachedNextReadReason(key)) return;

  const prompt = `In one short sentence (max 15 words), explain why someone who just read "${currentPost.title}" would enjoy "${recommendedPost.title}". Be specific about themes or mood. No filler phrases like "you might enjoy".`;
  void generateText(prompt, 50)
    .then((text) => {
      const reason = String(text ?? "").replace(/^["']|["']$/g, "").trim();
      if (reason) cacheNextReadReason(key, reason.slice(0, 160));
    })
    .catch(() => {});
}

function toPostType(v) {
  return v === "story" || v === "blog" ? v : null;
}

function toPostStatus(v) {
  return v === "draft" ||
    v === "pending" ||
    v === "approved" ||
    v === "scheduled" ||
    v === "published" ||
    v === "rejected"
    ? v
    : null;
}

function cleanOptionalUrl(v) {
  if (typeof v !== "string") return "";
  return v.trim();
}

function cleanLanguage(value) {
  return typeof value === "string" && /^[a-z]{2}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : "en";
}

function classifySource(referrer) {
  if (!referrer) return "direct";
  if (/google|bing|yahoo|duckduckgo/i.test(referrer)) return "search";
  if (/twitter|x\.com|facebook|instagram|whatsapp|linkedin/i.test(referrer)) return "social";
  if (env.CLIENT_URL && referrer.includes(env.CLIENT_URL)) return "internal";
  return "unknown";
}

const ALLOWED_CONTENT_WARNINGS = [
  "Violence",
  "Mature themes",
  "Strong language",
  "Psychological horror",
  "Grief and loss",
  "Substance use",
];

function cleanContentWarnings(value) {
  if (!Array.isArray(value)) return [];

  const warnings = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  const invalid = warnings.find(
    (warning) => !ALLOWED_CONTENT_WARNINGS.includes(warning),
  );
  if (invalid) {
    const error = new Error(`Invalid content warning: ${invalid}`);
    error.statusCode = 400;
    throw error;
  }

  return [...new Set(warnings)];
}

function cleanChapters(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((chapter) => ({
      title: typeof chapter?.title === "string" ? chapter.title.trim() : "",
      content: typeof chapter?.content === "string" ? chapter.content : "",
    }))
    .filter((chapter) => chapter.title || chapter.content.trim());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPostCoAuthor(post, userId) {
  return (post.coAuthors ?? []).some((id) => String(id?._id ?? id) === String(userId));
}

async function resolvePostGroup(groupId, userId) {
  if (!groupId) return null;
  if (!mongoose.isValidObjectId(groupId)) {
    const error = new Error("Group not found");
    error.statusCode = 404;
    throw error;
  }

  const group = await GroupModel.findById(groupId).select("members");
  if (!group) {
    const error = new Error("Group not found");
    error.statusCode = 404;
    throw error;
  }
  if (!(group.members ?? []).some((id) => String(id) === String(userId))) {
    const error = new Error("You must be a group member to post there");
    error.statusCode = 403;
    throw error;
  }

  return group._id;
}

import { isMongoConnected } from "../db/mongoose.js";

export async function getApprovedPosts(req, res) {
  const cacheKey = `posts:${JSON.stringify(req.query ?? {})}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const page = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit ?? "9", 10) || 9);
  const type = toPostType(req.query.type);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const tag = typeof req.query.tag === "string" ? req.query.tag.trim() : "";
  const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
  const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";
  const sort = typeof req.query.sort === "string" ? req.query.sort.trim() : "newest";
  const mood = typeof req.query.mood === "string" ? req.query.mood.trim() : "";
  const language = typeof req.query.language === "string" ? req.query.language.trim() : "";
  const filter = { status: { $in: ["approved", "published"] } };

  if (type) filter.type = type;
  if (tag) filter.tags = { $in: [tag] };
  if (mood) filter.mood = mood;
  if (language) filter.language = cleanLanguage(language);
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (!Number.isNaN(fromDate.getTime())) filter.createdAt.$gte = fromDate;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ];
  }

  if (!isMongoConnected()) {
    return res.json({
      posts: [],
      totalPosts: 0,
      currentPage: page,
      totalPages: 0,
      hasMore: false,
    });
  }

  const totalPosts = await PostModel.countDocuments(filter);
  const totalPages = Math.ceil(totalPosts / limit);
  let posts = [];

  if (sort === "most-liked") {
    const allPosts = await PostModel.find(filter)
      .populate("author", "name email role avatar bio followers following")
      .populate("coAuthors", "name avatar")
      .lean({ virtuals: true });
    posts = allPosts
      .sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0))
      .slice((page - 1) * limit, page * limit);
  } else {
    const sortBy =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "most-viewed"
          ? { views: -1, createdAt: -1 }
          : { createdAt: -1 };

    posts = await PostModel.find(filter)
      .populate("author", "name email role avatar bio followers following")
      .populate("coAuthors", "name avatar")
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean({ virtuals: true });
  }

  posts = posts.map((post) => {
    if (post.titleTest?.variantB && !post.titleTest?.winner && Math.random() > 0.5) {
      return { ...post, title: post.titleTest.variantB, _titleVariant: "B" };
    }
    return post.titleTest?.variantB && !post.titleTest?.winner
      ? { ...post, _titleVariant: "A" }
      : post;
  });

  const payload = {
    posts,
    totalPosts,
    currentPage: Number(page),
    totalPages,
    hasMore: Number(page) < totalPages,
  };
  await setCache(cacheKey, payload, 120);
  return res.json(payload);
}

export async function suggestPostTags(req, res) {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve([]), 8000);
  });
  const suggestions = await Promise.race([
    suggestTags(req.body.title, req.body.content, req.body.type),
    timeout,
  ]);

  return res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
}

export async function getPersonalizedFeed(req, res) {
  const page = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit ?? "9", 10) || 9);

  if (!isMongoConnected()) {
    return res.json({
      posts: [],
      totalPosts: 0,
      currentPage: page,
      totalPages: 0,
      hasMore: false,
    });
  }

  const user = await UserModel.findById(req.user.id)
    .select("following followedTags")
    .lean();

  if (!user) return res.status(404).json({ error: "User not found" });

  const following = (user.following ?? []).map((id) => id.toString());
  const followedTags = (user.followedTags ?? [])
    .map((tag) => String(tag ?? "").trim().replace(/^#+/, "").toLowerCase())
    .filter(Boolean);

  const sourceFilters = [];
  if (following.length > 0) sourceFilters.push({ author: { $in: following } });
  if (followedTags.length > 0) {
    sourceFilters.push({
      tags: { $in: followedTags.map((tag) => new RegExp(`^${escapeRegExp(tag)}$`, "i")) },
    });
  }

  const filter =
    sourceFilters.length > 0
      ? {
          status: { $in: ["approved", "published"] },
          $or: sourceFilters,
        }
      : {
          status: { $in: ["approved", "published"] },
        };

  const totalPosts = await PostModel.countDocuments(filter);
  const totalPages = Math.ceil(totalPosts / limit);
  const posts = await PostModel.find(filter)
    .populate("author", "name avatar")
    .populate("coAuthors", "name avatar")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean({ virtuals: true });

  return res.json({
    posts,
    totalPosts,
    currentPage: Number(page),
    totalPages,
    hasMore: Number(page) < totalPages,
  });
}

export async function getTrendingPosts(_req, res) {
  const cached = await getCache("posts:trending");
  if (cached) return res.json(cached);
  if (!isMongoConnected()) return res.json({ posts: [] });

  const posts = await PostModel.find({
    status: { $in: ["approved", "published"] },
  })
    .populate("author", "name avatar")
    .populate("coAuthors", "name avatar")
    .sort({ weeklyScore: -1, createdAt: -1 })
    .limit(6)
    .lean({ virtuals: true });

  const payload = { posts };
  await setCache("posts:trending", payload, 300);
  return res.json(payload);
}

export async function getFeaturedPosts(_req, res) {
  if (!isMongoConnected()) return res.json({ posts: [] });

  const posts = await PostModel.find({
    featured: true,
    status: { $in: ["approved", "published"] },
  })
    .populate("author", "name avatar")
    .populate("coAuthors", "name avatar")
    .sort({ featuredAt: -1 })
    .limit(3)
    .lean({ virtuals: true });

  return res.json({ posts });
}

export async function getMyPosts(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });
  if (!isMongoConnected()) return res.json({ posts: [] });

  const posts = await PostModel.find({ author: user.id })
    .select("+adminReviewComment +adminReviewedAt +adminReviewedBy")
    .populate("author", "name email role avatar bio followers following")
    .populate("coAuthors", "name avatar")
    .populate("coAuthorInvites.user", "name email avatar")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ posts });
}

export async function getDraftPosts(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });
  if (!isMongoConnected()) return res.json({ posts: [] });

  const posts = await PostModel.find({ author: user.id, status: "draft" })
    .sort({ updatedAt: -1 })
    .lean({ virtuals: true });

  return res.json({ posts });
}

export async function getPostById(req, res) {
  const postId = req.params.id;

  if (!isMongoConnected())
    return res.status(404).json({ error: "Post not found" });

  const post = await PostModel.findById(postId)
    .populate("author", "name email role avatar bio followers following")
    .populate("coAuthors", "name avatar")
    .populate("coAuthorInvites.user", "name email avatar")
    .populate({
      path: "series",
      select: "title description author posts",
      populate: [
        { path: "author", select: "name avatar" },
        {
          path: "posts",
          match: { status: { $in: ["approved", "published"] } },
          select: "title seriesOrder createdAt status",
        },
      ],
    })
    .lean({ virtuals: true });

  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.series?.posts) {
    post.series.posts = [...post.series.posts].sort((a, b) => {
      const orderA = Number.isFinite(a.seriesOrder) ? a.seriesOrder : 999999;
      const orderB = Number.isFinite(b.seriesOrder) ? b.seriesOrder : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
    });
  }

  if (["approved", "published"].includes(post.status)) {
    if (req.user?.id) void progressQuest(req.user.id, "read_posts").catch(() => {});
    return res.json({ post });
  }

  const isOwner = post.author?._id?.toString() === req.user?.id;
  const isCoAuthor = isPostCoAuthor(post, req.user?.id);
  const isAdmin = req.user?.role === "admin";
  if (!isOwner && !isCoAuthor && !isAdmin) {
    return res.status(404).json({ error: "Post not found" });
  }

  return res.json({ post });
}

export async function getRelatedPosts(req, res) {
  const postId = req.params.id;

  if (!isMongoConnected()) return res.json({ posts: [] });
  if (!mongoose.isValidObjectId(postId)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const currentPost = await PostModel.findById(postId)
    .select("tags author")
    .lean();

  if (!currentPost) return res.status(404).json({ error: "Post not found" });

  const publicFilter = { status: { $in: ["approved", "published"] } };
  const selectedIds = new Set([String(postId)]);

  const populateAuthor = (query) =>
    query.populate("author", "name avatar").populate("coAuthors", "name avatar");

  const collectPosts = async (query) => {
    const posts = await populateAuthor(query).lean({ virtuals: true });
    for (const post of posts) selectedIds.add(String(post._id));
    return posts;
  };

  let relatedPosts = [];

  if ((currentPost.tags ?? []).length > 0) {
    relatedPosts = await collectPosts(
      PostModel.find({
        ...publicFilter,
        _id: { $ne: postId },
        tags: { $in: currentPost.tags },
      })
        .sort({ createdAt: -1 })
        .limit(3),
    );
  }

  if (relatedPosts.length < 3 && currentPost.author) {
    const authorPosts = await collectPosts(
      PostModel.find({
        ...publicFilter,
        _id: { $nin: [...selectedIds] },
        author: currentPost.author,
      })
        .sort({ createdAt: -1 })
        .limit(3 - relatedPosts.length),
    );
    relatedPosts = [...relatedPosts, ...authorPosts];
  }

  if (relatedPosts.length < 3) {
    const latestPosts = await collectPosts(
      PostModel.find({
        ...publicFilter,
        _id: { $nin: [...selectedIds] },
      })
        .sort({ createdAt: -1 })
        .limit(3 - relatedPosts.length),
    );
    relatedPosts = [...relatedPosts, ...latestPosts];
  }

  return res.json({ posts: relatedPosts.slice(0, 3) });
}

export async function getNextRead(req, res) {
  const postId = req.params.id;
  if (!isMongoConnected()) return res.json({ post: null });
  if (!mongoose.isValidObjectId(postId)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const currentPost = await PostModel.findById(postId)
    .select("title tags author")
    .lean();
  if (!currentPost) return res.status(404).json({ error: "Post not found" });

  const publicFilter = {
    _id: { $ne: postId },
    status: { $in: ["approved", "published"] },
  };
  const populatePost = (query) =>
    query
      .populate("author", "name avatar")
      .populate("coAuthors", "name avatar")
      .lean({ virtuals: true });
  let recommendedPost = null;
  let userProfile = null;
  let unreadFilter = {};

  if (req.user?.id) {
    userProfile = await UserModel.findById(req.user.id)
      .select("following followedTags")
      .lean();
    const likedPosts = await PostModel.find({ likes: req.user.id }).select("_id").lean();
    const excluded = [postId, ...likedPosts.map((post) => String(post._id))];
    unreadFilter = { _id: { $nin: excluded } };
    const followedTags = userProfile?.followedTags ?? [];

    if ((currentPost.tags ?? []).length > 0 && followedTags.length > 0) {
      recommendedPost = await populatePost(
        PostModel.findOne({
          ...publicFilter,
          ...unreadFilter,
          tags: {
            $in: currentPost.tags.filter((tag) =>
              followedTags.some(
                (followedTag) => String(followedTag).toLowerCase() === String(tag).toLowerCase(),
              ),
            ),
          },
        }).sort({ weeklyScore: -1, createdAt: -1 }),
      );
    }

    if (!recommendedPost && (userProfile?.following ?? []).length > 0) {
      recommendedPost = await populatePost(
        PostModel.findOne({
          ...publicFilter,
          ...unreadFilter,
          author: { $in: userProfile.following },
        }).sort({ createdAt: -1 }),
      );
    }
  }

  if (!recommendedPost && (currentPost.tags ?? []).length > 0) {
    recommendedPost = await populatePost(
      PostModel.findOne({
        ...publicFilter,
        ...unreadFilter,
        tags: { $in: currentPost.tags },
      }).sort({ weeklyScore: -1, createdAt: -1 }),
    );
  }

  if (!recommendedPost) {
    recommendedPost = await populatePost(
      PostModel.findOne({ ...publicFilter, ...unreadFilter }).sort({
        weeklyScore: -1,
        createdAt: -1,
      }),
    );
  }

  if (req.user?.id && recommendedPost) {
    queueNextReadReason({
      userId: req.user.id,
      currentPost,
      recommendedPost,
    });
  }

  return res.json({ post: recommendedPost ?? null });
}

export async function getNextReadReason(req, res) {
  const userId = req.query.userId || req.user?.id;
  if (!userId) return res.json({ reason: null });
  const reason = readCachedNextReadReason(`${userId}:${req.params.id}`);
  return res.json({ reason });
}

export async function createPendingPost(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });
  if (!isMongoConnected())
    return res.status(503).json({ error: "Mongo not connected" });

  const { title, type, content, tags, coverImage, videoUrl } = req.body;
  const requestedStatus = toPostStatus(req.body.status);
  let nextStatus = requestedStatus ?? "draft";
  if (user.role !== "admin" && !["draft", "pending"].includes(nextStatus)) {
    nextStatus = "draft";
  }

  if (nextStatus !== "draft" && (!title || typeof title !== "string")) {
    return res.status(400).json({ error: "Missing/invalid title" });
  }
  const postType = toPostType(type);
  if (!postType) return res.status(400).json({ error: "Missing/invalid type" });

  const chaptersArr = cleanChapters(req.body.chapters);
  const hasChapters = Boolean(req.body.hasChapters || chaptersArr.length > 0);
  const compatibleContent = hasChapters
    ? chaptersArr[0]?.content ?? ""
    : typeof content === "string"
      ? content
      : "";

  if (nextStatus !== "draft" && !compatibleContent.trim()) {
    return res.status(400).json({ error: "Missing/invalid content" });
  }
  if (nextStatus !== "draft" && hasChapters && chaptersArr.length === 0) {
    return res.status(400).json({ error: "Add at least one chapter" });
  }

  const tagsArr = Array.isArray(tags)
    ? tags.filter((t) => typeof t === "string")
    : [];
  let contentWarnings = [];
  try {
    contentWarnings = cleanContentWarnings(req.body.contentWarnings);
  } catch (error) {
    return res.status(error.statusCode ?? 400).json({ error: error.message });
  }

  let group = null;
  try {
    group = await resolvePostGroup(req.body.groupId, user.id);
  } catch (error) {
    return res.status(error.statusCode ?? 400).json({ error: error.message });
  }

  const post = await PostModel.create({
    title: typeof title === "string" && title.trim() ? title.trim() : "Untitled draft",
    type: postType,
    content: compatibleContent,
    chapters: hasChapters ? chaptersArr : [],
    hasChapters,
    coverImage: cleanOptionalUrl(coverImage),
    videoUrl: cleanOptionalUrl(videoUrl),
    tags: tagsArr,
    contentWarnings,
    language: cleanLanguage(req.body.language),
    author: user.id,
    group,
    status: nextStatus,
    scheduledAt:
      req.body.scheduledAt && nextStatus === "pending"
        ? new Date(req.body.scheduledAt)
        : null,
  });
  await parseMentions(post.content, user.id, post._id);
  void updateStreak(user.id)
    .then(() => checkBadges(user.id))
    .catch((error) => {
      console.error("Failed to update writing streak", error);
    });

  return res.status(201).json({ post });
}

export async function uploadPostMedia(req, res) {
  if (!requireCloudinaryConfigured()) {
    return res.status(501).json({ error: "Cloudinary upload not configured" });
  }

  const files = req.files ?? {};
  const image = files.image?.[0];
  const video = files.video?.[0];
  let coverImage = "";
  let videoUrl = "";

  if (image) {
    const uploadResult = await uploadBufferToCloudinary(image.buffer, {
      folder: "hidden-case-covers",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    });
    coverImage = uploadResult?.secure_url ?? "";
  }

  if (video) {
    const uploadResult = await uploadBufferToCloudinary(video.buffer, {
      folder: "hidden-case-videos",
      resource_type: "video",
      allowed_formats: ["mp4", "webm", "mov"],
    });
    videoUrl = uploadResult?.secure_url ?? "";
  }

  return res.json({
    coverImage,
    videoUrl,
  });
}

export async function generatePostCover(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (String(post.author) !== String(user.id)) {
    return res.status(403).json({ error: "Only the original author can generate a cover" });
  }
  if (!post.title?.trim()) {
    return res.status(400).json({ error: "Add a title before generating cover art" });
  }

  try {
    const coverImage = await generateCoverArt(post.title, post.content, post.type);
    post.coverImage = coverImage;
    await post.save();
    void deleteCachePattern("posts:*").catch(() => {});
    return res.json({ coverImage });
  } catch (error) {
    console.error("Cover art generation failed:", error.message);
    return res.status(500).json({
      error: error.message || "Cover art generation failed",
    });
  }
}

export async function updatePost(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const postId = req.params.id;
  const post = await PostModel.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isOwner = post.author?.toString() === user.id;
  const isCoAuthor = isPostCoAuthor(post, user.id);
  const isAdmin = user.role === "admin";
  if (!isOwner && !isCoAuthor && !isAdmin)
    return res.status(403).json({ error: "Not allowed" });

  await createPostRevision(post);

  const { title, content, tags, type, coverImage, videoUrl, scheduledAt } = req.body;

  if (typeof title === "string" && title.trim()) post.title = title.trim();
  if (req.body.chapters !== undefined || req.body.hasChapters !== undefined) {
    const chaptersArr = cleanChapters(req.body.chapters);
    const hasChapters = Boolean(req.body.hasChapters || chaptersArr.length > 0);
    post.hasChapters = hasChapters;
    post.chapters = hasChapters ? chaptersArr : [];
    if (hasChapters) {
      post.content = chaptersArr[0]?.content ?? "";
    } else if (typeof content === "string") {
      post.content = content;
    }
  } else if (typeof content === "string") {
    post.content = content;
  }
  if (typeof coverImage === "string") post.coverImage = cleanOptionalUrl(coverImage);
  if (typeof videoUrl === "string") post.videoUrl = cleanOptionalUrl(videoUrl);
  if (req.body.language !== undefined) post.language = cleanLanguage(req.body.language);
  if (scheduledAt) {
    post.scheduledAt = new Date(scheduledAt);
  } else if (scheduledAt === null || scheduledAt === "") {
    post.scheduledAt = null;
  }

  const nextType = toPostType(type);
  if (nextType) post.type = nextType;

  if (Array.isArray(tags)) {
    post.tags = tags.filter((t) => typeof t === "string");
  }
  if (req.body.contentWarnings !== undefined) {
    try {
      post.contentWarnings = cleanContentWarnings(req.body.contentWarnings);
    } catch (error) {
      return res.status(error.statusCode ?? 400).json({ error: error.message });
    }
  }

  if (req.body.groupId !== undefined) {
    try {
      post.group = await resolvePostGroup(req.body.groupId, user.id);
    } catch (error) {
      return res.status(error.statusCode ?? 400).json({ error: error.message });
    }
  }

  const requestedStatus = toPostStatus(req.body.status);
  if (requestedStatus) {
    if (isAdmin || ["draft", "pending"].includes(requestedStatus)) {
      post.status = requestedStatus;
    }
  } else if (!isAdmin && post.status !== "draft") {
    post.status = "pending";
  }

  await post.save();
  void deleteCachePattern("posts:*").catch(() => {});
  void deleteCache("tags:all").catch(() => {});
  void updateStreak(user.id)
    .then(() => checkBadges(user.id))
    .catch((error) => {
      console.error("Failed to update writing streak", error);
    });

  return res.json({ post });
}

export async function submitPost(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isOwner = post.author?.toString() === user.id;
  const isCoAuthor = isPostCoAuthor(post, user.id);
  if (!isOwner && !isCoAuthor) return res.status(403).json({ error: "Not allowed" });

  if (!post.title?.trim() || !post.content?.trim()) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  if (req.body.scheduledAt) {
    const scheduledAt = new Date(req.body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return res
        .status(400)
        .json({ error: "scheduledAt must be a future date" });
    }
    post.scheduledAt = scheduledAt;
  }

  post.status = "pending";
  await post.save();
  void deleteCachePattern("posts:*").catch(() => {});
  void updateStreak(user.id)
    .then(() => checkBadges(user.id))
    .catch((error) => {
      console.error("Failed to update writing streak", error);
    });
  queueCritiqueGeneration(post);
  queuePlagiarismCheck(post);

  return res.json({ post });
}

export async function getPostCritique(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const post = await PostModel.findById(req.params.id)
    .select("author title type content")
    .populate("author", "name");
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (String(post.author?._id ?? post.author) !== String(user.id)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const critique = await CritiqueModel.findOne({ post: post._id }).lean();
  if (!critique) {
    queueCritiqueGeneration(post);
    return res.status(404).json({
      error: "Critique not yet generated. Try again in a moment.",
    });
  }

  return res.json({ critique });
}

export async function deletePost(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const postId = req.params.id;
  const post = await PostModel.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isOwner = post.author?.toString() === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin)
    return res.status(403).json({ error: "Not allowed" });

  await post.deleteOne();
  void deleteCachePattern("posts:*").catch(() => {});
  void deleteCache("tags:all").catch(() => {});

  if (isAdmin) {
    await logAction({
      admin: user._id,
      action: "Post deleted",
      targetType: "post",
      targetId: post._id,
      targetName: post.title,
      ip: req.ip,
    });
  }

  return res.json({ ok: true });
}

export async function toggleLike(req, res) {
  if (!isMongoConnected())
    return res.status(503).json({ error: "Mongo not connected" });

  const postId = req.params.id;
  const user = req.user;

  if (!user) return res.status(401).json({ error: "Missing auth" });

  const post = await PostModel.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const userId = user.id;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const hasLiked = post.likes.some((id) => id.toString() === userId);
  if (hasLiked) {
    post.likes = post.likes.filter((id) => id.toString() !== userId);
  } else {
    post.likes.push(userObjectId);
    await createNotification({
      recipient: post.author,
      type: "like",
      actor: user.id,
      post: post._id,
    });
    void awardXP(post.author, "like_received").catch(() => {});
    void checkBadges(post.author).catch(() => {});
    void trackAction(user.id, req.ip, "like").catch(() => {});
  }

  await post.save();
  void deleteCachePattern("posts:*").catch(() => {});

  const likesCount = post.likes.length;

  const { getIo } = await import("../socketState.js");
  const io = getIo();
  if (io) {
    io.emit("post_liked", { postId, likesCount });
  }

  return res.json({ likesCount });
}

export async function uploadCover(req, res) {
  if (!requireCloudinaryConfigured()) {
    return res.status(501).json({ error: "Cloudinary upload not configured" });
  }

  const postId = req.params.id;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "Missing uploaded file" });

  const uploadResult = await uploadBufferToCloudinary(file.buffer, {
    folder: "hidden-case",
    allowed_formats: ["jpg", "png", "webp"],
  });
  const secureUrl = uploadResult?.secure_url ?? "";
  if (!secureUrl)
    return res.status(500).json({ error: "Cloudinary did not return a URL" });

  const post = await PostModel.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  // Ownership/admin checks are pending; for now allow authenticated user to set cover.
  post.coverImage = secureUrl;
  await post.save();
  void deleteCachePattern("posts:*").catch(() => {});

  return res.json({ coverImage: post.coverImage });
}

export async function uploadInlineImage(req, res) {
  if (!requireCloudinaryConfigured()) {
    return res.status(501).json({ error: "Cloudinary upload not configured" });
  }

  const file = req.file;
  if (!file) return res.status(400).json({ error: "Missing uploaded image" });

  const uploadResult = await uploadBufferToCloudinary(file.buffer, {
    folder: "hidden-case-inline",
    allowed_formats: ["jpg", "png", "webp"],
  });
  const url = uploadResult?.secure_url ?? "";
  if (!url) {
    return res.status(500).json({ error: "Cloudinary did not return a URL" });
  }

  return res.json({ url });
}

export async function trackReadDepth(req, res) {
  const depth = Number(req.body.depth);
  const sessionId = String(req.body.sessionId ?? "").slice(0, 120);
  if (!Number.isFinite(depth) || depth < 0 || depth > 100) {
    return res.status(400).json({ error: "Depth must be between 0 and 100" });
  }

  await ReadDepthModel.findOneAndUpdate(
    { post: req.params.id, sessionId },
    { $max: { depth: Math.round(depth) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return res.status(204).send();
}

export async function trackPostSource(req, res) {
  const referrer = String(req.body.referrer ?? req.get("referer") ?? "").slice(0, 500);
  const source = classifySource(referrer);
  await PostViewModel.create({
    post: req.params.id,
    referrer,
    source,
    sessionId: String(req.body.sessionId ?? "").slice(0, 120),
  });
  await PostModel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
  return res.status(204).send();
}

export async function startTitleTest(req, res) {
  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (String(post.author) !== String(req.user.id)) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const variantB = String(req.body.variantB ?? "").trim();
  if (!variantB) return res.status(400).json({ error: "Variant B is required" });

  post.titleTest = {
    variantB,
    clicks: { variantA: 0, variantB: 0 },
    startedAt: new Date(),
    winner: null,
  };
  await post.save();
  return res.json({ post });
}

export async function trackTitleClick(req, res) {
  const variant = req.body.variant === "B" ? "B" : "A";
  const field = variant === "B" ? "titleTest.clicks.variantB" : "titleTest.clicks.variantA";
  await PostModel.updateOne(
    { _id: req.params.id, "titleTest.winner": null },
    { $inc: { [field]: 1 } },
  );
  return res.status(204).send();
}

export async function translatePost(req, res) {
  try {
    const targetLanguage = cleanLanguage(req.body.targetLanguage);
    const post = await PostModel.findById(req.params.id).select("title content language");
    if (!post) return res.status(404).json({ error: "Post not found" });
    if ((post.language ?? "en") === targetLanguage) {
      return res.json({ translatedContent: post.content.replace(/<[^>]+>/g, ""), targetLanguage });
    }

    const plainText = post.content.replace(/<[^>]+>/g, "").slice(0, 3000);
    const prompt = `Translate the following literary text from ${post.language ?? "en"} to ${targetLanguage}. Preserve the literary style, tone, and paragraph breaks. Return ONLY the translated text. No explanation. No preamble.\n\nText: ${plainText}`;
    const translatedContent = await generateText(prompt, 1200);
    return res.json({ translatedContent, targetLanguage });
  } catch (err) {
    console.error("Translation failed:", err?.message || err);
    return res.status(503).json({
      error: "Translation is temporarily unavailable. Please try again.",
    });
  }
}

// Admin helpers (not wired yet)
export async function getAllPosts(_req, res) {
  const posts = await PostModel.find({ status: { $ne: "draft" } })
    .select("+adminReviewComment +adminReviewedAt +adminReviewedBy")
    .populate("author", "name email role avatar bio followers following")
    .populate("coAuthors", "name avatar")
    .populate("coAuthorInvites.user", "name email avatar")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ posts });
}

export async function setPostStatus(req, res) {
  const postId = req.params.id;
  const nextStatus = toPostStatus(req.body.status);

  if (!nextStatus) return res.status(400).json({ error: "Invalid status" });

  const post = await PostModel.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const oldStatus = post.status;
  const adminReviewComment =
    typeof req.body.adminReviewComment === "string"
      ? req.body.adminReviewComment.trim().slice(0, 1000)
      : "";
  post.status = nextStatus;
  if (["approved", "scheduled", "rejected"].includes(nextStatus)) {
    post.adminReviewComment = adminReviewComment;
    post.adminReviewedAt = new Date();
    post.adminReviewedBy = req.user?._id ?? req.user?.id ?? null;
  }
  if (nextStatus === "scheduled") {
    const scheduledAt = new Date(req.body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return res
        .status(400)
        .json({ error: "scheduledAt must be a future date" });
    }
    post.scheduledAt = scheduledAt;
  }
  if (nextStatus === "approved") {
    post.scheduledAt = null;
  }
  if (["published", "rejected", "pending", "draft"].includes(nextStatus)) {
    post.scheduledAt = null;
  }
  await post.save();
  void deleteCachePattern("posts:*").catch(() => {});
  if (nextStatus === "approved") {
    void deleteCache("tags:all").catch(() => {});
    void deleteCache("posts:trending").catch(() => {});
  }

  if (oldStatus !== nextStatus && nextStatus === "approved") {
    queueMoodDetection(post);
    void awardXP(post.author, "post_approved").catch(() => {});
    void checkBadges(post.author).catch(() => {});
  }

  if (oldStatus !== nextStatus && ["approved", "rejected"].includes(nextStatus)) {
    await createNotification({
      recipient: post.author,
      type: nextStatus === "approved" ? "post_approved" : "post_rejected",
      actor: req.user?.id ?? null,
      post: post._id,
    });
    await logAction({
      admin: req.user._id,
      action: nextStatus === "approved" ? "Post approved" : "Post rejected",
      targetType: "post",
      targetId: post._id,
      targetName: post.title,
      ip: req.ip,
    });
  }

  const { getIo } = await import("../socketState.js");
  const io = getIo();
  if (io) {
    io.emit("admin_event", {
      type: "Post status updated",
      user: "admin",
      time: new Date(),
      postId,
      status: nextStatus,
    });
  }

  // Record event for admin analytics
  const { recordAdminEvent } = await import("./adminController.js");
  recordAdminEvent("Post status changed", "admin", {
    postId,
    oldStatus,
    newStatus: nextStatus,
    postTitle: post.title,
  });

  return res.json({ post });
}

export async function checkPostPlagiarismForAdmin(req, res) {
  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const plagiarismCheck = await runPlagiarismReview(post);
  await logAction({
    admin: req.user._id,
    action: "Plagiarism checked",
    targetType: "post",
    targetId: post._id,
    targetName: post.title,
    details: `Similarity score: ${plagiarismCheck.similarityScore}%`,
    ip: req.ip,
  });

  return res.json({ plagiarismCheck });
}

export async function inviteCoAuthor(req, res) {
  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (String(post.author) !== String(req.user.id)) {
    return res.status(403).json({ error: "Only the original author can invite co-authors" });
  }

  const email = String(req.body.email ?? "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email is required" });

  const [invitee, inviter] = await Promise.all([
    UserModel.findOne({ email }),
    UserModel.findById(req.user.id).select("name"),
  ]);
  if (!invitee) return res.status(404).json({ error: "User not found" });
  if (String(invitee._id) === String(post.author)) {
    return res.status(400).json({ error: "The original author is already assigned" });
  }
  if (isPostCoAuthor(post, invitee._id)) {
    return res.status(400).json({ error: "User is already a co-author" });
  }
  if (
    (post.coAuthorInvites ?? []).some(
      (invite) =>
        String(invite.user) === String(invitee._id) && invite.status === "pending",
    )
  ) {
    return res.status(400).json({ error: "User already has a pending invite" });
  }

  post.coAuthorInvites.push({ user: invitee._id, status: "pending" });
  await post.save();

  getIo()
    ?.to(`user:${invitee._id}`)
    .emit("coauthor_invite", {
      postId: post._id,
      postTitle: post.title,
      invitedBy: inviter?.name ?? "An author",
    });

  await createNotification({
    recipient: invitee._id,
    type: "coauthor_invite",
    actor: req.user.id,
    post: post._id,
  });

  return res.json({ message: "Invitation sent" });
}

export async function acceptCoAuthorInvite(req, res) {
  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const invite = post.coAuthorInvites.find(
    (item) => String(item.user) === String(req.user.id),
  );
  if (!invite || invite.status !== "pending") {
    return res.status(400).json({ error: "No pending invite found" });
  }

  invite.status = "accepted";
  if (!isPostCoAuthor(post, req.user.id)) post.coAuthors.push(req.user.id);
  await post.save();

  const updated = await PostModel.findById(post._id)
    .populate("author", "name email role avatar bio followers following")
    .populate("coAuthors", "name avatar")
    .populate("coAuthorInvites.user", "name email avatar")
    .lean({ virtuals: true });

  return res.json({ post: updated });
}

export async function declineCoAuthorInvite(req, res) {
  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const invite = post.coAuthorInvites.find(
    (item) => String(item.user) === String(req.user.id),
  );
  if (!invite || invite.status !== "pending") {
    return res.status(400).json({ error: "No pending invite found" });
  }

  invite.status = "declined";
  await post.save();

  return res.json({ message: "Invitation declined" });
}

export async function removeCoAuthor(req, res) {
  const post = await PostModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (String(post.author) !== String(req.user.id)) {
    return res.status(403).json({ error: "Only the original author can remove co-authors" });
  }

  post.coAuthors = (post.coAuthors ?? []).filter(
    (id) => String(id) !== String(req.params.userId),
  );
  post.coAuthorInvites = (post.coAuthorInvites ?? []).filter(
    (invite) => String(invite.user) !== String(req.params.userId),
  );
  await post.save();

  const updated = await PostModel.findById(post._id)
    .populate("author", "name email role avatar bio followers following")
    .populate("coAuthors", "name avatar")
    .populate("coAuthorInvites.user", "name email avatar")
    .lean({ virtuals: true });

  return res.json({ post: updated });
}

// Unused right now; kept to avoid dead-import warnings if we later add analytics/events.
export function requireCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET,
  );
}
