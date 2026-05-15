import { memo } from "react";
import { AppLink } from "../lib/navigation";
import { useAuth } from "../context/AuthContext";
import BookmarkButton from "./BookmarkButton";
import MoodBadge from "./MoodBadge";
import { getLanguage } from "../lib/languages";
import { formatDate, formatNumber, formatReadTime } from "../lib/format";
import { API_URL } from "../lib/api";
import { getMediaUrl } from "../lib/media";

function hasBookmarked(bookmarks, postId) {
  return (bookmarks ?? []).some((id) => String(id?._id ?? id) === String(postId));
}

function authorLine(post) {
  const coAuthors = post.coAuthors ?? [];
  const authorName = post.author?.name ?? "Unknown";
  if (coAuthors.length === 0) return authorName;
  if (coAuthors.length === 1) return `${authorName} & ${coAuthors[0]?.name ?? "Co-author"}`;
  return `${authorName} & ${coAuthors.length} others`;
}

function categoryBadgeClass(type) {
  if (type === "blog") return "badge-blog";
  return "badge-story";
}

function PostCard({ post, onLike, onShare, sharedPostId }) {
  const { user } = useAuth();
  const authorId = post.author?._id ?? post.author?.id;
  const tags = post.tags ?? [];
  const warnings = post.contentWarnings ?? [];
  const typeClass = categoryBadgeClass(post.type);
  const trackTitleClick = () => {
    if (!post._titleVariant) return;
    const payload = JSON.stringify({ variant: post._titleVariant });
    const url = `${API_URL}/api/posts/${post._id}/title-click`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new window.Blob([payload], { type: "application/json" }));
    } else {
      window.fetch(url, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  };

  return (
    <article className="card group relative flex min-h-[28rem] flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-[3px] hover:border-[var(--border2)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="absolute right-3 top-3 z-10 rounded-md bg-[var(--bg2)]/80 shadow-sm backdrop-blur-sm">
        <BookmarkButton
          postId={post._id}
          initialBookmarked={hasBookmarked(user?.bookmarks, post._id)}
        />
      </div>
      {warnings.length > 0 ? (
        <div className="absolute left-3 top-3 z-10">
          <div
            className="group/warning relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d4a020]/50 bg-[var(--bg2)]/90 text-sm shadow-sm backdrop-blur-sm"
            title={warnings.join(", ")}
          >
            ⚠
            <div className="pointer-events-none absolute left-0 top-11 hidden w-56 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs font-semibold leading-5 text-[var(--text2)] shadow-lg group-hover/warning:block">
              {warnings.join(", ")}
            </div>
          </div>
        </div>
      ) : null}
      <AppLink href={`/post/${post._id}`} onClick={trackTitleClick} className="block">
        {post.coverImage ? (
          <img
            src={getMediaUrl(post.coverImage)}
            alt=""
            loading="lazy"
            decoding="async"
            className="card-img h-[180px] w-full object-cover opacity-100 mix-blend-normal filter-none"
            style={{ filter: "none" }}
          />
        ) : (
          <div className="card-img flex h-[180px] items-center justify-center" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a2020 50%, #3a1515 100%)" }}>
            <span
              className="text-5xl"
              style={{
                color: "var(--accent2)",
                fontFamily: "var(--font-bebas), sans-serif",
                textShadow: "0 0 30px rgba(192, 57, 43, 0.4)",
              }}
            >
              {post.type === "blog" ? "✒" : "✦"}
            </span>
          </div>
        )}
      </AppLink>
      <div className="flex flex-1 flex-col p-[1.1rem] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={typeClass}>
                {post.type}
              </span>
              <MoodBadge mood={post.mood} />
              {post.language && post.language !== "en" ? (
                <span className="rounded-md border px-2 py-0.5 text-[0.68rem]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                  {getLanguage(post.language).nativeName}
                </span>
              ) : null}
            </div>
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {formatNumber(post.likes?.length ?? 0)} likes
            </span>
          </div>
          <AppLink href={`/post/${post._id}`} onClick={trackTitleClick} className="hover:no-underline">
            <h2
              className="text-[1.15rem] font-bold leading-[1.35] tracking-wide transition-colors group-hover:text-[var(--accent2)]"
              style={{ color: "var(--ink)", fontFamily: "var(--font-bebas), sans-serif" }}
            >
              {post.title}
            </h2>
            <p
              className="mt-3 line-clamp-3 text-[0.82rem] leading-[1.7]"
              style={{ color: "var(--text2)" }}
            >
              {post.content}
            </p>
          </AppLink>
          {tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <AppLink
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-md border px-3 py-1 text-xs font-medium transition hover:bg-[var(--bg4)] hover:text-[var(--accent2)]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text3)",
                  }}
                >
                  #{tag}
                </AppLink>
              ))}
            </div>
          ) : null}
          <p
            className="mt-auto pt-6 text-[0.78rem]"
            style={{ color: "var(--text3)" }}
          >
            By{" "}
            {authorId ? (
              <AppLink href={`/profile/${authorId}`} style={{ color: "var(--text2)" }}>
                {authorLine(post)}
              </AppLink>
            ) : (
              authorLine(post)
            )}
            {post.createdAt
              ? ` · ${formatDate(post.createdAt)}`
              : ""}
            {` · ${formatReadTime(post.readTime ?? 1)}`}
          </p>
      </div>
      {onLike || onShare ? (
        <div
          className="grid grid-cols-3 border-t text-[0.78rem]"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg3)",
            color: "var(--text3)",
          }}
        >
          <button
            type="button"
            onClick={() => onLike?.(post._id)}
            className="px-3 py-3 transition hover:bg-[var(--bg4)] hover:text-[var(--accent2)]"
          >
            Like
          </button>
          <AppLink
            href={`/post/${post._id}#discussion`}
            className="px-3 py-3 text-center transition hover:bg-[var(--bg4)] hover:text-[var(--accent2)] hover:no-underline"
          >
            Comment
          </AppLink>
          <button
            type="button"
            onClick={() => onShare?.(post)}
            className="px-3 py-3 transition hover:bg-[var(--bg4)] hover:text-[var(--accent2)]"
          >
            {sharedPostId === post._id ? "Copied" : "Share"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default memo(PostCard);
