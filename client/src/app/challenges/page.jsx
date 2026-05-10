import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AppLink } from "../../lib/navigation";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

function ChallengeCard({ challenge }) {
  return (
    <article className="paper-card rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8f5f35]">
          {challenge.status}
        </span>
        <span className="text-xs font-bold text-[#8b7f72]">
          {challenge.entryCount ?? 0} entries
        </span>
      </div>
      <h3 className="serif-title mt-4 text-2xl font-bold text-[#25211d]">
        {challenge.title}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#6d6155]">
        {challenge.prompt}
      </p>
      <p className="mt-4 text-xs font-semibold text-[#8b7f72]">
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
      <h2 className="serif-title text-3xl font-bold text-[#25211d]">{title}</h2>
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
      <header className="border-b border-[#ded2c1] pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Community prompts
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold text-[#25211d]">
          Writing Challenges
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#6d6155]">
          Enter themed prompts, read community submissions, and vote for the
          strongest pieces.
        </p>
      </header>

      {error ? <p className="mt-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

      <ChallengeSection title="Active Challenges" challenges={active} />
      <ChallengeSection title="Upcoming" challenges={upcoming} />
      <ChallengeSection title="Past" challenges={past} />

      {challenges.length === 0 && !error ? (
        <p className="paper-card mt-10 rounded-lg p-6 text-[#6d6155]">
          No writing challenges yet.
        </p>
      ) : null}
    </main>
  );
}
