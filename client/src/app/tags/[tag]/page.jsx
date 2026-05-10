import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import { AppLink } from "../../../lib/navigation";
import PostCard from "../../../components/PostCard";
import FollowTagButton from "../../../components/FollowTagButton";
import { useAuth } from "../../../context/AuthContext";

export default function TagDetailPage({ tag }) {
  const decodedTag = useMemo(() => decodeURIComponent(tag ?? ""), [tag]);
  const normalizedTag = decodedTag.trim().replace(/^#+/, "").toLowerCase();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get("/api/posts", {
          params: { tag: decodedTag, limit: 100 },
        });
        if (!cancelled) {
          setPosts(res.data.posts ?? []);
          setTotalPosts(res.data.totalPosts ?? res.data.posts?.length ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load tag posts",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [decodedTag]);

  return (
    <main className="editorial-shell py-12">
      <header className="mb-9 border-b pb-8" style={{ borderColor: "var(--border)" }}>
        <AppLink href="/tags" className="text-sm font-bold" style={{ color: "var(--accent)" }}>
          Browse all tags
        </AppLink>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1
            className="serif-title text-5xl font-bold"
            style={{ color: "var(--text)" }}
          >
            #{decodedTag}
          </h1>
          <FollowTagButton
            tag={decodedTag}
            initialFollowing={(user?.followedTags ?? [])
              .map((item) => String(item).toLowerCase())
              .includes(normalizedTag)}
          />
        </div>
        <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text3)" }}>
          {totalPosts} {totalPosts === 1 ? "post" : "posts"}
        </p>
      </header>

      {isLoading ? (
        <p style={{ color: "var(--text2)" }}>Loading posts...</p>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-[#9f3d2e]">{error}</p>
      ) : null}

      {!isLoading && !error && posts.length === 0 ? (
        <div className="paper-card rounded-lg p-6" style={{ color: "var(--text2)" }}>
          No posts found with this tag.
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </main>
  );
}
