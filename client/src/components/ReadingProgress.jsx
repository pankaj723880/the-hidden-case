"use client";

import { useEffect } from "react";

export default function ReadingProgress() {
  useEffect(() => {
    let frame = 0;
    const progress = document.getElementById("reading-progress-bar");

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const scrollHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const nextScrollPercent =
          scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;

        if (progress) {
          progress.style.transform = `scaleX(${Math.min(1, Math.max(0, nextScrollPercent / 100))})`;
        }
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      id="reading-progress-bar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        height: "3px",
        width: "100%",
        background: "linear-gradient(to right, var(--accent3), var(--gold))",
        transform: "scaleX(0)",
        transformOrigin: "left center",
        willChange: "transform",
      }}
    />
  );
}
