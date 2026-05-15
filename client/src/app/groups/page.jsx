import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { AppLink, navigate } from "../../lib/navigation";
import { useAuth } from "../../context/AuthContext";

export default function GroupsPage() {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [error, setError] = useState("");

  const loadGroups = async () => {
    const res = await api.get("/api/groups");
    setGroups(res.data.groups ?? []);
  };

  useEffect(() => {
    void loadGroups().catch((err) =>
      setError(err?.response?.data?.error || err?.message || "Failed to load groups"),
    );
  }, []);

  const joinGroup = async (group) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const res = await api.post(`/api/groups/${group._id}/join`);
      toast.success(res.data.requested ? "Join request sent" : "Joined group");
      await loadGroups();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to join");
    }
  };

  const createGroup = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      await api.post("/api/groups", form);
      setForm({ name: "", description: "", isPrivate: false });
      toast.success("Group created");
      await loadGroups();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create group");
    }
  };

  return (
    <main className="editorial-shell py-12">
      <header className="border-b pb-8" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--accent2)" }}>
          Writing circles
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold">
          GROUPS
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8" style={{ color: "var(--text2)" }}>
          Create clubs, join writing circles, and publish stories to a shared
          community space.
        </p>
      </header>

      <section className="paper-card mt-8 rounded-xl p-6">
        <h2 className="serif-title text-3xl font-bold">
          CREATE A GROUP
        </h2>
        <form onSubmit={createGroup} className="mt-5 grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            className="field"
            placeholder="Group name"
            required
          />
          <input
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="field"
            placeholder="Description"
          />
          <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isPrivate: event.target.checked,
                }))
              }
            />
            Private
          </label>
          <button type="submit" className="primary-btn px-5 py-3 md:col-span-3">
            Create Group
          </button>
        </form>
      </section>

      {error ? <p className="mt-6 text-sm font-semibold" style={{ color: "var(--accent2)" }}>{error}</p> : null}

      <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <article key={group._id} className="paper-card rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-md px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: "rgba(192,57,43,0.15)", color: "var(--accent2)" }}>
                {group.isPrivate ? "Private" : "Public"}
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
                {group.memberCount ?? 0} members
              </span>
            </div>
            <h2 className="serif-title mt-4 text-2xl font-bold">
              {group.name}
            </h2>
            <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color: "var(--text2)" }}>
              {group.description || "No description yet."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <AppLink
                href={`/groups/${group._id}`}
                className="secondary-btn px-4 py-2 text-sm"
              >
                View Group
              </AppLink>
              {!group.isMember ? (
                <button
                  type="button"
                  onClick={() => joinGroup(group)}
                  disabled={group.hasRequested}
                  className="primary-btn px-4 py-2 text-sm disabled:opacity-60"
                >
                  {group.hasRequested
                    ? "Requested"
                    : group.isPrivate
                      ? "Request to join"
                      : "Join"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
