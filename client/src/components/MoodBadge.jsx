"use client";

const MOOD_CONFIG = {
  dark: { emoji: "🌑", color: "#4a3520", bg: "#f0e8d8" },
  hopeful: { emoji: "🌅", color: "#3d6b45", bg: "#e8f0e8" },
  tense: { emoji: "⚡", color: "#9b3030", bg: "#f0e8e8" },
  melancholy: { emoji: "🌧", color: "#3d5a7a", bg: "#e8eef5" },
  suspenseful: { emoji: "🔍", color: "#7a4f2d", bg: "#f5ead8" },
  humorous: { emoji: "✨", color: "#8a6020", bg: "#f5edd8" },
  romantic: { emoji: "🌹", color: "#8a3060", bg: "#f5e8f0" },
  philosophical: { emoji: "📜", color: "#4a4a7a", bg: "#eeeff8" },
};

function label(value) {
  return String(value ?? "").slice(0, 1).toUpperCase() + String(value ?? "").slice(1);
}

export const MOODS = Object.keys(MOOD_CONFIG);

export default function MoodBadge({ mood }) {
  const config = MOOD_CONFIG[mood];
  if (!config) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[11px] font-bold"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        fontFamily: "var(--font-garamond), Georgia, serif",
      }}
    >
      <span>{config.emoji}</span>
      {label(mood)}
    </span>
  );
}
