import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AppLink } from "../../lib/navigation";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

function ChallengeCard({ challenge }) {
  return (
    <article className="paper-card rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: "rgba(192,57,43,0.15)", color: "var(--accent2)" }}>
          {challenge.status}
        </span>
        <span className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
          {challenge.entryCount ?? 0} entries
        </span>
      </div>
      <h3 className="serif-title mt-4 text-2xl font-bold">
        {challenge.title}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color: "var(--text2)" }}>
        {challenge.prompt}
      </p>
      <p className="mt-4 text-xs font-semibold" style={{ color: "var(--text3)" }}>
        {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
      </p>
      <AppLink
        href={`/challenges/${challenge._id}`}
        className="secondary-btn mt-5 inline-flex px-4 py-2 text-sm"
      >
        View Challenge
      </AppLink>
    </article>
  );
}

function ChallengeSection({ title, challenges }) {
  if (challenges.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="serif-title text-3xl font-bold">{title}</h2>
      <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => (
          <ChallengeCard key={challenge._id} challenge={challenge} />
        ))}
      </div>
    </section>
  );
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get("/api/challenges");
        if (!cancelled) setChallenges(res.data.challenges ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load challenges",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const active = challenges.filter((challenge) => challenge.status === "active");
  const upcoming = challenges.filter((challenge) => challenge.status === "upcoming");
  const past = challenges.filter((challenge) =>
    ["voting", "ended"].includes(challenge.status),
  );

  return (
    <main className="editorial-shell py-12">
      <header className="border-b pb-8" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--accent2)" }}>
          Community prompts
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold">
          WRITING CHALLENGES
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8" style={{ color: "var(--text2)" }}>
          Enter themed prompts, read community submissions, and vote for the
          strongest pieces.
        </p>
      </header>

      {error ? <p className="mt-6 text-sm font-semibold" style={{ color: "var(--accent2)" }}>{error}</p> : null}

      <ChallengeSection title="ACTIVE CHALLENGES" challenges={active} />
      <ChallengeSection title="UPCOMING" challenges={upcoming} />
      <ChallengeSection title="PAST" challenges={past} />

      {challenges.length === 0 && !error ? (
        <p className="paper-card mt-10 rounded-xl p-6" style={{ color: "var(--text2)" }}>
          No writing challenges yet.
        </p>
      ) : null}
    </main>
  );
}
