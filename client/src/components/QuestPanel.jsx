"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function QuestPanel() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get("/api/quests/active");
        if (!cancelled) setQuests(res.data.quests ?? []);
      } catch {
        if (!cancelled) setQuests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="paper-card rounded-lg p-5" style={{ color: "var(--text2)" }}>Loading weekly quests...</div>;
  }
  if (quests.length === 0) return null;

  return (
    <section className="editorial-shell py-8">
      <div className="mb-5">
        <div style={{ width: 40, height: 1, background: "var(--gold)", marginBottom: "0.5rem", opacity: 0.7 }} />
        <p className="text-xs uppercase tracking-[0.15rem]" style={{ color: "var(--text3)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Weekly Quests
        </p>
        <h2 className="serif-title mt-2 text-3xl font-bold" style={{ color: "var(--ink)" }}>
          This week&apos;s reading goals
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {quests.map((quest) => {
          const percent = Math.min(100, ((quest.progress ?? 0) / quest.target) * 100);
          return (
            <article
              key={quest._id}
              className="rounded-[4px] border p-5"
              style={{
                backgroundColor: quest.completed ? "#e8f0e8" : "var(--bg2)",
                borderColor: quest.completed ? "#b0cbb0" : "var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="serif-title text-xl font-bold" style={{ color: "var(--ink)" }}>
                  {quest.title}
                </h3>
                <span className="rounded-[3px] border px-2 py-1 text-xs" style={{ borderColor: "var(--border2)", color: "var(--accent)" }}>
                  +{quest.xpReward} XP
                </span>
              </div>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>
                {quest.description}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-[3px]" style={{ backgroundColor: "var(--bg4)" }}>
                <div
                  className="h-full"
                  style={{
                    width: `${percent}%`,
                    background: quest.completed
                      ? "var(--green)"
                      : "linear-gradient(to right, var(--accent3), var(--gold))",
                  }}
                />
              </div>
              <p className="mt-2 text-xs font-bold" style={{ color: quest.completed ? "var(--green)" : "var(--text3)" }}>
                {quest.completed ? "✓ Completed" : `${quest.progress ?? 0}/${quest.target}`}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
