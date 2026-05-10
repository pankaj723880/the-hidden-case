import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { AppLink, navigate } from "../../../lib/navigation";
import { useAuth } from "../../../context/AuthContext";
import FollowButton from "../../../components/FollowButton";
import PostCard from "../../../components/PostCard";
import UserConnectionsModal from "../../../components/UserConnectionsModal";
import StreakBadge from "../../../components/StreakBadge";
import BadgeDisplay from "../../../components/BadgeDisplay";
import LevelBadge from "../../../components/LevelBadge";

const LEADERBOARD_BADGES = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

export default function PublicProfilePage({ profileId }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsCount, setPostsCount] = useState(0);
  const [activeTab, setActiveTab] = useState("posts");
  const [qaItems, setQaItems] = useState([]);
  const [hasLoadedQa, setHasLoadedQa] = useState(false);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [connectionsType, setConnectionsType] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        const [profileRes, postsRes] = await Promise.all([
          api.get(`/api/users/${profileId}`),
          api.get(`/api/users/${profileId}/posts`),
        ]);

        if (!cancelled) {
          setProfile(profileRes.data.user);
          setPosts(postsRes.data.posts ?? []);
          setPostsCount(
            profileRes.data.postsCount ?? postsRes.data.posts?.length ?? 0,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load profile",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const fetchQa = async () => {
    try {
      const res = await api.get(`/api/users/${profileId}/qa`);
      setQaItems(res.data.items ?? []);
      setHasLoadedQa(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load Q&A",
      );
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "qa" && !hasLoadedQa) void fetchQa();
  };

  const askQuestion = async (event) => {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion) return;

    try {
      await api.post(`/api/users/${profileId}/qa`, { question: nextQuestion });
      setQuestion("");
      toast.success("Question submitted!");
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to submit question",
      );
    }
  };

  if (isLoading) {
    return (
      <main className="editorial-shell py-12" style={{ color: "var(--text2)" }}>
        Loading author...
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="editorial-shell py-12">
        <div className="paper-card rounded-lg p-8 text-center">
          <h1 className="serif-title text-4xl font-bold" style={{ color: "var(--text)" }}>
            User not found
          </h1>
          <p className="mt-3" style={{ color: "var(--text2)" }}>
            {error || "This author profile is not available."}
          </p>
          <AppLink href="/" className="primary-btn mt-6 inline-flex px-5 py-3">
            Back to home
          </AppLink>
        </div>
      </main>
    );
  }

  const profileUserId = profile._id ?? profile.id;
  const isOwnProfile = String(user?.id) === String(profileUserId);
  const initials = (profile.name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="editorial-shell py-12">
      <section className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <div className="bg-gradient-to-br from-[#111827] via-[#2b1b35] to-[#5b2333] p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt=""
                className="h-20 w-20 rounded-full border border-white/35 object-cover shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/12 font-serif text-3xl font-bold text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
                {initials}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="serif-title text-5xl font-bold text-white">
                  {profile.name}
                </h1>
                <LevelBadge level={profile.level} xp={profile.xp ?? 0} showProgress={isOwnProfile} />
                {profile.role === "admin" ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#f3e8ff]">
                    Admin
                  </span>
                ) : null}
                {profile.leaderboardBadge ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-[#fef3c7]">
                    {LEADERBOARD_BADGES[profile.leaderboardBadge]} This month&apos;s top author
                  </span>
                ) : null}
                <StreakBadge
                  streak={profile.currentStreak ?? 0}
                  longestStreak={profile.longestStreak ?? 0}
                />
              </div>
              {profile.bio ? (
                <p className="mt-3 max-w-2xl italic leading-7 text-white/78">
                  {profile.bio}
                </p>
              ) : null}
              {profile.createdAt ? (
                <p className="mt-3 text-sm font-semibold text-white/58">
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              ) : null}
            </div>
          </div>

          {isOwnProfile ? (
            <AppLink href="/profile" className="rounded-full border border-white/35 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/12">
              Edit Profile
            </AppLink>
          ) : (
            <div className="flex flex-wrap gap-3">
              <FollowButton
                authorId={profileUserId}
                initialFollowing={Boolean(profile.isFollowing)}
                initialCount={profile.followersCount ?? 0}
                onChange={({ followersCount }) =>
                  setProfile((current) =>
                    current ? { ...current, followersCount } : current,
                  )
                }
              />
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate(`/messages?user=${profileUserId}`)}
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(122,79,45,0.18)] transition hover:bg-[var(--accent2)]"
                >
                  Send message
                </button>
              ) : null}
            </div>
          )}
        </div>
        </div>

        <div className="grid gap-3 p-6 text-center sm:grid-cols-3">
          <div className="rounded-md p-4" style={{ backgroundColor: "var(--bg3)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{postsCount}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
              Posts
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConnectionsType("followers")}
            className="rounded-md p-4 transition hover:shadow-sm"
            style={{ backgroundColor: "var(--bg3)" }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {profile.followersCount ?? 0}
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
              Followers
            </p>
          </button>
          <button
            type="button"
            onClick={() => setConnectionsType("following")}
            className="rounded-md p-4 transition hover:shadow-sm"
            style={{ backgroundColor: "var(--bg3)" }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {profile.followingCount ?? 0}
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
              Following
            </p>
          </button>
        </div>
      </section>

      <div className="my-10 border-t" style={{ borderColor: "var(--border)" }} />

      <section>
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["posts", "Posts"],
            ["achievements", "Achievements"],
            ["qa", "Q&A"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTabChange(value)}
              className="rounded-full border px-4 py-2 text-sm font-bold"
              style={{
                borderColor: activeTab === value ? "var(--accent)" : "var(--border)",
                backgroundColor: activeTab === value ? "var(--accent)" : "transparent",
                color: activeTab === value ? "#fff" : "var(--text2)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "posts" ? (
          <>
            <h2 className="serif-title mb-6 text-4xl font-bold" style={{ color: "var(--text)" }}>
              Published posts
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
            {posts.length === 0 ? (
              <p className="paper-card rounded-lg p-6" style={{ color: "var(--text2)" }}>
                No published posts yet.
              </p>
            ) : null}
          </>
        ) : null}

        {activeTab === "qa" ? (
          <div className="space-y-5">
            {isAuthenticated && !isOwnProfile ? (
              <form onSubmit={askQuestion} className="paper-card rounded-lg p-5">
                <label className="block">
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    Ask a question
                  </span>
                  <textarea
                    value={question}
                    maxLength={300}
                    onChange={(event) => setQuestion(event.target.value)}
                    className="field mt-2 min-h-24 resize-y"
                    placeholder="Ask about their writing, process, or stories..."
                    required
                  />
                </label>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
                    {question.length}/300
                  </span>
                  <button type="submit" className="primary-btn px-5 py-2.5 text-sm">
                    Submit question
                  </button>
                </div>
              </form>
            ) : null}

            {qaItems.map((item) => (
              <article key={item._id} className="paper-card rounded-lg p-6">
                <blockquote className="border-l-4 border-[var(--accent)] pl-4 text-lg font-semibold leading-8 text-[#352a20]">
                  {item.question}
                </blockquote>
                <p className="mt-3 text-sm font-semibold text-[#8b7f72]">
                  Asked by {item.askedBy?.name ?? "Anonymous"}
                </p>
                <div className="mt-5 rounded-lg bg-[#ead9c7]/45 p-4 leading-7 text-[#6d6155]">
                  {item.answer}
                </div>
              </article>
            ))}

            {qaItems.length === 0 ? (
              <p className="paper-card rounded-lg p-6" style={{ color: "var(--text2)" }}>
                No public Q&A yet.
              </p>
            ) : null}
          </div>
        ) : null}

        {activeTab === "achievements" ? (
          <div>
            <h2 className="serif-title mb-6 text-4xl font-bold" style={{ color: "var(--text)" }}>
              Achievements
            </h2>
            <BadgeDisplay badges={profile.badges ?? []} size="lg" showAll />
          </div>
        ) : null}
      </section>
      <UserConnectionsModal
        isOpen={Boolean(connectionsType)}
        onClose={() => setConnectionsType("")}
        type={connectionsType}
        userId={profileUserId}
      />
    </main>
  );
}
