"use client";

import { useEffect, useState } from "react";

const sizes = [14, 16, 18, 20, 22];
const defaultSize = 16;

export default function FontSizeControl() {
  const [size, setSize] = useState(defaultSize);

  useEffect(() => {
    const savedSize = parseInt(localStorage.getItem("thc-font-size"), 10);
    setSize(sizes.includes(savedSize) ? savedSize : defaultSize);
  }, []);

  const updateSize = (newSize) => {
    setSize(newSize);
    localStorage.setItem("thc-font-size", String(newSize));
    window.dispatchEvent(
      new CustomEvent("fontSizeChange", { detail: { size: newSize } }),
    );
  };

  const currentIndex = sizes.indexOf(size);
  const isMinimum = currentIndex <= 0;
  const isMaximum = currentIndex >= sizes.length - 1;

  const buttonStyle = (isActive = false) => ({
    height: "28px",
    minWidth: "32px",
    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "3px",
    background: isActive ? "var(--bg4)" : "var(--bg2)",
    color: isActive ? "var(--accent)" : "var(--text2)",
    fontFamily: "var(--font-garamond), Georgia, serif",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => updateSize(sizes[currentIndex - 1])}
        disabled={isMinimum}
        style={buttonStyle(false)}
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => updateSize(defaultSize)}
        style={buttonStyle(size === defaultSize)}
      >
        A
      </button>
      <button
        type="button"
        onClick={() => updateSize(sizes[currentIndex + 1])}
        disabled={isMaximum}
        style={buttonStyle(false)}
      >
        A+
      </button>
    </div>
  );
}
