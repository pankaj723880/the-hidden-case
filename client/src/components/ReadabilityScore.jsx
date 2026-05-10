"use client";

import { useState } from "react";
import { analyseText } from "../utils/analyseText";

function scoreColor(score) {
  if (score > 60) return "var(--green)";
  if (score >= 40) return "var(--gold)";
  return "var(--red)";
}

function MetricRow({ label, value, flagged }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span>
        {flagged ? <span style={{ color: "var(--gold)" }}>⚠ </span> : null}
        {label}
      </span>
      <span style={{ color: flagged ? "var(--accent)" : "var(--text2)" }}>
        {value}
      </span>
    </p>
  );
}

export default function ReadabilityScore({ content }) {
  const [showHelp, setShowHelp] = useState(false);
  const result = analyseText(content);
  if (!result) return null;

  return (
    <div
      className="border-t px-3 py-2 text-xs"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg2)",
        color: "var(--text3)",
        fontFamily: "var(--font-garamond), Georgia, serif",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-[3px] px-2 py-0.5 font-bold text-white"
          style={{ backgroundColor: scoreColor(result.fleschScore) }}
        >
          {result.fleschScore}
        </span>
        <span>{result.readingLevel}</span>
        <button
          type="button"
          onClick={() => setShowHelp((current) => !current)}
          className="rounded-[3px] border px-1.5 font-bold"
          style={{ borderColor: "var(--border)", color: "var(--accent)" }}
          aria-label="Explain readability score"
        >
          ?
        </button>
      </div>
      {showHelp ? (
        <p className="mt-2 rounded-[3px] border p-2 italic" style={{ borderColor: "var(--border)", background: "var(--bg3)" }}>
          Flesch reading ease scores run from 0 to 100. Higher scores usually
          mean shorter sentences and simpler wording.
        </p>
      ) : null}
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <MetricRow
          label="Avg sentence length"
          value={`${result.avgWordsPerSentence} words`}
          flagged={result.avgWordsPerSentence > 25}
        />
        <MetricRow
          label="Passive voice"
          value={`${result.passivePercent}%`}
          flagged={result.passivePercent > 20}
        />
        <MetricRow
          label="Long sentences"
          value={result.longSentenceCount}
          flagged={result.longSentenceCount > 3}
        />
        <MetricRow label="Words analysed" value={result.wordCount} />
      </div>
    </div>
  );
}
