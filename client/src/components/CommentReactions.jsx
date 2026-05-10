"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";

const emojis = ["👍", "❤️", "😂", "😢", "🔥"];

function emptyCounts() {
  return emojis.reduce((counts, emoji) => {
    counts[emoji] = 0;
    return counts;
  }, {});
}

export default function CommentReactions({
  commentId,
  reactions = {},
  userReaction = null,
  currentUserId,
}) {
  const [counts, setCounts] = useState({ ...emptyCounts(), ...reactions });
  const [activeReaction, setActiveReaction] = useState(userReaction);

  const handleReact = async (emoji) => {
    if (!currentUserId) {
      toast.error("Login to react");
      return;
    }

    const previousCounts = counts;
    const previousReaction = activeReaction;
    const nextReaction = activeReaction === emoji ? null : emoji;
    const nextCounts = { ...counts };

    if (activeReaction) {
      nextCounts[activeReaction] = Math.max(0, (nextCounts[activeReaction] ?? 0) - 1);
    }
    if (nextReaction) {
      nextCounts[nextReaction] = (nextCounts[nextReaction] ?? 0) + 1;
    }

    setCounts(nextCounts);
    setActiveReaction(nextReaction);

    try {
      const res = await api.post(`/api/comments/${commentId}/react`, { emoji });
      setCounts({ ...emptyCounts(), ...res.data.reactions });
      setActiveReaction(res.data.userReaction ?? null);
    } catch (err) {
      setCounts(previousCounts);
      setActiveReaction(previousReaction);
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to react",
      );
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {emojis.map((emoji) => {
        const isActive = activeReaction === emoji;
        const count = counts[emoji] ?? 0;

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleReact(emoji)}
            className="rounded-full px-2.5 py-1 text-xs font-bold transition"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: isActive ? "var(--accent)" : "var(--bg2)",
              color: isActive ? "#fff" : "var(--text2)",
            }}
          >
            {emoji}
            {count > 0 ? ` ${count}` : ""}
          </button>
        );
      })}
    </div>
  );
}
