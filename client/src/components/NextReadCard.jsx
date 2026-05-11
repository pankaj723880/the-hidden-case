import { getMediaUrl } from "../lib/media";
"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AppLink } from "../lib/navigation";
import { useAuth } from "../context/AuthContext";
import MoodBadge from "./MoodBadge";

export default function NextReadCard({ currentPostId }) {
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get(`/api/posts/${currentPostId}/next-read`);
        if (!cancelled) setPost(res.data.post ?? null);
      } catch {
        if (!cancelled) setPost(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPostId]);

  useEffect(() => {
    if (!post?._id || !user?.id) return undefined;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await api.get(`/api/posts/${currentPostId}/next-read-reason`, {
            params: { userId: user.id },
          });
          if (!cancelled) setReason(res.data.reason ?? "");
        } catch {
          if (!cancelled) setReason("");
        }
      })();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [currentPostId, post?._id, user?.id]);

  if (!post) return null;

  return (
    <section
      className="card rounded-[4px] border-l-4 p-5"
      style={{ borderLeftColor: "var(--gold)" }}
    >
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
        🧭 Recommended for you
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]">
        {post.coverImage ? (
          <img
            src={getMediaUrl(post.coverImage)}
            alt=""
            className="h-40 w-full rounded-[4px] object-cover opacity-100 mix-blend-normal filter-none"
            style={{ filter: "none" }}
          />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-[4px] bg-[linear-gradient(135deg,#3d2e1a,#7a5a38)] text-4xl text-[#f5f0e8]">
            {post.type === "blog" ? "✒" : "✦"}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={post.type === "blog" ? "badge-blog" : "badge-story"}>
              {post.type}
            </span>
            <MoodBadge mood={post.mood} />
          </div>
          <h3 className="serif-title mt-3 text-2xl font-bold">
            {post.title}
          </h3>
          {reason ? (
            <p className="mt-2 text-sm italic opacity-100 transition-opacity duration-500" style={{ color: "var(--text2)" }}>
              {reason}
            </p>
          ) : null}
          <p className="mt-3 text-sm" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
            By {post.author?.name ?? "Unknown"} · {post.readTime ?? 1} min read
          </p>
          <AppLink href={`/post/${post._id}`} className="primary-btn mt-5 inline-block px-5 py-2.5 text-sm">
            Read next →
          </AppLink>
        </div>
      </div>
    </section>
  );
}
