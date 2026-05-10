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
      <header className="mb-9 border-b border-[#ded2c1] pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Collections
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold text-[#25211d]">
          Series
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#6d6155]">
          Follow connected stories and essays in the order their authors planned.
        </p>
      </header>

      {error ? <p className="mb-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="paper-card h-64 animate-pulse rounded-lg p-6">
                <div className="h-7 w-3/4 rounded bg-[#ead9c7]" />
                <div className="mt-5 space-y-2">
                  <div className="h-3 rounded bg-[#ead9c7]" />
                  <div className="h-3 w-5/6 rounded bg-[#ead9c7]" />
                </div>
              </article>
            ))
          : series.map((item) => (
              <AppLink
                key={item._id}
                href={`/series/${item._id}`}
                className="paper-card group flex min-h-64 flex-col rounded-lg p-6 transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(72,54,37,0.13)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8f5f35]">
                  {item.postCount ?? 0} parts
                </p>
                <h2 className="serif-title mt-4 text-3xl font-bold leading-tight text-[#25211d]">
                  {item.title}
                </h2>
                {item.description ? (
                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-[#6d6155]">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-auto pt-6 text-xs font-semibold text-[#8b7f72]">
                  By {item.author?.name ?? "Unknown"}
                </p>
              </AppLink>
            ))}
      </section>

      {!isLoading && series.length === 0 ? (
        <p className="paper-card mt-10 rounded-lg p-6 text-center text-[#6d6155]">
          No series have been published yet.
        </p>
      ) : null}
    </main>
  );
}
