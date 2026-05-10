"use client";

import { useEffect, useMemo, useState } from "react";

export default function TableOfContents({ content }) {
  const headings = useMemo(() => {
    if (!content) return [];

    const doc = new DOMParser().parseFromString(content, "text/html");
    return [...doc.querySelectorAll("h2, h3")].map((heading, i) => ({
      id: `heading-${i}`,
      text: heading.textContent,
      level: heading.tagName,
    }));
  }, [content]);

  const [isWideScreen, setIsWideScreen] = useState(false);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const updateScreenSize = () => {
      setIsWideScreen(window.innerWidth > 1280);
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);

    return () => {
      window.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  useEffect(() => {
    if (!isWideScreen || headings.length < 3) return undefined;

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry?.target?.id) setActiveId(visibleEntry.target.id);
      },
      {
        rootMargin: "-120px 0px -65% 0px",
        threshold: 0.1,
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [headings, isWideScreen]);

  if (headings.length < 3 || !isWideScreen) return null;

  return (
    <aside
      style={{
        position: "fixed",
        right: "2rem",
        top: "120px",
        zIndex: 20,
        maxWidth: "200px",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        background: "var(--bg2)",
        padding: "1rem",
      }}
    >
      <p
        style={{
          marginBottom: "0.75rem",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text3)",
        }}
      >
        Contents
      </p>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {headings.map((heading) => (
          <button
            key={heading.id}
            type="button"
            onClick={() =>
              document
                .getElementById(heading.id)
                ?.scrollIntoView({ behavior: "smooth" })
            }
            style={{
              border: 0,
              background: "transparent",
              padding: 0,
              paddingLeft: heading.level === "H3" ? "12px" : 0,
              color:
                activeId === heading.id
                  ? "var(--accent)"
                  : heading.level === "H3"
                    ? "var(--text3)"
                    : "var(--text2)",
              cursor: "pointer",
              fontSize: heading.level === "H3" ? "12px" : "13px",
              fontWeight: activeId === heading.id ? 700 : 400,
              lineHeight: 1.35,
              textAlign: "left",
            }}
          >
            {heading.text}
          </button>
        ))}
      </div>
    </aside>
  );
}
