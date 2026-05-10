import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

function normalizeTag(tag) {
  return String(tag ?? "").trim().replace(/^#+/, "").toLowerCase();
}

export default function FollowTagButton({ tag, initialFollowing = false }) {
  const normalizedTag = normalizeTag(tag);
  const { isAuthenticated, setProfileUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  const toggleFollow = async () => {
    if (!isAuthenticated) {
      toast.error("Login to follow tags");
      return;
    }
    if (!normalizedTag || isSaving) return;

    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    setIsSaving(true);

    try {
      const res = await api.post("/api/users/me/follow-tag", {
        tag: normalizedTag,
      });
      setIsFollowing(Boolean(res.data.following));
      setProfileUser({ followedTags: res.data.followedTags ?? [] });
      toast.success(
        res.data.following
          ? `Following #${normalizedTag}`
          : `Unfollowed #${normalizedTag}`,
      );
    } catch (err) {
      setIsFollowing(isFollowing);
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to update tag",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={isSaving}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition disabled:opacity-60"
      style={{
        borderColor: isFollowing ? "var(--accent)" : "var(--border)",
        backgroundColor: isFollowing ? "var(--accent)" : "transparent",
        color: isFollowing ? "#fff" : "var(--text2)",
      }}
    >
      <span>{isFollowing ? "✓" : "+"}</span>
      <span>{isFollowing ? "Following" : "Follow"} #{normalizedTag}</span>
    </button>
  );
}
