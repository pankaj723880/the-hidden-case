import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import { AppLink, navigate } from "../../../lib/navigation";
import { useAuth } from "../../../context/AuthContext";
import PostCard from "../../../components/PostCard";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

function daysRemaining(endDate) {
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}

export default function ChallengeDetailPage({ challengeId }) {
  const { isAuthenticated } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadChallenge = async () => {
    const res = await api.get(`/api/challenges/${challengeId}`);
    setChallenge(res.data.challenge);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get(`/api/challenges/${challengeId}`);
        if (!cancelled) setChallenge(res.data.challenge);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load challenge",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  useEffect(() => {
    if (!isAuthenticated || challenge?.status !== "active") return undefined;

    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get("/api/posts/mine");
        if (!cancelled) {
          setMyPosts(
            (res.data.posts ?? []).filter((post) =>
              ["approved", "published"].includes(post.status),
            ),
          );
        }
      } catch {
        if (!cancelled) setMyPosts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [challenge?.status, isAuthenticated]);

  const sortedEntries = useMemo(() => {
    const entries = [...(challenge?.entries ?? [])];
    if (challenge?.status === "ended") {
      entries.sort(
        (a, b) =>
          (b.challengeVotesCount ?? 0) - (a.challengeVotesCount ?? 0) ||
          new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0),
      );
    }
    return entries;
  }, [challenge]);

  const submitEntry = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!selectedPostId) return;

    setError("");
    setMessage("");
    try {
      await api.post(`/api/challenges/${challengeId}/enter`, {
        postId: selectedPostId,
      });
      setMessage("Entry submitted.");
      await loadChallenge();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to enter");
    }
  };

  const vote = async (postId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setError("");
    try {
      await api.post(`/api/challenges/${challengeId}/vote/${postId}`);
      await loadChallenge();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to vote");
    }
  };

  if (!challenge && !error) {
    return <main className="editorial-shell py-12 text-[#6d6155]">Loading challenge...</main>;
  }

  return (
    <main className="editorial-shell py-12">
      {error ? <p className="mb-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}
      {!challenge ? (
        <section className="paper-card rounded-lg p-6 text-[#6d6155]">
          Challenge not found.
        </section>
      ) : (
        <>
          <header className="border-b border-[#ded2c1] pb-8">
            <span className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8f5f35]">
              {challenge.status}
            </span>
            <h1 className="serif-title mt-4 text-5xl font-bold text-[#25211d]">
              {challenge.title}
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[#6d6155]">
              {challenge.description}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Entries", challenge.entryCount ?? challenge.entries?.length ?? 0],
                ["Days remaining", daysRemaining(challenge.endDate)],
                ["Ends", formatDate(challenge.endDate)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#ead9c7]/55 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f5f35]">
                    {label}
                  </p>
                  <p className="serif-title mt-1 text-3xl font-bold text-[#25211d]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </header>

          <blockquote className="paper-card mt-8 rounded-lg border-l-4 border-[var(--accent)] p-6 text-xl leading-9 text-[#352a20]">
            {challenge.prompt}
            <p className="mt-4 text-sm font-semibold text-[#8b7f72]">
              {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
            </p>
          </blockquote>

          {challenge.status === "active" ? (
            <section className="paper-card mt-8 rounded-lg p-6">
              <h2 className="serif-title text-3xl font-bold text-[#25211d]">
                Submit your entry
              </h2>
              {isAuthenticated ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedPostId}
                    onChange={(event) => setSelectedPostId(event.target.value)}
                    className="field"
                  >
                    <option value="">Choose one of your approved posts</option>
                    {myPosts.map((post) => (
                      <option key={post._id} value={post._id}>
                        {post.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={submitEntry}
                    disabled={!selectedPostId}
                    className="primary-btn px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Enter
                  </button>
                  <AppLink
                    href={`/write?challenge=${challenge._id}`}
                    className="secondary-btn px-5 py-3 text-center"
                  >
                    Write new
                  </AppLink>
                </div>
              ) : (
                <p className="mt-4 text-[#6d6155]">
                  <AppLink href="/login" className="font-bold text-[#2f4638]">
                    Login
                  </AppLink>{" "}
                  to submit an entry.
                </p>
              )}
              {message ? (
                <p className="mt-3 text-sm font-semibold text-[#5f7263]">{message}</p>
              ) : null}
            </section>
          ) : null}

          {["voting", "ended", "active"].includes(challenge.status) ? (
            <section className="mt-10">
              <h2 className="serif-title text-3xl font-bold text-[#25211d]">
                Entries
              </h2>
              <div className="mt-5 grid gap-6 md:grid-cols-3">
                {sortedEntries.map((entry, index) => (
                  <div key={entry._id} className="relative">
                    {challenge.status === "ended" && index < 3 ? (
                      <span className="absolute left-3 top-3 z-20 rounded-full bg-[#fffaf2] px-3 py-1 text-xl shadow">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                      </span>
                    ) : null}
                    <PostCard post={entry} />
                    {["voting", "ended"].includes(challenge.status) ? (
                      <div className="mt-2 flex items-center justify-between rounded-lg border border-[#ded2c1] bg-[#fffaf2]/75 px-4 py-3">
                        <span className="text-sm font-bold text-[#6d6155]">
                          {entry.challengeVotesCount ?? 0} votes
                        </span>
                        {challenge.status === "voting" ? (
                          <button
                            type="button"
                            onClick={() => vote(entry._id)}
                            className="rounded-full border px-4 py-2 text-sm font-bold transition"
                            style={{
                              borderColor: "var(--accent)",
                              backgroundColor: entry.hasVoted
                                ? "var(--accent)"
                                : "transparent",
                              color: entry.hasVoted ? "#fff" : "var(--accent)",
                            }}
                          >
                            {entry.hasVoted ? "♥ Voted" : "♡ Vote"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {sortedEntries.length === 0 ? (
                <p className="paper-card mt-5 rounded-lg p-6 text-[#6d6155]">
                  No entries yet.
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
