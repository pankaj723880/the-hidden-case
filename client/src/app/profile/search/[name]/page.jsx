import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { AppLink, navigate } from "../../../../lib/navigation";
import { getMediaUrl } from "../../../../lib/media";

function normalize(value) {
  return String(value ?? "").replace(/_/g, " ").trim().toLowerCase();
}

export default function ProfileSearchPage({ name }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const query = decodeURIComponent(name ?? "");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get("/api/users/search", {
          params: { q: query.replace(/_/g, " ") },
        });
        const users = res.data.users ?? [];
        const exact = users.find((user) => normalize(user.name) === normalize(query));
        if (exact) {
          navigate(`/profile/${exact._id}`);
          return;
        }
        if (!cancelled) setMatches(users);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <main className="editorial-shell py-12">
      <section className="paper-card mx-auto max-w-2xl rounded-lg p-6">
        <h1 className="serif-title text-4xl font-bold text-[#25211d]">
          Mentioned user
        </h1>
        {isLoading ? (
          <p className="mt-4 text-[#6d6155]">Finding profile...</p>
        ) : matches.length > 0 ? (
          <div className="mt-5 space-y-3">
            {matches.map((user) => (
              <AppLink
                key={user._id}
                href={`/profile/${user._id}`}
                className="flex items-center gap-3 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4"
              >
                {user.avatar ? (
                  <img
                    src={getMediaUrl(user.avatar)}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ead9c7] font-bold text-[#8f5f35]">
                    {(user.name ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="font-bold text-[#25211d]">{user.name}</span>
              </AppLink>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[#6d6155]">No user found for @{query}.</p>
        )}
      </section>
    </main>
  );
}
