"use client";

import { LEVELS } from "../lib/levels";

export default function LevelBadge({ level = "Apprentice", xp = 0, showProgress = false }) {
  const current =
    LEVELS.find((item) => item.name === level) ||
    [...LEVELS].reverse().find((item) => xp >= item.minXP) ||
    LEVELS[0];
  const next = LEVELS.find((item) => item.minXP > current.minXP);
  const progressPercent = next
    ? Math.max(0, Math.min(100, ((xp - current.minXP) / (next.minXP - current.minXP)) * 100))
    : 100;

  return (
    <div>
      <span
        className="inline-flex items-center gap-2 rounded-[3px] border px-3 py-1 text-sm font-bold"
        style={{
          backgroundColor: "var(--bg3)",
          borderColor: "var(--border2)",
          color: "var(--accent)",
          fontFamily: "var(--font-garamond), Georgia, serif",
        }}
      >
        <span>{current.icon}</span>
        {current.name}
      </span>
      {showProgress ? (
        <div className="mt-3 w-full max-w-sm">
          <div className="h-2 overflow-hidden rounded-[3px]" style={{ backgroundColor: "var(--bg4)" }}>
            <div
              className="h-full rounded-[3px]"
              style={{
                width: `${progressPercent}%`,
                background: "linear-gradient(to right, var(--accent3), var(--gold))",
              }}
            />
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
            {next ? `${xp} / ${next.minXP} XP to ${next.name}` : `${xp} XP`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
