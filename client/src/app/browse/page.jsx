import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { AppLink, navigate } from "../../lib/navigation";
import PostCard from "../../components/PostCard";
import SearchPanel from "../../components/SearchPanel";
import { MOODS } from "../../components/MoodBadge";
import { LANGUAGES } from "../../lib/languages";

const PAGE_SIZE = 9;

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div
        className="h-9 w-9 animate-spin rounded-full border-4 border-t-transparent"
        style={{ borderColor: "var(--border2)", borderTopColor: "var(--accent)" }}
      />
    </div>
  );
}

export default function BrowsePage() {
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sharedPostId, setSharedPostId] = useState("");
  const [filters, setFilters] = useState({});
  const sentinelRef = useRef(null);

  const fetchPosts = useCallback(
    async (nextPage, { replace = false } = {}) => {
      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError("");

      try {
        const res = await api.get("/api/posts", {
          params: {
            page: nextPage,
            limit: PAGE_SIZE,
            search: filters.keyword || undefined,
            type: filters.type || undefined,
            tag: filters.tag || undefined,
            sort: filters.sort || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            mood: filters.mood || undefined,
            language: filters.language || undefined,
          },
        });
        const newPosts = res.data.posts ?? [];
        setPosts((current) => (replace ? newPosts : [...current, ...newPosts]));
        setHasMore(Boolean(res.data.hasMore));
        setPage(nextPage);
      } catch (err) {
        setError(
          err?.response?.data?.error || err?.message || "Failed to load posts",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    void fetchPosts(1, { replace: true });
  }, [fetchPosts]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          void fetchPosts(page + 1);
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [fetchPosts, hasMore, loading, loadingMore, page]);

  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const res = await api.post(`/api/posts/${postId}/like`);
      setPosts((current) =>
        current.map((post) =>
          post._id === postId
            ? { ...post, likes: Array.from({ length: res.data.likesCount ?? 0 }) }
            : post,
        ),
      );
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update like",
      );
    }
  };

  const handleShare = async (post) => {
    const url = `${window.location.origin}/post/${post._id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.content?.slice(0, 120) || "Read this piece.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setSharedPostId(post._id);
        window.setTimeout(() => setSharedPostId(""), 1800);
      }
    } catch {
      // User cancelled the share sheet.
    }
  };

  const handleSearch = (nextFilters) => {
    setFilters(nextFilters);
  };

  const setMoodFilter = (mood) => {
    setFilters((current) => ({ ...current, mood }));
  };
  const setLanguageFilter = (language) => {
    setFilters((current) => ({ ...current, language }));
  };

  return (
    <main>
      {/* Hero — Cinematic Archive */}
      <section
        className="relative overflow-hidden px-8 py-20 sm:py-28"
        style={{
          background: "linear-gradient(180deg, #0a0a0a 0%, #1a0f0f 40%, #1f1515 70%, #0d0d0d 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(192,57,43,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="editorial-shell relative z-10 text-center">
          <span
            className="animate-fade-in-up inline-block rounded-md border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em]"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "rgba(192,57,43,0.1)",
              color: "var(--accent2)",
              animationDelay: "0.1s",
            }}
          >
            CLASSIFIED ARCHIVE
          </span>
          <h1
            className="animate-fade-in-up mx-auto mt-5 max-w-3xl text-[2.5rem] leading-none sm:text-[4rem]"
            style={{
              color: "#fff",
              fontFamily: "var(--font-bebas), sans-serif",
              letterSpacing: "0.05em",
              animationDelay: "0.25s",
            }}
          >
            BROWSE THE CASE FILES
          </h1>
          <p className="animate-fade-in-up mx-auto mt-4 max-w-xl text-sm" style={{ color: "var(--text2)", animationDelay: "0.4s" }}>
            Search through {posts.length > 0 ? `${posts.length}+` : ""} documented cases of unsolved mysteries,
            true crime, and paranormal encounters.
          </p>

          {user?.role !== "admin" ? (
            <AppLink
              href="/write"
              className="primary-btn mt-6 inline-flex px-6 py-3 hover:no-underline"
            >
              Submit New Evidence
            </AppLink>
          ) : null}
        </div>
      </section>

      <div className="editorial-shell py-10">
        {/* Search & Filters */}
        <SearchPanel onSearch={handleSearch} />

        <div className="mb-8 flex flex-wrap gap-2">
          <select
            value={filters.language || ""}
            onChange={(event) => setLanguageFilter(event.target.value)}
            className="field max-w-[12rem]"
          >
            <option value="">All languages</option>
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.nativeName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMoodFilter("")}
            className="rounded-md border px-3 py-1.5 text-xs font-semibold transition"
            style={{
              borderColor: filters.mood ? "var(--border)" : "var(--accent)",
              backgroundColor: filters.mood ? "transparent" : "var(--accent)",
              color: filters.mood ? "var(--text2)" : "#fff",
            }}
          >
            All moods
          </button>
          {MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setMoodFilter(mood)}
              className="rounded-md border px-3 py-1.5 text-xs font-semibold capitalize transition"
              style={{
                borderColor: filters.mood === mood ? "var(--accent)" : "var(--border)",
                backgroundColor: filters.mood === mood ? "var(--accent)" : "transparent",
                color: filters.mood === mood ? "#fff" : "var(--text2)",
              }}
            >
              {mood}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mb-6 text-sm font-semibold" style={{ color: "var(--accent2)" }}>
            {error}
          </p>
        ) : null}

        {/* Case File Grid */}
        <section className="stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <article
                  key={i}
                  className="h-80 animate-shimmer rounded-xl border p-6"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg2)" }}
                >
                  <div className="mb-5 h-36 rounded-lg" style={{ backgroundColor: "var(--bg4)" }} />
                  <div className="h-5 w-3/4 rounded" style={{ backgroundColor: "var(--bg3)" }} />
                  <div className="mt-4 space-y-2">
                    <div className="h-3 rounded" style={{ backgroundColor: "var(--bg4)" }} />
                    <div className="h-3 w-5/6 rounded" style={{ backgroundColor: "var(--bg4)" }} />
                  </div>
                </article>
              ))
            : posts.map((post) => (
              <div key={post._id} className="animate-fade-in-up">
                <PostCard
                  post={post}
                  onLike={handleLike}
                  onShare={handleShare}
                  sharedPostId={sharedPostId}
                />
              </div>
              ))}
        </section>

        <div ref={sentinelRef} className="h-1" />

        {loadingMore ? <LoadingSpinner /> : null}

        {!loading && posts.length === 0 ? (
          <div
            className="mt-10 rounded-xl border p-8 text-center"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg2)" }}
          >
            <p
              className="text-xl font-bold tracking-wider"
              style={{ fontFamily: "var(--font-bebas), sans-serif", color: "var(--ink)" }}
            >
              NO CASES FOUND
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text3)" }}>
              Try adjusting your search filters or browse all cases.
            </p>
          </div>
        ) : null}

        {!hasMore && posts.length > 0 ? (
          <p
            className="mt-10 text-center text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--text3)" }}
          >
            — END OF ARCHIVE —
          </p>
        ) : null}
      </div>

      {/* Footer */}
      <footer className="border-t py-8 text-center" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-center gap-6">
          <a href="#" className="text-lg transition hover:text-[var(--accent2)]" style={{ color: "var(--text3)" }} aria-label="Facebook">⬤</a>
          <a href="#" className="text-lg transition hover:text-[var(--accent2)]" style={{ color: "var(--text3)" }} aria-label="Instagram">⬤</a>
          <a href="#" className="text-lg transition hover:text-[var(--accent2)]" style={{ color: "var(--text3)" }} aria-label="YouTube">⬤</a>
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--text3)" }}>© 2026 The Hidden Case. All rights reserved.</p>
      </footer>
    </main>
  );
}
