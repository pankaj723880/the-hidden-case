"use client";

import { useEffect, useState } from "react";

export default function ReadingProgress() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const nextScrollPercent =
        scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;

      setScrollPercent(Math.min(100, Math.max(0, nextScrollPercent)));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        height: "3px",
        width: `${scrollPercent}%`,
        background: "linear-gradient(to right, var(--accent3), var(--gold))",
        transition: "width 0.1s ease",
      }}
    />
  );
}
