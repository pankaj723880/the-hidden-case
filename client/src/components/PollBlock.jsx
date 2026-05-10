import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function PollBlock({ pollId }) {
  const { isAuthenticated } = useAuth();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/api/polls/${pollId}`);
        if (!cancelled) setPoll(res.data.poll);
      } catch {
        if (!cancelled) setPoll(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pollId]);

  const submitVote = async () => {
    if (!isAuthenticated) {
      toast.error("Login to vote");
      return;
    }
    if (selectedOption === null || isVoting) return;

    setIsVoting(true);
    try {
      const res = await api.post(`/api/polls/${pollId}/vote`, {
        optionIndex: selectedOption,
      });
      setPoll(res.data.poll);
      toast.success("Vote recorded");
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to vote",
      );
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="paper-card my-10 rounded-lg p-6 text-[#6d6155]">
        Loading poll...
      </section>
    );
  }

  if (!poll) return null;

  const showResults = poll.userVoted;
  const totalVotes = poll.totalVotes ?? 0;

  return (
    <section className="paper-card my-10 rounded-lg p-6">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5f35]">
        Reader poll
      </p>
      <h2 className="serif-title mt-2 text-3xl font-bold text-[#25211d]">
        {poll.question}
      </h2>

      {showResults ? (
        <div className="mt-5 space-y-3">
          {poll.options.map((option, index) => {
            const percentage = totalVotes
              ? Math.round((option.count / totalVotes) * 100)
              : 0;
            return (
              <div key={`${option.text}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm font-bold text-[#352a20]">
                  <span>{option.text}</span>
                  <span>{percentage}%</span>
                </div>
                <div className="h-9 overflow-hidden rounded-full bg-[#ead9c7]">
                  <div
                    className="flex h-full items-center justify-end rounded-full bg-[var(--accent)] px-3 text-xs font-black text-white transition-all"
                    style={{ width: `${percentage}%`, minWidth: percentage > 0 ? "2.25rem" : "0" }}
                  >
                    {option.count}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="pt-2 text-sm font-semibold text-[#8b7f72]">
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"} total
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {poll.options.map((option, index) => (
            <button
              key={`${option.text}-${index}`}
              type="button"
              onClick={() => setSelectedOption(index)}
              className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left font-bold transition"
              style={{
                borderColor:
                  selectedOption === index ? "var(--accent)" : "var(--border)",
                backgroundColor:
                  selectedOption === index ? "rgba(122,79,45,0.12)" : "#fffaf2",
                color: "#352a20",
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border"
                style={{
                  borderColor: selectedOption === index ? "var(--accent)" : "#d8cab8",
                }}
              >
                {selectedOption === index ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                ) : null}
              </span>
              {option.text}
            </button>
          ))}

          <button
            type="button"
            onClick={submitVote}
            disabled={selectedOption === null || isVoting}
            className="primary-btn px-5 py-3 disabled:opacity-60"
          >
            {isVoting ? "Voting..." : "Vote"}
          </button>
        </div>
      )}
    </section>
  );
}
