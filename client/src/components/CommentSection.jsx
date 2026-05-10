"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { AppLink } from "../lib/navigation";
import CommentReactions from "./CommentReactions";
import ReportButton from "./ReportButton";
import MentionInput from "./MentionInput";

function formatDate(date) {
  return date ? new Date(date).toLocaleString() : "Just now";
}

function appendReply(comments, parentCommentId, reply) {
  return comments.map((comment) => {
    if (comment._id !== parentCommentId) {
      return {
        ...comment,
        replies: appendReply(comment.replies ?? [], parentCommentId, reply),
      };
    }

    const replies = comment.replies ?? [];
    if (replies.some((item) => item._id === reply._id)) return comment;
    return { ...comment, replies: [...replies, reply] };
  });
}

function MentionText({ text }) {
  const parts = String(text ?? "").split(/(@\w+)/g);

  return parts.map((part, index) => {
    if (!/^@\w+$/.test(part)) return <span key={`${part}-${index}`}>{part}</span>;

    return (
      <AppLink
        key={`${part}-${index}`}
        href={`/profile/search/${encodeURIComponent(part.slice(1))}`}
        className="font-bold"
        style={{ color: "var(--accent3)" }}
      >
        {part}
      </AppLink>
    );
  });
}

function CommentNode({
  comment,
  depth,
  expandedReplies,
  formatDate,
  handleReply,
  isAuthenticated,
  openReplyId,
  replyText,
  setExpandedReplies,
  setOpenReplyId,
  setReplyText,
  user,
}) {
  const replies = comment.replies ?? [];
  const showAll = expandedReplies[comment._id];
  const visibleReplies = showAll ? replies : replies.slice(0, 3);
  const indentClass = depth > 0 ? "border-l pl-5" : "";

  return (
    <div
      className={depth === 0 ? "card rounded-[4px] p-4" : indentClass}
      style={depth > 0 ? { borderColor: "var(--border)" } : undefined}
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] font-bold text-[var(--accent)]">
          {(comment.author?.name ?? "U").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="italic"
              style={{
                color: "var(--accent)",
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontSize: "0.9rem",
              }}
            >
              {comment.author?.name ?? "Anonymous User"}
            </span>
            <span className="text-xs" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-[0.88rem] leading-[1.75]" style={{ color: "var(--text2)", fontFamily: "var(--font-lora), Georgia, serif" }}>
            <MentionText text={comment.text} />
          </p>

          <CommentReactions
            commentId={comment._id}
            reactions={comment.reactions}
            userReaction={comment.userReaction}
            currentUserId={user?.id}
          />

          {isAuthenticated ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpenReplyId((current) =>
                    current === comment._id ? "" : comment._id,
                  );
                  setReplyText("");
                }}
                className="text-sm font-bold text-[var(--accent)]"
              >
                Reply ({replies.length})
              </button>
              <ReportButton contentType="comment" contentId={comment._id} />
            </div>
          ) : null}

          {openReplyId === comment._id ? (
            <form
              onSubmit={(event) => handleReply(event, comment._id)}
              className="mt-3"
            >
              <MentionInput
                value={replyText}
                onChange={setReplyText}
                className="field min-h-20 resize-y"
                placeholder="Write a reply..."
                required
              />
              <button
                type="submit"
                className="primary-btn mt-2 px-4 py-2 text-sm"
              >
                Submit reply
              </button>
            </form>
          ) : null}

          {visibleReplies.length > 0 ? (
            <div className="mt-4 space-y-4">
              {visibleReplies.map((reply) => (
                <CommentNode
                  key={reply._id}
                  comment={reply}
                  depth={depth + 1}
                  expandedReplies={expandedReplies}
                  formatDate={formatDate}
                  handleReply={handleReply}
                  isAuthenticated={isAuthenticated}
                  openReplyId={openReplyId}
                  replyText={replyText}
                  setExpandedReplies={setExpandedReplies}
                  setOpenReplyId={setOpenReplyId}
                  setReplyText={setReplyText}
                  user={user}
                />
              ))}
            </div>
          ) : null}

          {replies.length > 3 ? (
            <button
              type="button"
              onClick={() =>
                setExpandedReplies((current) => ({
                  ...current,
                  [comment._id]: !current[comment._id],
                }))
              }
              className="mt-3 text-sm font-bold text-[var(--accent)]"
            >
              {showAll
                ? "Show fewer replies"
                : `Show all ${replies.length} replies`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ postId }) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [openReplyId, setOpenReplyId] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get(`/api/comments/post/${postId}`);
        if (!cancelled) setComments(res.data.comments ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load comments",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    const handleNewComment = (payload) => {
      if (payload.postId !== postId || !payload.comment) return;
      if (payload.comment.parentComment) return;

      setComments((current) => {
        if (current.some((comment) => comment._id === payload.comment._id)) {
          return current;
        }
        return [payload.comment, ...current];
      });
    };

    const handleNewReply = (payload) => {
      if (payload.postId !== postId || !payload.reply) return;
      setComments((current) =>
        appendReply(current, payload.parentCommentId, payload.reply),
      );
    };

    socket.on("new_comment", handleNewComment);
    socket.on("new_reply", handleNewReply);

    return () => {
      socket.off("new_comment", handleNewComment);
      socket.off("new_reply", handleNewReply);
    };
  }, [postId]);

  const handleComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await api.post(`/api/comments/post/${postId}`, {
        text: commentText,
      });
      setComments((current) => [res.data.comment, ...current]);
      setCommentText("");
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to add comment",
      );
    }
  };

  const handleReply = async (event, commentId) => {
    event.preventDefault();
    if (!replyText.trim()) return;

    try {
      const res = await api.post(
        `/api/comments/post/${postId}/reply/${commentId}`,
        { text: replyText },
      );
      setComments((current) => appendReply(current, commentId, res.data.reply));
      setReplyText("");
      setOpenReplyId("");
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to add reply",
      );
    }
  };

  return (
    <section id="discussion" className="mt-16 scroll-mt-24 pt-10">
      <div className="literary-divider">✦</div>
      <h2 className="mb-8 text-[1.1rem] tracking-[0.02em]" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Discussion
      </h2>

      {error ? <p className="mb-5 text-sm font-semibold text-[var(--red)]">{error}</p> : null}

      {isAuthenticated ? (
        <form onSubmit={handleComment} className="card mb-8 rounded-[4px] p-5">
          <MentionInput
            value={commentText}
            onChange={setCommentText}
            className="field min-h-28 resize-y"
            placeholder="Add your response..."
            required
          />
          <button type="submit" className="primary-btn mt-3 px-5 py-2.5 text-sm">
            Add comment
          </button>
        </form>
      ) : (
        <p className="card mb-8 rounded-[4px] p-5 text-sm" style={{ color: "var(--text2)" }}>
          <AppLink href="/login" className="font-bold">
            Login
          </AppLink>{" "}
          to like, comment, or reply.
        </p>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentNode
            key={comment._id}
            comment={comment}
            depth={0}
            expandedReplies={expandedReplies}
            formatDate={formatDate}
            handleReply={handleReply}
            isAuthenticated={isAuthenticated}
            openReplyId={openReplyId}
            replyText={replyText}
            setExpandedReplies={setExpandedReplies}
            setOpenReplyId={setOpenReplyId}
            setReplyText={setReplyText}
            user={user}
          />
        ))}

        {comments.length === 0 ? (
          <p className="card rounded-[4px] p-5 text-center italic" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
            No comments yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
