"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

const COLORS = {
  direct: "var(--accent)",
  search: "var(--green)",
  social: "var(--gold)",
  internal: "var(--accent3)",
  unknown: "var(--text3)",
};

export default function TrafficSources({ postId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!postId) return undefined;
    let cancelled = false;
    void api
      .get(`/api/analytics/posts/${postId}/traffic`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setData({ sources: [], total: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const sources = data?.sources ?? [];
  return (
    <div className="rounded-[4px] border p-5" style={{ backgroundColor: "var(--bg2)", borderColor: "var(--border)" }}>
      <h3 className="serif-title text-xl font-bold" style={{ color: "var(--ink)" }}>Traffic sources</h3>
      <div className="mt-4 space-y-2">
        {sources.map((item) => (
          <div key={item.source} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2" style={{ color: "var(--text2)" }}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[item.source] ?? COLORS.unknown }} />
              {item.source}
            </span>
            <span style={{ color: "var(--text3)" }}>{item.count} · {item.percent}%</span>
          </div>
        ))}
        {sources.length === 0 ? <p className="text-sm" style={{ color: "var(--text3)" }}>No traffic recorded yet.</p> : null}
      </div>
    </div>
  );
}
