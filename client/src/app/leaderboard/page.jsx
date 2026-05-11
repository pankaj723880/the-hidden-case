import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AppLink } from "../../lib/navigation";

const BADGE = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

function Avatar({ user, size = "h-16 w-16" }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-[#ead9c7] font-serif text-xl font-bold text-[#8f5f35]`}>
      {(user.name ?? "U").slice(0, 1).toUpperCase()}
    </span>
  );
}

function PodiumCard({ user, rank }) {
  if (!user) return <div />;
  const height = rank === 1 ? "min-h-[18rem]" : "min-h-[14rem]";
  const border = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : "#b45309";

  return (
    <AppLink
      href={`/profile/${user._id}`}
      className={`paper-card flex ${height} flex-col items-center justify-center rounded-lg p-6 text-center`}
      style={{ border: `1px solid ${border}` }}
    >
      <span className="text-4xl">{BADGE[user.leaderboardBadge] ?? `#${rank}`}</span>
      <div className="mt-4">
        <Avatar user={user} size={rank === 1 ? "h-24 w-24" : "h-20 w-20"} />
      </div>
      <h2 className="serif-title mt-4 text-2xl font-bold text-[#25211d]">
        {user.name}
      </h2>
      <p className="mt-1 text-sm font-bold text-[#8b7f72]">
        {user.xp ?? 0} XP
      </p>
      <p className="mt-1 text-xs text-[#8b7f72]">
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
      <header className="border-b border-[#ded2c1] pb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Author rankings
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold text-[#25211d]">
          XP Leaderboard
        </h1>
        <p className="mt-3 text-lg text-[#6d6155]">
          Ranked by total author XP
        </p>
      </header>

      {error ? <p className="mt-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

      <section className="mt-10 grid items-end gap-5 md:grid-cols-3">
        {podium.map((user, index) => (
          <PodiumCard
            key={user?._id ?? index}
            user={user}
            rank={index === 0 ? 2 : index === 1 ? 1 : 3}
          />
        ))}
      </section>

      <section className="paper-card mt-10 rounded-lg p-5">
        <h2 className="serif-title text-3xl font-bold text-[#25211d]">
          Ranked Authors
        </h2>
        <div className="mt-5 space-y-3">
          {rankedUsers.slice(3).map((user, index) => (
            <AppLink
              key={user._id}
              href={`/profile/${user._id}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4"
            >
              <div className="flex items-center gap-4">
                <span className="serif-title text-2xl font-bold text-[#8f5f35]">
                  #{index + 4}
                </span>
                <Avatar user={user} size="h-12 w-12" />
                <span className="font-bold text-[#25211d]">{user.name}</span>
              </div>
              <span className="font-bold text-[#6d6155]">
                {user.xp ?? 0} XP
              </span>
            </AppLink>
          ))}
          {users.length <= 3 ? (
            <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4 text-[#6d6155]">
              More ranked authors will appear as writers earn XP.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
