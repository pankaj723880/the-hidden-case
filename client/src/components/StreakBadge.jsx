"use client";

export default function StreakBadge({ streak = 0, longestStreak = 0 }) {
  const current = Number(streak) || 0;
  const best = Number(longestStreak) || 0;

  if (current <= 0) {
    return (
      <span className="inline-flex rounded-full border border-[#f59e0b]/40 px-3 py-1 text-xs font-bold text-[#8f5f35]">
        Start your streak today!
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[#f59e0b] px-3 py-1 text-xs font-black text-white shadow-sm"
      title={`Best: ${best} ${best === 1 ? "day" : "days"}`}
    >
      🔥 {current} day streak
      <span className="font-semibold opacity-85">Best: {best}</span>
    </span>
  );
}
