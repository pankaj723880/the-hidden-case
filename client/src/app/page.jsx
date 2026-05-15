import { useEffect, useState } from "react";
import { AppLink } from "../lib/navigation";
import { api } from "../lib/api";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import FeedToggle from "../components/FeedToggle";
import QuestPanel from "../components/QuestPanel";
import { getRandomHomeQuoteIndex, homeQuotes } from "../lib/homeQuotes";
import { getMediaUrl } from "../lib/media";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [homeQuoteIndex, setHomeQuoteIndex] = useState(() => getRandomHomeQuoteIndex());
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedMode, setFeedMode] = useState("for-you");
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [challengeWinners, setChallengeWinners] = useState([]);

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
        const [featuredRes, trendingRes, leaderboardRes, winnersRes] = await Promise.all([
          api.get("/api/posts/featured"),
          api.get("/api/posts/trending"),
          api.get("/api/leaderboard"),
          api.get("/api/challenges/winners"),
        ]);
        if (!cancelled) {
          setFeaturedPosts(featuredRes.data.posts ?? []);
          setTrendingPosts(trendingRes.data.posts ?? []);
          setChallengeWinners(winnersRes.data.winners ?? []);
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
          setChallengeWinners([]);
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
      {/* Hero Section — dark atmospheric */}
      <section
        className="hero relative overflow-hidden px-8 py-24 sm:py-32"
        style={{
          background: "linear-gradient(180deg, #0a0a0a 0%, #1a0f0f 40%, #2a1515 70%, #0d0d0d 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-glow"
          style={{
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(212,160,32,0.08) 0%, rgba(192,57,43,0.04) 40%, transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p
            className="animate-fade-in-up text-sm font-medium uppercase tracking-[0.3em]"
            style={{ color: "var(--accent2)", animationDelay: "0.1s" }}
          >
            THE HIDDEN CASE
          </p>
          <h1
            className="animate-fade-in-up mt-3 text-[3rem] leading-none sm:text-[4.5rem]"
            style={{
              color: "#fff",
              fontFamily: "var(--font-bebas), sans-serif",
              letterSpacing: "0.06em",
              animationDelay: "0.25s",
            }}
          >
            UNSOLVED MYSTERIES<br />HIDDEN FROM THE WORLD
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-xl text-[1rem]"
            style={{ color: "var(--text2)", animationDelay: "0.4s" }}
          >
            Discover unsolved mysteries, true crime stories, and
            paranormal encounters.
          </p>
          <div className="hero-btns animate-fade-in-up mt-8 flex justify-center gap-4" style={{ animationDelay: "0.55s" }}>
            <AppLink
              href="/browse"
              className="primary-btn px-8 py-3 hover:no-underline"
            >
              Browse Cases
            </AppLink>
            <AppLink
              href="/write"
              className="secondary-btn px-8 py-3 hover:no-underline"
            >
              Submit Evidence
            </AppLink>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="editorial-shell animate-fade-in py-10" style={{ animationDelay: "0.7s" }}>
        <blockquote
          className="animate-border-glow mx-auto max-w-3xl rounded-lg border-l-4 bg-[var(--bg2)] px-6 py-5 text-[1.05rem] italic leading-8 transition-all duration-500"
          style={{ borderColor: "var(--accent)", color: "var(--text2)", fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          &ldquo;{homeQuotes[homeQuoteIndex]}&rdquo;
          <span className="block pt-2 text-sm not-italic" style={{ color: "var(--text3)" }}>— The Hidden Case</span>
        </blockquote>
      </section>

      {isAuthenticated ? (
        <QuestPanel />
      ) : null}

      {/* Personalised Feed */}
      {isAuthenticated ? (
        <section className="editorial-shell py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15rem]" style={{ color: "var(--text3)" }}>
                Personalised
              </p>
              <h2 className="serif-title mt-2 text-4xl font-bold">
                YOUR FEED
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text3)" }}>
                {feedMode === "for-you"
                  ? "Posts from authors and tags you follow"
                  : "Fresh stories and blogs from the whole community"}
              </p>
            </div>
            <FeedToggle value={feedMode} onToggle={handleFeedToggle} />
          </div>

          {isFeedLoading ? (
            <div className="paper-card rounded-xl p-6" style={{ color: "var(--text2)" }}>
              Loading posts...
            </div>
          ) : feedPosts.length > 0 ? (
            <div className="stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {feedPosts.map((post) => (
                <div key={post._id} className="animate-fade-in-up">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          ) : (
            <div className="paper-card rounded-xl p-6">
              <h3 className="serif-title text-2xl font-bold">
                FOLLOW SOME AUTHORS OR TAGS
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

      {/* Editor's Pick */}
      {featuredPosts.length > 0 ? (
        <section className="editorial-shell py-10">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15rem]" style={{ color: "var(--text3)" }}>
              Selected by the editor
            </p>
            <h2 className="serif-title mt-2 text-4xl font-bold">
              EDITOR&apos;S PICK
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

      {/* Challenge Winners */}
      {challengeWinners.length > 0 ? (
        <section className="editorial-shell py-10">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15rem]" style={{ color: "var(--text3)" }}>
              Challenge laurels
            </p>
            <h2 className="serif-title mt-2 text-4xl font-bold">
              CHALLENGE WINNERS
            </h2>
          </div>

          <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {challengeWinners.slice(0, 3).map((challenge) => (
              <article
                key={challenge._id}
                className="rounded-xl border p-4"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg2)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--accent2)" }}>
                  {challenge.title}
                </p>
                <div className="mt-4">
                  <PostCard post={challenge.winner.post} />
                </div>
                <p className="mt-3 text-xs font-semibold" style={{ color: "var(--text3)" }}>
                  Winner announced{" "}
                  {challenge.winner.selectedAt
                    ? new Date(challenge.winner.selectedAt).toLocaleDateString()
                    : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Leaderboard Preview */}
      {leaderboardUsers.length > 0 ? (
        <section className="editorial-shell py-8">
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg2)" }}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15rem]" style={{ color: "var(--text3)" }}>
                  Leaderboard
                </p>
                <h2 className="serif-title mt-1 text-3xl font-bold">
                  TOP WRITERS THIS MONTH
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
                  className="flex items-center gap-3 rounded-lg p-3 transition hover:no-underline"
                  style={{ backgroundColor: "var(--bg3)" }}
                >
                  <span className="text-xl">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </span>
                  {writer.avatar ? (
                    <img
                      src={getMediaUrl(writer.avatar)}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
                      {(writer.name ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{writer.name}</p>
                    <p className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
                      {writer.xp ?? 0} XP
                    </p>
                  </div>
                </AppLink>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Trending */}
      {trendingPosts.length > 0 ? (
        <section className="editorial-shell py-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.15rem]"
                style={{ color: "var(--text3)" }}
              >
                This Week
              </p>
              <h2 className="serif-title mt-2 text-4xl font-bold">
                TRENDING THIS WEEK
              </h2>
            </div>
            <AppLink
              href="/browse"
              className="hidden text-sm font-semibold sm:inline-flex"
              style={{ color: "var(--accent2)" }}
            >
              Browse all
            </AppLink>
          </div>

          <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingPosts.map((post, index) => (
              <div
                key={post._id}
                className="relative min-w-0"
              >
                <span className="absolute left-3 top-3 z-20 rounded-md px-3 py-1 text-sm font-bold text-white shadow-lg" style={{ background: "var(--accent)" }}>
                  #{index + 1}
                </span>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Info cards */}
      <section className="editorial-shell stagger grid gap-5 py-10 md:grid-cols-3">
        {[
          ["🔍", "CASE FILES", "Narrative pieces with character, suspense, and mystery."],
          ["📝", "FIELD NOTES", "Useful thoughts, guides, theories, and personal accounts."],
          ["🤝", "THE NETWORK", "Like, comment, share, and follow fellow investigators."],
        ].map(([icon, title, text]) => (
          <article key={title} className="animate-fade-in-up paper-card rounded-xl p-6 transition-all duration-300 hover:border-[var(--accent)]/30">
            <span className="text-3xl">{icon}</span>
            <h2 className="serif-title mt-3 text-2xl font-bold">
              {title}
            </h2>
            <p className="mt-3 leading-7" style={{ color: "var(--text2)" }}>{text}</p>
          </article>
        ))}
      </section>

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

function FeaturedPostCard({ post, large = false }) {
  if (!post) return null;

  return (
    <div
      className="relative rounded-xl"
      style={{
        border: "1px solid var(--accent)",
        boxShadow: "0 18px 55px rgba(192, 57, 43, 0.15)",
      }}
    >
      <span className="absolute left-3 top-3 z-20 rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white shadow-lg">
        ✨ Editor&apos;s Pick
      </span>
      <div className={large ? "[&>article]:min-h-[34rem]" : "[&>article]:min-h-[18rem] [&_img]:h-32"}>
        <PostCard post={post} />
      </div>
    </div>
  );
}
