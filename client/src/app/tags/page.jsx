import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AppLink } from "../../lib/navigation";

function tagSizeClass(count) {
  if (count >= 10) return "text-lg font-bold";
  if (count >= 5) return "text-base font-semibold";
  if (count >= 2) return "text-sm font-semibold";
  return "text-sm font-medium";
}

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get("/api/tags");
        if (!cancelled) setTags(res.data.tags ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error || err?.message || "Failed to load tags",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="editorial-shell py-12">
      <header className="mb-9 border-b pb-8" style={{ borderColor: "var(--border)" }}>
        <p
          className="text-xs font-semibold uppercase tracking-[0.26em]"
          style={{ color: "var(--accent2)" }}
        >
          Directory
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold">
          BROWSE BY TAG
        </h1>
      </header>

      {isLoading ? (
        <p style={{ color: "var(--text2)" }}>Loading tags...</p>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold" style={{ color: "var(--accent2)" }}>{error}</p>
      ) : null}

      {!isLoading && !error && tags.length === 0 ? (
        <div className="paper-card rounded-xl p-6" style={{ color: "var(--text2)" }}>
          No tags found yet.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {tags.map(({ tag, count }) => (
          <AppLink
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className={`rounded-lg border px-4 py-2 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent2)] ${tagSizeClass(count)}`}
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg3)",
              color: "var(--text)",
            }}
          >
            #{tag}
            <span className="ml-2 text-xs" style={{ color: "var(--text3)" }}>
              {count}
            </span>
          </AppLink>
        ))}
      </div>
    </main>
  );
}
