"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function BookmarkButton({ postId, initialBookmarked = false }) {
  const { isAuthenticated, setProfileUser, user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);

  useEffect(() => {
    setIsBookmarked(initialBookmarked);
  }, [initialBookmarked, postId]);

  const updateUserBookmarks = (bookmarked) => {
    setProfileUser({
      bookmarks: bookmarked
        ? [...(user?.bookmarks ?? []), postId]
        : (user?.bookmarks ?? []).filter(
            (id) => String(id?._id ?? id) !== String(postId),
          ),
    });
  };

  const handleToggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Login to save posts");
      return;
    }

    const previous = isBookmarked;
    const next = !isBookmarked;
    setIsBookmarked(next);
    updateUserBookmarks(next);

    try {
      const res = await api.post(`/api/users/me/bookmarks/${postId}`);
      const bookmarked = Boolean(res.data.bookmarked);
      setIsBookmarked(bookmarked);
      updateUserBookmarks(bookmarked);
      toast.success(
        bookmarked ? "Saved to reading list" : "Removed from reading list",
      );
    } catch (err) {
      setIsBookmarked(previous);
      updateUserBookmarks(previous);
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to update bookmark",
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isBookmarked ? "Remove from reading list" : "Save to reading list"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] transition hover:bg-[var(--bg3)]"
      style={{ color: isBookmarked ? "var(--gold)" : "var(--text3)" }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
