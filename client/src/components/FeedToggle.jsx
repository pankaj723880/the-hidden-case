"use client";

export default function FeedToggle({ value, onToggle }) {
  return (
    <div
      className="inline-flex rounded-full border p-1"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg3)" }}
    >
      {[
        ["for-you", "For You"],
        ["discover", "Discover"],
      ].map(([mode, label]) => {
        const isActive = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onToggle(mode)}
            className="rounded-full px-4 py-2 text-sm font-bold transition"
            style={{
              backgroundColor: isActive ? "var(--accent)" : "transparent",
              color: isActive ? "#fff" : "var(--text2)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
