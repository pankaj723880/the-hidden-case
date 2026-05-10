import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { API_URL, api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { AppLink } from "../../../lib/navigation";
import ReadingProgress from "../../../components/ReadingProgress";
import TableOfContents from "../../../components/TableOfContents";
import FontSizeControl from "../../../components/FontSizeControl";
import FollowButton from "../../../components/FollowButton";
import CommentSection from "../../../components/CommentSection";
import BookmarkButton from "../../../components/BookmarkButton";
import ShareButtons from "../../../components/ShareButtons";
import PostCard from "../../../components/PostCard";
import ReportButton from "../../../components/ReportButton";
import KudosForm from "../../../components/KudosForm";
import PollBlock from "../../../components/PollBlock";
import ContentWarningGate from "../../../components/ContentWarningGate";
import NextReadCard from "../../../components/NextReadCard";
import { getLanguage, isRTL } from "../../../lib/languages";
import { formatDate, formatReadTime } from "../../../lib/format";

function includesUserId(list, userId) {
  return (list ?? []).some((item) => String(item?._id ?? item) === String(userId));
}

function linkMentions(content) {
  return String(content ?? "").replace(
    /@(\w+)/g,
    '<a href="/profile/search/$1" style="color:var(--accent3);font-weight:700">@$1</a>',
  );
}

function authorLine(post) {
  const coAuthors = post?.coAuthors ?? [];
  const authorName = post?.author?.name ?? "Unknown";
  if (coAuthors.length === 0) return authorName;
  if (coAuthors.length === 1) return `${authorName} & ${coAuthors[0]?.name ?? "Co-author"}`;
  return `${authorName} & ${coAuthors.length} others`;
}

function SeriesNavigator({ post, postId }) {
  const series = post.series;
  const posts = series?.posts ?? [];
  if (!series?._id || posts.length === 0) return null;

  const currentIndex = posts.findIndex((item) => String(item._id) === String(postId));
  if (currentIndex === -1) return null;

  const previousPost = posts[currentIndex - 1];
  const nextPost = posts[currentIndex + 1];

  return (
    <section className="card mt-10 rounded-[4px] p-6">
      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
        Series
      </p>
      <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <AppLink
            href={`/series/${series._id}`}
            className="serif-title text-2xl font-bold"
          >
            {series.title}
          </AppLink>
          <p className="mt-1 text-sm" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
            Part {currentIndex + 1} of {posts.length}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {previousPost ? (
            <AppLink
              href={`/post/${previousPost._id}`}
              className="secondary-btn px-4 py-2 text-center text-sm"
            >
              Previous
            </AppLink>
          ) : null}
          {nextPost ? (
            <AppLink
              href={`/post/${nextPost._id}`}
              className="primary-btn px-4 py-2 text-center text-sm"
            >
              Next
            </AppLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function PostPage({ postId }) {
  const { isAuthenticated, user, accessToken } = useAuth();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [continuations, setContinuations] = useState([]);
  const [expandedContinuationId, setExpandedContinuationId] = useState("");
  const [showContinuationForm, setShowContinuationForm] = useState(false);
  const [continuationTitle, setContinuationTitle] = useState("");
  const [continuationContent, setContinuationContent] = useState("");
  const [kudos, setKudos] = useState([]);
  const [poll, setPoll] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [translatedContent, setTranslatedContent] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showingTranslation, setShowingTranslation] = useState(false);
  const contentTopRef = useRef(null);
  const chapters = post?.hasChapters ? post.chapters ?? [] : [];
  const activeChapter = chapters[currentChapter] ?? null;
  const activeContent = post?.hasChapters
    ? activeChapter?.content ?? ""
    : post?.content ?? "";
  let headingCounter = 0;
  const contentWithIds =
    linkMentions(
      showingTranslation && translatedContent
        ? `<p>${translatedContent.split("\n\n").join("</p><p>")}</p>`
        : activeContent,
    ).replace(/<(h[23])([^>]*)>/gi, (_match, tag) => {
      return `<${tag} id="heading-${headingCounter++}">`;
    }) ?? "";
  const authorId = post?.author?._id ?? post?.author?.id;
  const isOwnPost = String(user?.id) === String(authorId);
  const canSubmitContinuation =
    isAuthenticated && !isOwnPost && post?.type === "story";
  const postLanguage = post?.language ?? "en";

  useEffect(() => {
    const savedSize = parseInt(localStorage.getItem("thc-font-size"), 10);
    if ([14, 16, 18, 20, 22].includes(savedSize)) setFontSize(savedSize);

    const handleFontSizeChange = (event) => {
      if (event.detail?.size) setFontSize(event.detail.size);
    };

    window.addEventListener("fontSizeChange", handleFontSizeChange);

    return () => {
      window.removeEventListener("fontSizeChange", handleFontSizeChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const postRes = await api.get(`/api/posts/${postId}`);

        if (!cancelled) {
          const loadedPost = postRes.data.post;
          setPost(loadedPost);
          if (loadedPost?.hasChapters && loadedPost.chapters?.length) {
            const savedChapter = parseInt(
              window.localStorage.getItem(`chapter_${postId}`) ?? "0",
              10,
            );
            const nextChapter =
              Number.isInteger(savedChapter) &&
              savedChapter >= 0 &&
              savedChapter < loadedPost.chapters.length
                ? savedChapter
                : 0;
            setCurrentChapter(nextChapter);
          } else {
            setCurrentChapter(0);
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load post",
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    if (!post?.hasChapters) return;
    window.localStorage.setItem(`chapter_${postId}`, String(currentChapter));
    contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentChapter, post?.hasChapters, postId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [continuationsRes, kudosRes, pollRes] = await Promise.all([
          api.get(`/api/posts/${postId}/continuations`),
          api.get(`/api/posts/${postId}/kudos`),
          api.get(`/api/posts/${postId}/poll`),
        ]);
        if (!cancelled) {
          setContinuations(continuationsRes.data.continuations ?? []);
          setKudos(kudosRes.data.kudos ?? []);
          setPoll(pollRes.data.poll ?? null);
        }
      } catch {
        if (!cancelled) {
          setContinuations([]);
          setKudos([]);
          setPoll(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get(`/api/posts/${postId}/related`);
        if (!cancelled) setRelatedPosts(res.data.posts ?? []);
      } catch {
        if (!cancelled) setRelatedPosts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    const sessionKey = `thc-session-${postId}`;
    const existing = window.sessionStorage.getItem(sessionKey);
    const sessionId = existing || Math.random().toString(36).slice(2);
    window.sessionStorage.setItem(sessionKey, sessionId);

    void api.post(`/api/posts/${postId}/track-source`, {
      referrer: document.referrer,
      sessionId,
    }).catch(() => {});

    const sent = new Set();
    let lastSentAt = 0;
    const milestones = [10, 25, 50, 75, 90, 100];

    const sendDepth = (depth) => {
      const payload = JSON.stringify({ depth, sessionId });
      const url = `${API_URL}/api/posts/${postId}/read-depth`;
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

    const onScroll = () => {
      const now = Date.now();
      if (now - lastSentAt < 5000) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const current = Math.round((window.scrollY / max) * 100);
      const milestone = milestones.find((item) => current >= item && !sent.has(item));
      if (!milestone) return;
      sent.add(milestone);
      lastSentAt = now;
      sendDepth(milestone);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [postId]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("Login to like posts");
      return;
    }

    try {
      const res = await api.post(`/api/posts/${postId}/like`);
      setPost((current) =>
        current
          ? { ...current, likes: Array.from({ length: res.data.likesCount ?? 0 }) }
          : current,
      );
      toast.success("Liked ❤️");
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update like",
      );
    }
  };

  const downloadPdf = async () => {
    if (!post?._id || !accessToken) return;

    setIsDownloadingPdf(true);
    try {
      const response = await window.fetch(
        `${api.defaults.baseURL}/api/posts/${post._id}/export-pdf`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        let message = "Failed to download PDF";
        try {
          const data = await response.json();
          message = data?.error || message;
        } catch {
          // Keep the generic message when the server did not return JSON.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${String(post.title ?? "post")
        .replace(/[<>:"/\\|?*]/g, "")
        .trim() || "post"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.error(err?.message || "Failed to download PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const translateCurrentPost = async () => {
    if (!isAuthenticated) {
      toast.error("Login to translate posts");
      return;
    }
    const targetLanguage = navigator.language.slice(0, 2);
    setIsTranslating(true);
    try {
      const res = await api.post(`/api/posts/${postId}/translate`, { targetLanguage });
      setTranslatedContent(res.data.translatedContent ?? "");
      setShowingTranslation(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to translate");
    } finally {
      setIsTranslating(false);
    }
  };

  const submitContinuation = async (event) => {
    event.preventDefault();
    const title = continuationTitle.trim();
    const content = continuationContent.trim();
    if (!title || !content) return;

    try {
      await api.post(`/api/posts/${postId}/continuations`, { title, content });
      setContinuationTitle("");
      setContinuationContent("");
      setShowContinuationForm(false);
      toast.success("Submitted for author review!");
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to submit continuation",
      );
    }
  };

  if (isLoading) {
    return <main className="editorial-shell py-12" style={{ color: "var(--text2)" }}>Loading post...</main>;
  }

  const postUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <ReadingProgress />
      <main className="post-detail mx-auto max-w-[720px] px-6 py-10">
        {error ? <p className="mb-6 text-sm font-semibold text-[var(--red)]">{error}</p> : null}
        {!post ? (
          <div className="card rounded-[4px] p-6" style={{ color: "var(--text2)" }}>
            This post is not available.
          </div>
        ) : (
          <>
          <header className="mb-8 text-center">
            <span className={post.type === "blog" ? "badge-blog" : "badge-story"}>
              {post.type}
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl text-[1.6rem] font-semibold italic leading-[1.3] sm:text-[2.4rem]" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
              {post.title}
            </h1>
            {post.hasChapters && activeChapter?.title ? (
              <p className="serif-title mt-3 text-2xl font-bold" style={{ color: "var(--text2)" }}>
                {activeChapter.title}
              </p>
            ) : null}
            {post.tags?.length > 0 ? (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {post.tags.map((tag) => (
                  <AppLink
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="rounded-[3px] border px-3 py-1 text-xs font-medium transition hover:bg-[var(--bg3)]"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--accent)",
                      fontFamily: "var(--font-garamond), Georgia, serif",
                    }}
                  >
                    #{tag}
                  </AppLink>
                ))}
              </div>
            ) : null}
            <p className="mt-4 text-[0.82rem]" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
              By{" "}
              {authorId ? (
                <AppLink href={`/profile/${authorId}`} style={{ color: "var(--accent)" }}>
                  {authorLine(post)}
                </AppLink>
              ) : (
                <span style={{ color: "var(--accent)" }}>
                  {authorLine(post)}
                </span>
              )}
              {post.createdAt
                ? ` · ${formatDate(post.createdAt)}`
                : ""}
              {` · ${formatReadTime(post.readTime ?? 1)}`}
              {` · Written in ${getLanguage(postLanguage).nativeName}`}
            </p>
            {postLanguage !== "en" ? (
              <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-3 rounded-[4px] border p-3 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg2)", color: "var(--text2)" }}>
                <span>This post is in {getLanguage(postLanguage).nativeName}.</span>
                <button type="button" onClick={translateCurrentPost} disabled={isTranslating} className="secondary-btn px-3 py-1.5 text-xs">
                  {isTranslating ? "Translating..." : "Translate"}
                </button>
                {showingTranslation ? (
                  <button type="button" onClick={() => setShowingTranslation(false)} className="secondary-btn px-3 py-1.5 text-xs">
                    Show original
                  </button>
                ) : null}
              </div>
            ) : null}
            {authorId && !isOwnPost ? (
              <div className="mt-4 flex justify-center">
                <FollowButton
                  authorId={authorId}
                  initialFollowing={includesUserId(post.author?.followers, user?.id)}
                  initialCount={post.author?.followers?.length ?? 0}
                />
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-[4px] border p-3" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={handleLike}
                disabled={!isAuthenticated}
                className="secondary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Like ({post.likes?.length ?? 0})
              </button>
              <a href="#discussion" className="secondary-btn px-4 py-2 text-sm">
                Comment
              </a>
              {isOwnPost ? (
                <AppLink
                  href={`/write?edit=${post._id}`}
                  className="secondary-btn px-4 py-2 text-sm"
                >
                  Edit
                </AppLink>
              ) : null}
              {isOwnPost ? (
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={isDownloadingPdf}
                  className="secondary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
                </button>
              ) : null}
              <ShareButtons postTitle={post.title} postUrl={postUrl} />
              <ReportButton contentType="post" contentId={post._id} />
              <BookmarkButton
                postId={post._id}
                initialBookmarked={includesUserId(user?.bookmarks, post._id)}
              />
              <FontSizeControl />
            </div>
            <KudosForm
              postId={post._id}
              authorId={authorId}
              onSuccess={(newKudos) =>
                setKudos((current) => [newKudos, ...current])
              }
            />
            {kudos.length > 0 ? (
              <div className="mx-auto mt-5 max-h-[180px] max-w-3xl space-y-3 overflow-y-auto rounded-[4px] border p-3 text-left" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg2) 70%, transparent)" }}>
                {kudos.map((item) => (
                  <div
                    key={item._id}
                    className="flex gap-3 rounded-[4px] bg-[var(--bg2)] p-3"
                  >
                    {item.from?.avatar ? (
                      <img
                        src={item.from.avatar}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] font-bold text-[var(--accent)]">
                        {(item.from?.name ?? "U").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                        {item.from?.name ?? "Reader"}
                      </p>
                      <p className="text-sm leading-6" style={{ color: "var(--text2)" }}>
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </header>

          <ContentWarningGate postId={post._id} warnings={post.contentWarnings}>
          <div className="literary-divider">✦</div>
          <div ref={contentTopRef} />
          {post.hasChapters && chapters.length > 0 ? (
            <nav className="card mb-8 rounded-[4px] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                  Chapter {currentChapter + 1} of {chapters.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentChapter((chapter) => Math.max(0, chapter - 1))
                    }
                    disabled={currentChapter === 0}
                    className="secondary-btn px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <select
                    value={currentChapter}
                    onChange={(event) => setCurrentChapter(Number(event.target.value))}
                    className="field min-w-[220px] py-2 text-sm"
                  >
                    {chapters.map((chapter, index) => (
                      <option key={index} value={index}>
                        {chapter.title || `Chapter ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentChapter((chapter) =>
                        Math.min(chapters.length - 1, chapter + 1),
                      )
                    }
                    disabled={currentChapter === chapters.length - 1}
                    className="primary-btn px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {chapters.map((chapter, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentChapter(index)}
                    className="rounded-full border px-3 py-1 text-xs font-bold"
                    style={{
                      borderColor:
                        currentChapter === index ? "var(--accent)" : "var(--border)",
                      backgroundColor:
                        currentChapter === index ? "var(--accent)" : "transparent",
                      color: currentChapter === index ? "#faf7f2" : "var(--text2)",
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </nav>
          ) : null}
          <article>
            {post.coverImage ? (
              <img
                src={post.coverImage}
                alt=""
                className="mb-8 max-h-[620px] w-full rounded-[4px] border object-contain opacity-100 mix-blend-normal filter-none"
                style={{ filter: "none", borderColor: "var(--border)", boxShadow: "0 4px 20px rgba(44,36,22,0.15)" }}
              />
            ) : null}
            {post.videoUrl ? (
              <video
                src={post.videoUrl}
                controls
                className="mb-8 w-full rounded-[4px] border bg-[var(--ink)]"
                style={{ borderColor: "var(--border)" }}
              />
            ) : null}
            <div
              className="post-content whitespace-pre-wrap"
              dir={isRTL(postLanguage) ? "rtl" : "ltr"}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: "1.9",
                fontFamily: isRTL(postLanguage)
                  ? "Amiri, 'Scheherazade New', var(--font-lora), Georgia, serif"
                  : undefined,
              }}
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />
          </article>

          {poll?._id ? <PollBlock pollId={poll._id} /> : null}

          <CommentSection postId={postId} />
          <section className="mt-14 pt-10">
            <div className="literary-divider">✦</div>
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="serif-title text-3xl font-bold">
                  Continuations
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
                  Reader-submitted chapters approved by the original author.
                </p>
              </div>
              {canSubmitContinuation ? (
                <button
                  type="button"
                  onClick={() => setShowContinuationForm((current) => !current)}
                  className="primary-btn px-5 py-2.5 text-sm"
                >
                  Write a continuation
                </button>
              ) : null}
            </div>

            {showContinuationForm ? (
              <form
                onSubmit={submitContinuation}
                className="card mb-6 rounded-[4px] p-5"
              >
                <label className="block">
                  <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>Title</span>
                  <input
                    value={continuationTitle}
                    onChange={(event) => setContinuationTitle(event.target.value)}
                    className="field mt-2"
                    placeholder="Chapter title"
                    required
                  />
                </label>
                <label className="mt-4 block">
                  <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>Content</span>
                  <textarea
                    value={continuationContent}
                    onChange={(event) => setContinuationContent(event.target.value)}
                    className="field mt-2 min-h-56 resize-y leading-7"
                    placeholder="Continue the story..."
                    required
                  />
                </label>
                <button type="submit" className="primary-btn mt-4 px-5 py-2.5 text-sm">
                  Submit for review
                </button>
              </form>
            ) : null}

            <div className="space-y-4">
              {continuations.map((continuation) => {
                const isExpanded = expandedContinuationId === continuation._id;
                return (
                  <article
                    key={continuation._id}
                    className="card rounded-[4px] p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <span className="badge-story">
                          {continuation.type === "official" ? "Official" : "Fan"}
                        </span>
                        <h3 className="serif-title mt-3 text-2xl font-bold">
                          {continuation.title}
                        </h3>
                        <p className="mt-1 text-sm" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>
                          By {continuation.author?.name ?? "Unknown"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedContinuationId((current) =>
                            current === continuation._id ? "" : continuation._id,
                          )
                        }
                        className="secondary-btn px-4 py-2 text-sm"
                      >
                        {isExpanded ? "Hide" : "Read"}
                      </button>
                    </div>
                    <p className="mt-4 leading-7" style={{ color: "var(--text2)" }}>
                      {isExpanded ? continuation.content : continuation.excerpt}
                    </p>
                  </article>
                );
              })}
              {continuations.length === 0 ? (
                <p className="card rounded-[4px] p-5 italic" style={{ color: "var(--text3)" }}>
                  No approved continuations yet.
                </p>
              ) : null}
            </div>
          </section>

          {relatedPosts.length > 0 ? (
            <section className="mt-14 pt-10">
              <div className="literary-divider">✦</div>
              <h2 className="serif-title mb-6 text-3xl font-bold">
                You might also like
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <PostCard key={relatedPost._id} post={relatedPost} />
                ))}
              </div>
            </section>
          ) : null}
          <div className="literary-divider">✦</div>
          <NextReadCard currentPostId={post._id} />
          <SeriesNavigator post={post} postId={postId} />
          </ContentWarningGate>
          </>
        )}
      </main>
      {post ? <TableOfContents content={activeContent} /> : null}
    </>
  );
}
