import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { navigate } from "../../lib/navigation";
import { useAuth } from "../../context/AuthContext";

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [kudos, setKudos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get("/api/my-kudos");
        if (!cancelled) setKudos(res.data.kudos ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load kudos wall",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <main className="editorial-shell py-12 text-[#6d6155]">Loading analytics...</main>;
  }

  return (
    <main className="editorial-shell py-12">
      <header className="border-b border-[#ded2c1] pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Author analytics
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold text-[#25211d]">
          Kudos wall
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#6d6155]">
          Short notes readers left on your stories and blogs.
        </p>
      </header>

      {error ? <p className="mt-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

      <section className="mt-8 columns-1 gap-5 md:columns-2 lg:columns-3">
        {kudos.map((item) => (
          <article
            key={item._id}
            className="paper-card mb-5 break-inside-avoid rounded-lg p-5"
          >
            <p className="serif-title text-2xl font-bold leading-snug text-[#25211d]">
              “{item.message}”
            </p>
            <p className="mt-4 text-sm font-semibold text-[#8b7f72]">
              {item.from?.name ?? "Reader"} ·{" "}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
            </p>
            {item.post?.title ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8f5f35]">
                {item.post.title}
              </p>
            ) : null}
          </article>
        ))}
      </section>

      {kudos.length === 0 && !error ? (
        <p className="paper-card mt-8 rounded-lg p-6 text-[#6d6155]">
          No kudos yet.
        </p>
      ) : null}
    </main>
  );
}
