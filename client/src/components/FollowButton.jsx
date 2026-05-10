"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function FollowButton({
  authorId,
  initialFollowing = false,
  initialCount = 0,
  onChange,
}) {
  const { isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setIsFollowing(initialFollowing);
    setCount(initialCount);
  }, [authorId, initialFollowing, initialCount]);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error("Login to follow authors");
      return;
    }

    const previousFollowing = isFollowing;
    const previousCount = count;
    const nextFollowing = !isFollowing;

    setIsFollowing(nextFollowing);
    setCount((current) => Math.max(0, current + (nextFollowing ? 1 : -1)));
    onChange?.({
      following: nextFollowing,
      followersCount: Math.max(0, count + (nextFollowing ? 1 : -1)),
    });

    try {
      const res = await api.post(`/api/users/${authorId}/follow`);
      setIsFollowing(Boolean(res.data.following));
      setCount(res.data.followersCount ?? previousCount);
      onChange?.({
        following: Boolean(res.data.following),
        followersCount: res.data.followersCount ?? previousCount,
      });
    } catch (err) {
      setIsFollowing(previousFollowing);
      setCount(previousCount);
      onChange?.({
        following: previousFollowing,
        followersCount: previousCount,
      });
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to update follow",
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleFollow}
      className="rounded-[3px] px-4 py-2 text-sm font-bold transition"
      style={{
        border: isFollowing ? "1px solid var(--accent3)" : "none",
        backgroundColor: isFollowing ? "var(--bg3)" : "var(--accent)",
        color: isFollowing ? "var(--accent)" : "#faf7f2",
      }}
    >
      {isFollowing ? "Following" : "Follow"} · {count}
    </button>
  );
}
