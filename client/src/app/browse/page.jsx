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
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--accent3)] border-t-[var(--gold)]" />
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
    <main className="editorial-shell py-12">
      <header className="mb-9 flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end" style={{ borderColor: "var(--border)" }}>
        <div>
          <div style={{ width: 40, height: 1, background: "var(--gold)", marginBottom: "0.5rem", opacity: 0.7 }} />
          <p className="text-xs uppercase tracking-[0.15rem]" style={{ color: "var(--text3)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
            Library
          </p>
          <h1 className="serif-title mt-2 text-5xl font-bold italic">
            Browse
          </h1>
          <p className="mt-3 max-w-2xl text-[0.88rem] italic" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
            {posts.length} stories and blogs
          </p>
        </div>
        {user?.role !== "admin" ? (
          <AppLink href="/write" className="secondary-btn px-5 py-3">
            Submit your work
          </AppLink>
        ) : null}
      </header>

      <SearchPanel onSearch={handleSearch} />

      <div className="mb-6 flex flex-wrap gap-2">
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
          className="rounded-[3px] border px-3 py-1.5 text-xs font-bold"
          style={{
            borderColor: "var(--border)",
            backgroundColor: filters.mood ? "var(--bg2)" : "var(--accent)",
            color: filters.mood ? "var(--text2)" : "#faf7f2",
            fontFamily: "var(--font-garamond), Georgia, serif",
          }}
        >
          All moods
        </button>
        {MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => setMoodFilter(mood)}
            className="rounded-[3px] border px-3 py-1.5 text-xs font-bold capitalize"
            style={{
              borderColor: "var(--border)",
              backgroundColor: filters.mood === mood ? "var(--accent)" : "var(--bg2)",
              color: filters.mood === mood ? "#faf7f2" : "var(--text2)",
              fontFamily: "var(--font-garamond), Georgia, serif",
            }}
          >
            {mood}
          </button>
        ))}
      </div>

      {error ? <p className="mb-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <article key={i} className="card h-72 animate-pulse rounded-[4px] p-6">
                <div className="mb-5 h-32 rounded-md bg-[#ead9c7]" />
                <div className="h-5 w-3/4 rounded bg-[#d8cab8]" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 rounded bg-[#ead9c7]" />
                  <div className="h-3 w-5/6 rounded bg-[#ead9c7]" />
                </div>
              </article>
            ))
          : posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={handleLike}
                onShare={handleShare}
                sharedPostId={sharedPostId}
              />
            ))}
      </section>

      <div ref={sentinelRef} className="h-1" />

      {loadingMore ? <LoadingSpinner /> : null}

      {!loading && posts.length === 0 ? (
        <p className="card mt-10 rounded-[4px] p-6 text-center italic" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
          📜 No posts found
        </p>
      ) : null}

      {!hasMore && posts.length > 0 ? (
        <p className="mt-10 text-center text-sm font-semibold" style={{ color: "var(--text3)" }}>
          You&apos;ve reached the end
        </p>
      ) : null}
    </main>
  );
}
