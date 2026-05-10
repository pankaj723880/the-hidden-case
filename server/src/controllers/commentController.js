import { CommentModel } from "../models/Comment.js";
import { PostModel } from "../models/Post.js";
import { getIo } from "../socketState.js";
import { createNotification, parseMentions } from "../utils/notify.js";
import { logAction } from "../utils/audit.js";
import { checkBadges } from "../utils/checkBadges.js";
import { awardXP } from "../utils/xp.js";
import { progressQuest } from "../utils/quests.js";
import { trackAction } from "../utils/suspicion.js";

const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😢", "🔥"];

function reactionEntries(reactions) {
  if (!reactions) return [];
  if (reactions instanceof Map) return [...reactions.entries()];
  return Object.entries(reactions);
}

function getReactionCounts(reactions) {
  return ALLOWED_REACTIONS.reduce((counts, emoji) => {
    const value = reactions instanceof Map ? reactions.get(emoji) : reactions?.[emoji];
    counts[emoji] = Array.isArray(value) ? value.length : 0;
    return counts;
  }, {});
}

function getUserReaction(reactions, userId) {
  if (!userId) return null;

  for (const [emoji, userIds] of reactionEntries(reactions)) {
    if ((userIds ?? []).some((id) => id.toString() === userId)) return emoji;
  }

  return null;
}

function serializeComment(comment, userId) {
  return {
    ...comment,
    reactions: getReactionCounts(comment.reactions),
    userReaction: getUserReaction(comment.reactions, userId),
    replies: (comment.replies ?? []).map((reply) => serializeComment(reply, userId)),
  };
}

function buildCommentTree(comments) {
  const byId = new Map();
  const roots = [];

  for (const comment of comments) {
    byId.set(comment._id.toString(), { ...comment, replies: [] });
  }

  for (const comment of byId.values()) {
    const parentId = comment.parentComment?.toString();
    const parent = parentId ? byId.get(parentId) : null;

    if (parent) {
      parent.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  const sortReplies = (items) => {
    items.sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0));
    for (const item of items) sortReplies(item.replies ?? []);
  };

  roots.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  for (const root of roots) sortReplies(root.replies ?? []);

  return roots;
}

export async function getCommentsForPost(req, res) {
  const postId = req.params.postId;
  const userId = req.user?.id ?? null;

  const comments = await CommentModel.find({ post: postId })
    .populate("author", "name email role avatar bio")
    .sort({ createdAt: 1 })
    .lean();
  const commentTree = buildCommentTree(comments);

  return res.json({
    comments: commentTree.map((comment) => serializeComment(comment, userId)),
  });
}

export async function addComment(req, res) {
  const postId = req.params.postId;

  const text = String(req.body.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "Missing comment text" });

  const post = await PostModel.findOne({
    _id: postId,
    status: { $in: ["approved", "published"] },
  });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const comment = await CommentModel.create({
    post: postId,
    author: user.id,
    text,
    parentComment: null,
  });

  const populated = await CommentModel.findById(comment._id)
    .populate("author", "name email role avatar bio")
    .lean();

  await createNotification({
    recipient: post.author,
    type: "comment",
    actor: user.id,
    post: post._id,
    comment: comment._id,
  });
  void awardXP(post.author, "comment_received").catch(() => {});
  void checkBadges(user.id).catch(() => {});
  void progressQuest(user.id, "comment").catch(() => {});
  void trackAction(user.id, req.ip, "comment").catch(() => {});
  await parseMentions(text, user.id, post._id, comment._id);

  const io = getIo();
  if (io) {
    io.emit("new_comment", { comment: populated, postId });
  }

  return res.status(201).json({ comment: serializeComment(populated, user.id) });
}

export async function addReply(req, res) {
  const { postId, commentId } = req.params;

  const text = String(req.body.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "Missing reply text" });

  const post = await PostModel.findOne({
    _id: postId,
    status: { $in: ["approved", "published"] },
  });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const parent = await CommentModel.findOne({
    _id: commentId,
    post: postId,
  });
  if (!parent) return res.status(404).json({ error: "Parent comment not found" });

  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const reply = await CommentModel.create({
    post: postId,
    author: user.id,
    text,
    parentComment: commentId,
  });

  parent.replies.push(reply._id);
  await parent.save();

  const populatedReply = await CommentModel.findById(reply._id)
    .populate("author", "name email role avatar bio")
    .lean();
  const serializedReply = serializeComment(populatedReply, user.id);

  await createNotification({
    recipient: parent.author,
    type: "reply",
    actor: user.id,
    post: postId,
    comment: reply._id,
  });
  void checkBadges(user.id).catch(() => {});
  void progressQuest(user.id, "comment").catch(() => {});
  void trackAction(user.id, req.ip, "comment").catch(() => {});
  await parseMentions(text, user.id, postId, reply._id);

  const io = getIo();
  if (io) {
    io.emit("new_reply", {
      reply: serializedReply,
      parentCommentId: commentId,
      postId,
    });
  }

  return res.status(201).json({ reply: serializedReply });
}

export async function reactToComment(req, res) {
  const commentId = req.params.commentId;
  const emoji = req.body.emoji;
  const userId = String(req.user.id);

  if (!ALLOWED_REACTIONS.includes(emoji)) {
    return res.status(400).json({ error: "Invalid reaction" });
  }

  const comment = await CommentModel.findById(commentId);
  if (!comment) return res.status(404).json({ error: "Comment not found" });

  let removedSameEmoji = false;

  for (const key of ALLOWED_REACTIONS) {
    const current = comment.reactions.get(key) ?? [];
    const hadUser = current.some((id) => id.toString() === userId);
    if (hadUser && key === emoji) removedSameEmoji = true;
    comment.reactions.set(
      key,
      current.filter((id) => id.toString() !== userId),
    );
  }

  if (!removedSameEmoji) {
    const next = comment.reactions.get(emoji) ?? [];
    next.push(userId);
    comment.reactions.set(emoji, next);
  }

  await comment.save();

  const counts = getReactionCounts(comment.reactions);
  return res.json({
    reactions: counts,
    userReaction: removedSameEmoji ? null : emoji,
  });
}

export async function deleteComment(req, res) {
  const commentId = req.params.id;

  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });

  const comment = await CommentModel.findById(commentId);
  if (!comment) return res.status(404).json({ error: "Comment not found" });

  // Ownership or admin delete
  const canDelete = String(comment.author) === user.id || user.role === "admin";
  if (!canDelete) return res.status(403).json({ error: "Not allowed" });

  await CommentModel.deleteOne({ _id: commentId });

  if (user.role === "admin") {
    await logAction({
      admin: user._id,
      action: "Comment deleted",
      targetType: "comment",
      targetId: comment._id,
      targetName: comment.text?.slice(0, 80) ?? "",
      ip: req.ip,
    });
  }

  const io = getIo();
  if (io) {
    io.emit("new_comment", {
      comment: { _id: commentId, deleted: true },
      postId: comment.post.toString(),
    });
  }

  return res.json({ ok: true });
}
