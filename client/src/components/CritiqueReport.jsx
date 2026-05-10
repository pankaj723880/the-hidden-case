"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

const labels = {
  pacing: "Pacing",
  tone: "Tone",
  readability: "Readability",
  characterDepth: "Character depth",
  plotConsistency: "Plot consistency",
};

export default function CritiqueReport({ postId }) {
  const [critique, setCritique] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState("");

  const fetchCritique = async () => {
    setIsLoading(true);
    setNotReady(false);
    setError("");

    try {
      const res = await api.get(`/api/posts/${postId}/critique`);
      setCritique(res.data.critique);
    } catch (err) {
      if (err?.response?.status === 404) {
        setNotReady(true);
      } else {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            "Failed to load critique",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCritique();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="py-10 text-center" style={{ color: "var(--text2)" }}>
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-[var(--accent3)] border-t-[var(--gold)]" />
        Generating your critique...
      </div>
    );
  }

  if (notReady) {
    return (
      <div className="card rounded-[4px] p-5 text-center">
        <p style={{ color: "var(--text2)" }}>
          Your critique is being generated. Check back in a moment.
        </p>
        <button
          type="button"
          onClick={fetchCritique}
          className="secondary-btn mt-4 px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm font-semibold text-[var(--red)]">{error}</p>;
  }

  if (!critique) return null;

  const scoreEntries = Object.entries(critique.scores ?? {}).filter(([, value]) =>
    Number.isFinite(Number(value)),
  );

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18rem]" style={{ color: "var(--text3)" }}>
          🔒 Only you can see this
        </p>
        <h2 className="serif-title mt-2 text-3xl font-bold">
          Your Private Critique Report
        </h2>
      </header>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div
          className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border text-3xl font-bold"
          style={{
            borderColor: "var(--gold)",
            color: "var(--accent)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          {critique.overallScore ?? "-"}
          <span className="text-base" style={{ color: "var(--text3)" }}>/10</span>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {scoreEntries.map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm" style={{ color: "var(--text2)" }}>
                <span>{labels[key] ?? key}</span>
                <span>{value}/10</span>
              </div>
              <div className="h-2 rounded-[3px] bg-[var(--bg4)]">
                <div
                  className="h-full rounded-[3px]"
                  style={{
                    width: `${Math.min(100, Number(value) * 10)}%`,
                    background: "linear-gradient(to right, var(--accent3), var(--gold))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <blockquote className="border-l-4 py-2 pl-4 italic" style={{ borderColor: "var(--accent3)", color: "var(--text2)" }}>
        {critique.summary}
      </blockquote>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="serif-title text-xl font-bold">Strengths</h3>
          <ul className="mt-3 space-y-2">
            {(critique.strengths ?? []).map((item) => (
              <li key={item} className="flex gap-2 text-sm" style={{ color: "var(--text2)" }}>
                <span style={{ color: "var(--green)" }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="serif-title text-xl font-bold">Areas to improve</h3>
          <ul className="mt-3 space-y-2">
            {(critique.improvements ?? []).map((item) => (
              <li key={item} className="flex gap-2 text-sm" style={{ color: "var(--text2)" }}>
                <span style={{ color: "var(--gold)" }}>●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
