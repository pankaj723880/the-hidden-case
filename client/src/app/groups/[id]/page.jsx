import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { AppLink, navigate } from "../../../lib/navigation";
import { useAuth } from "../../../context/AuthContext";
import PostCard from "../../../components/PostCard";

export default function GroupDetailPage({ groupId }) {
  const { isAuthenticated } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [error, setError] = useState("");

  const loadGroup = async () => {
    const groupRes = await api.get(`/api/groups/${groupId}`);
    setGroup(groupRes.data.group);
    try {
      const postsRes = await api.get(`/api/groups/${groupId}/posts`);
      setPosts(postsRes.data.posts ?? []);
    } catch {
      setPosts(groupRes.data.group?.recentPosts ?? []);
    }
  };

  useEffect(() => {
    void loadGroup().catch((err) =>
      setError(err?.response?.data?.error || err?.message || "Failed to load group"),
    );
  }, [groupId]);

  const join = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      const res = await api.post(`/api/groups/${groupId}/join`);
      toast.success(res.data.requested ? "Join request sent" : "Joined group");
      await loadGroup();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to join");
    }
  };

  const leave = async () => {
    try {
      await api.post(`/api/groups/${groupId}/leave`);
      toast.success("Left group");
      await loadGroup();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to leave");
    }
  };

  const updateRequest = async (userId, action) => {
    try {
      await api.post(`/api/groups/${groupId}/${action}/${userId}`);
      toast.success(action === "approve" ? "Request approved" : "Request declined");
      await loadGroup();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update request");
    }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/api/groups/${groupId}/members/${userId}`);
      toast.success("Member removed");
      await loadGroup();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to remove member");
    }
  };

  if (!group && !error) {
    return <main className="editorial-shell py-12 text-[#6d6155]">Loading group...</main>;
  }

  return (
    <main className="editorial-shell py-12">
      {error ? <p className="mb-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}
      {!group ? (
        <section className="paper-card rounded-lg p-6">Group not found.</section>
      ) : (
        <>
          <header className="overflow-hidden rounded-lg border border-[#ded2c1] bg-[#fffaf2]">
            {group.coverImage ? (
              <img src={group.coverImage} alt="" className="h-52 w-full object-cover" />
            ) : (
              <div className="h-52 bg-[linear-gradient(135deg,#2f4638,var(--accent))]" />
            )}
            <div className="p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <span className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8f5f35]">
                    {group.isPrivate ? "Private" : "Public"}
                  </span>
                  <h1 className="serif-title mt-4 text-5xl font-bold text-[#25211d]">
                    {group.name}
                  </h1>
                  <p className="mt-3 max-w-3xl text-lg leading-8 text-[#6d6155]">
                    {group.description || "No description yet."}
                  </p>
                  <p className="mt-3 text-sm font-bold text-[#8b7f72]">
                    Owner: {group.owner?.name ?? "Unknown"} · {group.memberCount} members
                  </p>
                </div>
                {group.isMember ? (
                  group.isOwner ? (
                    <AppLink href="/write" className="primary-btn px-5 py-3 text-center">
                      Write for group
                    </AppLink>
                  ) : (
                    <button type="button" onClick={leave} className="secondary-btn px-5 py-3">
                      Leave Group
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={join}
                    disabled={group.hasRequested}
                    className="primary-btn px-5 py-3 disabled:opacity-60"
                  >
                    {group.hasRequested
                      ? "Requested"
                      : group.isPrivate
                        ? "Request to join"
                        : "Join Group"}
                  </button>
                )}
              </div>

              <div className="mt-6 flex items-center gap-2">
                {(group.members ?? []).slice(0, 8).map((member) => (
                  <span
                    key={member._id}
                    title={member.name}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#fffaf2] bg-[#ead9c7] text-sm font-bold text-[#8f5f35]"
                  >
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      (member.name ?? "U").slice(0, 1).toUpperCase()
                    )}
                  </span>
                ))}
                {(group.members?.length ?? 0) > 8 ? (
                  <span className="text-sm font-bold text-[#8b7f72]">
                    +{group.members.length - 8} more
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          <div className="mt-8 flex gap-2">
            {["posts", "about"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="rounded-full border px-4 py-2 text-sm font-bold capitalize"
                style={{
                  borderColor: activeTab === tab ? "var(--accent)" : "var(--border)",
                  backgroundColor: activeTab === tab ? "var(--accent)" : "transparent",
                  color: activeTab === tab ? "#fff" : "var(--text2)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "posts" ? (
            <section className="mt-6 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
              {posts.length === 0 ? (
                <p className="paper-card rounded-lg p-6 text-[#6d6155] md:col-span-3">
                  No group posts yet.
                </p>
              ) : null}
            </section>
          ) : null}

          {activeTab === "about" ? (
            <section className="paper-card mt-6 rounded-lg p-6">
              <h2 className="serif-title text-3xl font-bold text-[#25211d]">About</h2>
              <p className="mt-4 leading-8 text-[#6d6155]">
                {group.description || "No description yet."}
              </p>
              <p className="mt-4 text-sm font-semibold text-[#8b7f72]">
                Contact the owner: {group.owner?.name ?? "Unknown"}
              </p>

              {group.isOwner ? (
                <div className="mt-8">
                  <h3 className="serif-title text-2xl font-bold text-[#25211d]">
                    Join Requests
                  </h3>
                  <div className="mt-4 space-y-3">
                    {(group.joinRequests ?? []).map((request) => (
                      <div
                        key={request._id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4"
                      >
                        <span className="font-bold text-[#352a20]">{request.name}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateRequest(request._id, "approve")}
                            className="primary-btn px-3 py-2 text-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRequest(request._id, "decline")}
                            className="secondary-btn px-3 py-2 text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                    {(group.joinRequests ?? []).length === 0 ? (
                      <p className="text-sm text-[#8b7f72]">No pending requests.</p>
                    ) : null}
                  </div>

                  <h3 className="serif-title mt-8 text-2xl font-bold text-[#25211d]">
                    Members
                  </h3>
                  <div className="mt-4 space-y-2">
                    {(group.members ?? []).map((member) => (
                      <div key={member._id} className="flex items-center justify-between">
                        <span className="font-semibold text-[#352a20]">{member.name}</span>
                        {member._id !== group.owner?._id ? (
                          <button
                            type="button"
                            onClick={() => removeMember(member._id)}
                            className="text-sm font-bold text-[#9f3d2e]"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
