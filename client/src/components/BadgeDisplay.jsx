"use client";

import { BADGES } from "../lib/badges";

export default function BadgeDisplay({ badges = [], size = "sm", showAll = false }) {
  const earned = new Set(badges ?? []);
  const visibleBadges = showAll ? BADGES : BADGES.filter((badge) => earned.has(badge.id));

  if (size === "sm") {
    const unlocked = visibleBadges.slice(0, 5);
    const remaining = Math.max(0, visibleBadges.length - unlocked.length);
    if (unlocked.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {unlocked.map((badge) => (
          <span
            key={badge.id}
            title={`${badge.name}: ${badge.desc}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border text-sm"
            style={{
              backgroundColor: "var(--bg3)",
              borderColor: "var(--border)",
              filter: earned.has(badge.id) ? "none" : "grayscale(1)",
              opacity: earned.has(badge.id) ? 1 : 0.45,
            }}
          >
            {badge.icon}
          </span>
        ))}
        {remaining > 0 ? (
          <span className="rounded-[3px] border px-2 py-1 text-xs" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
            +{remaining} more
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleBadges.map((badge) => {
        const isEarned = earned.has(badge.id);
        return (
          <article
            key={badge.id}
            className="relative rounded-[4px] border p-5"
            style={{
              backgroundColor: "var(--bg2)",
              borderColor: isEarned ? "var(--gold)" : "var(--border)",
              filter: isEarned ? "none" : "grayscale(1)",
              opacity: isEarned ? 1 : 0.55,
            }}
          >
            {!isEarned ? <span className="absolute right-3 top-3 text-sm">🔒</span> : null}
            <div className="text-4xl">{badge.icon}</div>
            <h3 className="serif-title mt-3 text-xl font-bold" style={{ color: "var(--ink)" }}>
              {badge.name}
            </h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>
              {badge.desc}
            </p>
          </article>
        );
      })}
    </div>
  );
}
