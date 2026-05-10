import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { AppLink } from "../../../lib/navigation";

export default function SeriesDetailPage({ seriesId }) {
  const [series, setSeries] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get(`/api/series/${seriesId}`);
        if (!cancelled) setSeries(res.data.series);
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
  }, [seriesId]);

  if (isLoading) {
    return <main className="editorial-shell py-12 text-[#6d6155]">Loading series...</main>;
  }

  if (error || !series) {
    return (
      <main className="editorial-shell py-12">
        <div className="paper-card rounded-lg p-8 text-center">
          <h1 className="serif-title text-4xl font-bold text-[#25211d]">
            Series not found
          </h1>
          <p className="mt-3 text-[#6d6155]">{error || "This series is not available."}</p>
          <AppLink href="/series" className="primary-btn mt-6 inline-flex px-5 py-3">
            Browse series
          </AppLink>
        </div>
      </main>
    );
  }

  const posts = series.posts ?? [];
  const firstPost = posts[0];

  return (
    <main className="editorial-shell py-12">
      <header className="paper-card rounded-lg p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Series
        </p>
        <h1 className="serif-title mt-3 max-w-4xl text-5xl font-bold leading-tight text-[#25211d]">
          {series.title}
        </h1>
        {series.description ? (
          <p className="mt-5 max-w-3xl text-lg italic leading-8 text-[#6d6155]">
            {series.description}
          </p>
        ) : null}
        <div className="mt-7 flex flex-wrap items-center gap-4 text-sm font-semibold text-[#8b7f72]">
          <span>By {series.author?.name ?? "Unknown"}</span>
          <span>{posts.length} parts</span>
          {firstPost ? (
            <AppLink href={`/post/${firstPost._id}`} className="primary-btn px-5 py-3">
              Start Reading
            </AppLink>
          ) : null}
        </div>
      </header>

      <section className="mt-10 space-y-4">
        {posts.map((post, index) => (
          <AppLink
            key={post._id}
            href={`/post/${post._id}`}
            className="paper-card flex flex-col justify-between gap-4 rounded-lg p-5 transition hover:-translate-y-0.5 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f5f35]">
                Part {index + 1}
              </p>
              <h2 className="serif-title mt-1 text-2xl font-bold text-[#25211d]">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-[#8b7f72]">
                {post.createdAt
                  ? new Date(post.createdAt).toLocaleDateString()
                  : "Undated"}
              </p>
            </div>
            <span className="secondary-btn px-4 py-2 text-center text-sm">
              Read
            </span>
          </AppLink>
        ))}
      </section>

      {posts.length === 0 ? (
        <p className="paper-card mt-10 rounded-lg p-6 text-center text-[#6d6155]">
          This series has no published posts yet.
        </p>
      ) : null}
    </main>
  );
}
