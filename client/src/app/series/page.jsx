import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AppLink } from "../../lib/navigation";

export default function SeriesPage() {
  const [series, setSeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get("/api/series");
        if (!cancelled) setSeries(res.data.series ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error || err?.message || "Failed to load series",
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
        <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--accent2)" }}>
          Collections
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold">
          SERIES
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8" style={{ color: "var(--text2)" }}>
          Follow connected stories and essays in the order their authors planned.
        </p>
      </header>

      {error ? <p className="mb-6 text-sm font-semibold" style={{ color: "var(--accent2)" }}>{error}</p> : null}

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="paper-card h-64 animate-pulse rounded-xl p-6">
                <div className="h-7 w-3/4 rounded" style={{ backgroundColor: "var(--bg4)" }} />
                <div className="mt-5 space-y-2">
                  <div className="h-3 rounded" style={{ backgroundColor: "var(--bg4)" }} />
                  <div className="h-3 w-5/6 rounded" style={{ backgroundColor: "var(--bg4)" }} />
                </div>
              </article>
            ))
          : series.map((item) => (
              <AppLink
                key={item._id}
                href={`/series/${item._id}`}
                className="paper-card group flex min-h-64 flex-col rounded-xl p-6 transition hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:no-underline hover:border-[var(--border2)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent2)" }}>
                  {item.postCount ?? 0} parts
                </p>
                <h2 className="serif-title mt-4 text-3xl font-bold leading-tight">
                  {item.title}
                </h2>
                {item.description ? (
                  <p className="mt-4 line-clamp-4 text-sm leading-7" style={{ color: "var(--text2)" }}>
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-auto pt-6 text-xs font-semibold" style={{ color: "var(--text3)" }}>
                  By {item.author?.name ?? "Unknown"}
                </p>
              </AppLink>
            ))}
      </section>

      {!isLoading && series.length === 0 ? (
        <p className="paper-card mt-10 rounded-xl p-6 text-center" style={{ color: "var(--text2)" }}>
          No series have been published yet.
        </p>
      ) : null}
    </main>
  );
}
