import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AppLink } from "../../lib/navigation";
import { getMediaUrl } from "../../lib/media";

const BADGE = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

function Avatar({ user, size = "h-16 w-16" }) {
  return user.avatar ? (
    <img src={getMediaUrl(user.avatar)} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full text-xl font-bold text-white`} style={{ backgroundColor: "var(--accent)" }}>
      {(user.name ?? "U").slice(0, 1).toUpperCase()}
    </span>
  );
}

function PodiumCard({ user, rank }) {
  if (!user) return <div />;
  const height = rank === 1 ? "min-h-[18rem]" : "min-h-[14rem]";
  const border = rank === 1 ? "var(--accent)" : rank === 2 ? "#64748b" : "#b45309";

  return (
    <AppLink
      href={`/profile/${user._id}`}
      className={`paper-card flex ${height} flex-col items-center justify-center rounded-xl p-6 text-center transition hover:no-underline hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]`}
      style={{ border: `1px solid ${border}` }}
    >
      <span className="text-4xl">{BADGE[user.leaderboardBadge] ?? `#${rank}`}</span>
      <div className="mt-4">
        <Avatar user={user} size={rank === 1 ? "h-24 w-24" : "h-20 w-20"} />
      </div>
      <h2 className="serif-title mt-4 text-2xl font-bold">
        {user.name}
      </h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text3)" }}>
        {user.xp ?? 0} XP
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
        {user.postsThisMonth ?? 0} posts this month
      </p>
    </AppLink>
  );
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get("/api/leaderboard");
        if (!cancelled) setUsers(res.data.users ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load leaderboard",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const rankedUsers = [...users].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
  const topThree = rankedUsers.slice(0, 3);
  const podium = [topThree[1], topThree[0], topThree[2]];

  return (
    <main className="editorial-shell py-12">
      <header className="border-b pb-8 text-center" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--accent2)" }}>
          Author rankings
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold">
          XP LEADERBOARD
        </h1>
        <p className="mt-3 text-lg" style={{ color: "var(--text2)" }}>
          Ranked by total author XP
        </p>
      </header>

      {error ? <p className="mt-6 text-sm font-semibold" style={{ color: "var(--accent2)" }}>{error}</p> : null}

      <section className="mt-10 grid items-end gap-5 md:grid-cols-3">
        {podium.map((user, index) => (
          <PodiumCard
            key={user?._id ?? index}
            user={user}
            rank={index === 0 ? 2 : index === 1 ? 1 : 3}
          />
        ))}
      </section>

      <section className="paper-card mt-10 rounded-xl p-5">
        <h2 className="serif-title text-3xl font-bold">
          RANKED AUTHORS
        </h2>
        <div className="mt-5 space-y-3">
          {rankedUsers.slice(3).map((user, index) => (
            <AppLink
              key={user._id}
              href={`/profile/${user._id}`}
              className="flex items-center justify-between gap-4 rounded-lg border p-4 transition hover:no-underline hover:border-[var(--border2)]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg3)" }}
            >
              <div className="flex items-center gap-4">
                <span className="serif-title text-2xl font-bold" style={{ color: "var(--accent2)" }}>
                  #{index + 4}
                </span>
                <Avatar user={user} size="h-12 w-12" />
                <span className="font-semibold" style={{ color: "var(--ink)" }}>{user.name}</span>
              </div>
              <span className="font-semibold" style={{ color: "var(--text2)" }}>
                {user.xp ?? 0} XP
              </span>
            </AppLink>
          ))}
          {users.length <= 3 ? (
            <p className="rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg3)", color: "var(--text2)" }}>
              More ranked authors will appear as writers earn XP.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
