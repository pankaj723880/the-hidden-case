"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export default function WritingStats({ content }) {
  const [wordGoal, setWordGoal] = useState(1000);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const wasBelowGoal = useRef(true);

  const plainText = content.replace(/<[^>]+>/g, "").trim();
  const words = plainText
    ? plainText.split(/\s+/).filter(Boolean).length
    : 0;
  const sentences = plainText
    ? plainText.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0)
        .length
    : 0;
  const paragraphs = (content.match(/<p>/gi) || []).length;
  const readTime = Math.max(1, Math.ceil(words / 200));
  const readLevel =
    words < 300
      ? "Short read"
      : words < 800
        ? "Medium read"
        : words < 2000
          ? "Long read"
          : "Very long read";
  const progress = Math.min(100, (words / wordGoal) * 100);

  useEffect(() => {
    if (words < wordGoal) {
      wasBelowGoal.current = true;
      return;
    }

    if (wasBelowGoal.current) {
      toast.success("Goal reached! 🎉");
      wasBelowGoal.current = false;
    }
  }, [wordGoal, words]);

  return (
    <div
      className="px-3 py-1.5 text-xs"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg3)",
        color: "var(--text3)",
        fontFamily: "var(--font-garamond), Georgia, serif",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          {words} words · {sentences} sentences · {paragraphs} paragraphs ·{" "}
          {readTime} min read · {readLevel}
        </p>
        <div className="flex items-center gap-2">
          {showGoalInput ? (
            <input
              type="number"
              min="1"
              value={wordGoal}
              onChange={(event) =>
                setWordGoal(Math.max(1, Number(event.target.value) || 1))
              }
              className="h-7 w-20 rounded border px-2 text-xs"
              style={{
                backgroundColor: "var(--bg2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
          ) : null}
          <button
            type="button"
            onClick={() => setShowGoalInput((current) => !current)}
            className="font-bold"
            style={{ color: "var(--accent)" }}
          >
            Set goal
          </button>
        </div>
      </div>
      <div
        className="mt-1.5 h-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--bg4)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to right, var(--accent3), var(--gold))",
          }}
        />
      </div>
    </div>
  );
}
