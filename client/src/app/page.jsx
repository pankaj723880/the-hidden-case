import { useEffect, useState } from "react";
import { AppLink } from "../lib/navigation";
import { api } from "../lib/api";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import FeedToggle from "../components/FeedToggle";
import QuestPanel from "../components/QuestPanel";
import { getRandomHomeQuoteIndex, homeQuotes } from "../lib/homeQuotes";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [homeQuoteIndex, setHomeQuoteIndex] = useState(() => getRandomHomeQuoteIndex());
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedMode, setFeedMode] = useState("for-you");
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);

  useEffect(() => {
    const quoteTimer = window.setInterval(() => {
      setHomeQuoteIndex((currentIndex) => {
        if (homeQuotes.length < 2) return currentIndex;
        let nextIndex = getRandomHomeQuoteIndex();
        while (nextIndex === currentIndex) {
          nextIndex = getRandomHomeQuoteIndex();
        }
        return nextIndex;
      });
    }, 60 * 1000);

    return () => {
      window.clearInterval(quoteTimer);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const savedMode = window.localStorage.getItem("thc-feed-pref");
    if (savedMode === "for-you" || savedMode === "discover") {
      setFeedMode(savedMode);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;

    void (async () => {
      try {
        const [featuredRes, trendingRes, leaderboardRes] = await Promise.all([
          api.get("/api/posts/featured"),
          api.get("/api/posts/trending"),
          api.get("/api/leaderboard"),
        ]);
        if (!cancelled) {
          setFeaturedPosts(featuredRes.data.posts ?? []);
          setTrendingPosts(trendingRes.data.posts ?? []);
          setLeaderboardUsers(
            [...(leaderboardRes.data.users ?? [])]
              .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
              .slice(0, 3),
          );
        }
      } catch {
        if (!cancelled) {
          setFeaturedPosts([]);
          setTrendingPosts([]);
          setLeaderboardUsers([]);
          setFeedPosts([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setFeedPosts([]);
      return;
    }

    let cancelled = false;
    setIsFeedLoading(true);

    void (async () => {
      try {
        const endpoint =
          feedMode === "discover" ? "/api/posts" : "/api/posts/feed";
        const res = await api.get(endpoint, { params: { limit: 6 } });
        if (!cancelled) setFeedPosts(res.data.posts ?? []);
      } catch {
        if (!cancelled) setFeedPosts([]);
      } finally {
        if (!cancelled) setIsFeedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [feedMode, isAuthenticated, isLoading]);

  const handleFeedToggle = (nextMode) => {
    setFeedMode(nextMode);
    window.localStorage.setItem("thc-feed-pref", nextMode);
  };

  return (
    <main>
      <section className="hero px-8 py-20 text-center sm:py-28" style={{ background: "linear-gradient(160deg, #2c2416 0%, #4a3520 40%, #7a4f2d 100%)" }}>
        <div style={{ width: 60, height: 1, background: "var(--gold)", margin: "0 auto 1.5rem", opacity: 0.8 }} />
        <h1
          className="mx-auto text-[2.2rem] italic leading-tight sm:text-[3.5rem]"
          style={{
            color: "#f5f0e8",
            fontFamily: "var(--font-playfair), Georgia, serif",
            letterSpacing: "0.02em",
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          The Hidden Case
        </h1>
        <p
          className="mx-auto mt-3 max-w-2xl text-[1.1rem] italic"
          style={{ color: "rgba(245,240,232,0.7)", fontFamily: "var(--font-garamond), Georgia, serif" }}
        >
          Every story is a mystery waiting to be uncovered
        </p>
        <div className="mx-auto mt-6 text-base" style={{ color: "var(--gold)", opacity: 0.7 }}>
          — ✦ —
        </div>
        <div className="hero-btns mt-7 flex justify-center gap-4">
          <AppLink
            href="/browse"
            className="px-7 py-3 hover:no-underline"
            style={{
              background: "var(--gold)",
              color: "var(--ink)",
              borderRadius: 3,
              fontFamily: "var(--font-garamond), Georgia, serif",
              letterSpacing: "0.08rem",
            }}
          >
            Browse Stories
          </AppLink>
          <AppLink
            href="/write"
            className="px-7 py-3 hover:no-underline"
            style={{
              border: "1px solid rgba(245,240,232,0.4)",
              color: "#f5f0e8",
              borderRadius: 3,
              fontFamily: "var(--font-garamond), Georgia, serif",
              letterSpacing: "0.08rem",
            }}
          >
            Write Your Story
          </AppLink>
        </div>
      </section>

      <section className="editorial-shell py-10">
        <blockquote
          className="mx-auto max-w-3xl border-l-4 py-2 pl-5 text-[1.05rem] italic leading-8"
          style={{ borderColor: "var(--gold)", color: "var(--text2)", fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          “{homeQuotes[homeQuoteIndex]}”
          <span className="block pt-2 text-sm" style={{ color: "var(--text3)" }}>— The Hidden Case</span>
        </blockquote>
      </section>

      {isAuthenticated ? (
        <QuestPanel />
      ) : null}

      {isAuthenticated ? (
        <section className="editorial-shell py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div style={{ width: 40, height: 1, background: "var(--gold)", marginBottom: "0.5rem", opacity: 0.7 }} />
              <p className="text-xs uppercase tracking-[0.15rem]" style={{ color: "var(--text3)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                Personalised
              </p>
              <h2 className="serif-title mt-2 text-4xl font-bold">
                Your Feed
              </h2>
              <p className="mt-2 text-sm font-semibold" style={{ color: "var(--text3)" }}>
                {feedMode === "for-you"
                  ? "Posts from authors and tags you follow"
                  : "Fresh stories and blogs from the whole community"}
              </p>
            </div>
            <FeedToggle value={feedMode} onToggle={handleFeedToggle} />
          </div>

          {isFeedLoading ? (
            <div className="paper-card rounded-lg p-6" style={{ color: "var(--text2)" }}>
              Loading posts...
            </div>
          ) : feedPosts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {feedPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="paper-card rounded-lg p-6">
              <h3 className="serif-title text-2xl font-bold" style={{ color: "var(--text)" }}>
                Follow some authors or tags to personalise your feed
              </h3>
              <p className="mt-2 leading-7" style={{ color: "var(--text2)" }}>
                Start with authors you enjoy or tags that match what you want to read.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <AppLink href="/browse" className="primary-btn px-5 py-3">
                  Browse posts
                </AppLink>
                <AppLink href="/tags" className="secondary-btn px-5 py-3">
                  Browse tags
                </AppLink>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {featuredPosts.length > 0 ? (
        <section className="editorial-shell py-10">
          <div className="mb-6">
            <div style={{ width: 40, height: 1, background: "var(--gold)", marginBottom: "0.5rem", opacity: 0.7 }} />
            <p className="text-xs uppercase tracking-[0.15rem]" style={{ color: "var(--text3)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
              Selected by the editor
            </p>
            <h2 className="serif-title mt-2 text-4xl font-bold">
              Editor&apos;s Pick
            </h2>
          </div>

          <div
            className={
              featuredPosts.length === 1
                ? "grid gap-5"
                : featuredPosts.length === 2
                  ? "grid gap-5 md:grid-cols-2"
                  : "grid gap-5 lg:grid-cols-[2fr_1fr]"
            }
          >
            <div className={featuredPosts.length === 3 ? "min-w-0" : ""}>
              <FeaturedPostCard post={featuredPosts[0]} large />
            </div>
            {featuredPosts.length === 2 ? (
              <FeaturedPostCard post={featuredPosts[1]} large />
            ) : null}
            {featuredPosts.length === 3 ? (
              <div className="grid gap-5">
                {featuredPosts.slice(1).map((post) => (
                  <FeaturedPostCard key={post._id} post={post} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {leaderboardUsers.length > 0 ? (
        <section className="editorial-shell py-8">
          <div className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div style={{ width: 40, height: 1, background: "var(--gold)", marginBottom: "0.5rem", opacity: 0.7 }} />
                <p className="text-xs uppercase tracking-[0.15rem]" style={{ color: "var(--text3)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                  Leaderboard
                </p>
                <h2 className="serif-title mt-1 text-3xl font-bold text-[#25211d]">
                  This month&apos;s top writers
                </h2>
              </div>
              <AppLink href="/leaderboard" className="secondary-btn px-4 py-2 text-sm">
                View all
              </AppLink>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {leaderboardUsers.map((writer, index) => (
                <AppLink
                  key={writer._id}
                  href={`/profile/${writer._id}`}
                  className="flex items-center gap-3 rounded-lg bg-[#ead9c7]/45 p-3"
                >
                  <span className="text-xl">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </span>
                  {writer.avatar ? (
                    <img
                      src={writer.avatar}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fffaf2] font-bold text-[#8f5f35]">
                      {(writer.name ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-[#25211d]">{writer.name}</p>
                    <p className="text-xs font-semibold text-[#8b7f72]">
                      {writer.xp ?? 0} XP
                    </p>
                  </div>
                </AppLink>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {trendingPosts.length > 0 ? (
        <section className="editorial-shell py-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div style={{ width: 40, height: 1, background: "var(--gold)", marginBottom: "0.5rem", opacity: 0.7 }} />
              <p
                className="text-xs uppercase tracking-[0.15rem]"
                style={{ color: "var(--text3)", fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                This Week
              </p>
              <h2 className="serif-title mt-2 text-4xl font-bold">
                Trending This Week
              </h2>
            </div>
            <AppLink
              href="/browse"
              className="hidden text-sm font-bold sm:inline-flex"
              style={{ color: "var(--accent)" }}
            >
              Browse all
            </AppLink>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingPosts.map((post, index) => (
              <div
                key={post._id}
                className="relative min-w-0"
                style={{ filter: "drop-shadow(0 0 16px rgba(122, 79, 45, 0.18))" }}
              >
                <span className="absolute left-3 top-3 z-20 rounded-[3px] px-3 py-1 text-sm font-black text-[#faf7f2] shadow-lg" style={{ background: "var(--accent)" }}>
                  #{index + 1}
                </span>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="editorial-shell grid gap-5 py-10 md:grid-cols-3">
        {[
          ["Stories", "Narrative pieces with character, place, and emotion."],
          ["Blogs", "Useful thoughts, guides, opinions, and personal notes."],
          ["Community", "Like, comment, share, and follow new writing."],
        ].map(([title, text]) => (
          <article key={title} className="paper-card rounded-lg p-6">
            <h2 className="serif-title text-2xl font-bold text-[#25211d]">
              {title}
            </h2>
            <p className="mt-3 leading-7 text-[#6d6155]">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function FeaturedPostCard({ post, large = false }) {
  if (!post) return null;

  return (
    <div
      className="relative rounded-lg"
      style={{
        border: "1px solid #f59e0b",
        boxShadow: "0 18px 55px rgba(245, 158, 11, 0.16)",
      }}
    >
      <span className="absolute left-3 top-3 z-20 rounded-full bg-[#f59e0b] px-3 py-1 text-xs font-black text-white shadow-lg">
        ✨ Editor&apos;s Pick
      </span>
      <div className={large ? "[&>article]:min-h-[34rem]" : "[&>article]:min-h-[18rem] [&_img]:h-32"}>
        <PostCard post={post} />
      </div>
    </div>
  );
}
