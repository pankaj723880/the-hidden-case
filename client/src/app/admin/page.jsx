import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { AppLink, navigate } from "../../lib/navigation";
import { getMediaUrl } from "../../lib/media";

function getAdminMetrics(posts, reports) {
  return [
    { key: "total", label: "Total", value: posts.length, color: "var(--accent)" },
    {
      key: "pending",
      label: "Pending",
      value: posts.filter((post) => post.status === "pending").length,
      color: "#f59e0b",
    },
    {
      key: "approved",
      label: "Approved",
      value: posts.filter((post) => post.status === "approved").length,
      color: "var(--green)",
    },
    {
      key: "scheduled",
      label: "Scheduled",
      value: posts.filter((post) => post.status === "scheduled").length,
      color: "var(--accent)",
    },
    {
      key: "published",
      label: "Published",
      value: posts.filter((post) => post.status === "published").length,
      color: "var(--text2)",
    },
    {
      key: "rejected",
      label: "Rejected",
      value: posts.filter((post) => post.status === "rejected").length,
      color: "var(--red)",
    },
    {
      key: "featured",
      label: "Editor's Pick",
      value: posts.filter((post) => post.featured).length,
      color: "var(--gold)",
    },
    {
      key: "reports",
      label: "Pending Reports",
      value: reports.filter((report) => report.status === "pending").length,
      color: "#9f3d2e",
    },
  ];
}

function MetricGraph({ metric, history, maxValue }) {
  const values = history.map((point) => point[metric.key] ?? 0);
  const max = Math.max(1, maxValue);
  const points = values.length
    ? values
        .map((value, index) => {
          const x = values.length === 1 ? 100 : (index / (values.length - 1)) * 100;
          const y = 44 - (value / max) * 38;
          return `${x},${y}`;
        })
        .join(" ")
    : "0,44 100,44";

  return (
    <div className="card rounded-[4px] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.1rem]" style={{ color: "var(--text3)", fontFamily: "var(--font-garamond), Georgia, serif" }}>{metric.label}</span>
        <span className="serif-title text-3xl font-bold" style={{ color: "var(--accent)" }}>
          {metric.value}
        </span>
      </div>
      <svg
        viewBox="0 0 100 48"
        preserveAspectRatio="none"
        className="mt-4 h-20 w-full overflow-visible"
        aria-label={`${metric.label} realtime graph`}
      >
        <path
          d="M0 44 H100"
          stroke="var(--border)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={points}
          stroke={metric.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        {values.map((value, index) => {
          const x = values.length === 1 ? 100 : (index / (values.length - 1)) * 100;
          const y = 44 - (value / max) * 38;
          return (
            <circle
              key={`${metric.key}-${index}`}
              cx={x}
              cy={y}
              r="1.7"
              fill={metric.color}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <p className="mt-2 text-xs font-semibold" style={{ color: "var(--text3)" }}>
        Updates every 5 seconds
      </p>
    </div>
  );
}

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isApprovedStatus(status) {
  return ["approved", "published", "scheduled"].includes(
    String(status ?? "").toLowerCase(),
  );
}

function AdminPostCard({
  post,
  formatDateTime,
  onOpen,
  onApprove,
  onReject,
  onToggleFeature,
}) {
  const approved = isApprovedStatus(post.status);
  const status = String(post.status ?? "").toLowerCase();
  const rejected = status === "rejected";
  const pending = status === "pending";

  return (
    <article className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => onOpen(post)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8f5f35]">
              {post.type}
            </span>
            <span className="inline-flex rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold capitalize text-[#8f5f35]">
              {post.status}
            </span>
            {post.featured ? (
              <span className="inline-flex rounded-full bg-[#f59e0b]/15 px-3 py-1 text-xs font-black text-[#b45309]">
                Featured
              </span>
            ) : null}
          </div>
          <h3 className="serif-title mt-3 text-xl font-bold text-[#25211d]">
            {post.title}
          </h3>
          <p className="mt-2 text-sm font-semibold text-[#8b7f72]">
            Author: {post.author?.name ?? "Unknown"}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6d6155]">
            {stripHtml(post.content)}
          </p>
          {post.scheduledAt ? (
            <p className="mt-2 text-xs font-bold text-[var(--accent)]">
              Scheduled: {formatDateTime(post.scheduledAt)}
            </p>
          ) : null}
          {post.plagiarismCheck?.checkedAt ? (
            <p className="mt-2 text-xs font-bold" style={{
              color: post.plagiarismCheck.isFlagged ? "var(--red)" : "var(--green)",
            }}>
              Plagiarism: {post.plagiarismCheck.similarityScore ?? 0}%
            </p>
          ) : null}
        </button>

        <div className="flex shrink-0 flex-wrap gap-2 sm:w-40 sm:flex-col">
          <button
            type="button"
            onClick={() => onOpen(post)}
            className="secondary-btn px-4 py-2 text-sm"
          >
            Review
          </button>
          {pending || rejected ? (
            <button
              type="button"
              onClick={() => onApprove(post)}
              className="primary-btn px-4 py-2 text-sm"
            >
              {rejected ? "Approve again" : "Approve"}
            </button>
          ) : null}
          {pending || approved ? (
            <button
              type="button"
              onClick={() => onReject(post)}
              className="secondary-btn px-4 py-2 text-sm"
              style={{ color: "var(--red)" }}
            >
              Reject
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onToggleFeature(post._id)}
            className="rounded-md border px-4 py-2 text-sm font-bold transition hover:bg-[#f59e0b]/10"
            style={{
              borderColor: "#f59e0b",
              color: post.featured ? "#92400e" : "#b45309",
            }}
          >
            {post.featured ? "Unfeature" : "Feature"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [plagiarismReports, setPlagiarismReports] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [activeAdminSection, setActiveAdminSection] = useState("metrics");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    dateFrom: "",
    dateTo: "",
  });
  const [metricHistory, setMetricHistory] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    description: "",
    prompt: "",
    startDate: "",
    endDate: "",
  });
  const accessDenied = !isLoading && isAuthenticated && user?.role !== "admin";

  const loadPosts = async () => {
    const res = await api.get("/api/posts/admin/all");
    setPosts(res.data.posts ?? []);
  };

  const loadReports = async () => {
    const res = await api.get("/api/reports");
    setReports(res.data.reports ?? []);
  };

  const loadPlagiarismReports = async () => {
    const res = await api.get("/api/admin/plagiarism-reports");
    setPlagiarismReports(res.data.reports ?? []);
  };

  const loadChallenges = async () => {
    const res = await api.get("/api/challenges");
    setChallenges(res.data.challenges ?? []);
  };

  const loadAudit = async (nextPage = 1, { append = false } = {}) => {
    setIsLoadingAudit(true);
    try {
      const res = await api.get("/api/admin/audit-log", {
        params: {
          page: nextPage,
          limit: 20,
          action: auditFilters.action || undefined,
          dateFrom: auditFilters.dateFrom || undefined,
          dateTo: auditFilters.dateTo || undefined,
        },
      });
      setAuditLogs((current) =>
        append ? [...current, ...(res.data.logs ?? [])] : (res.data.logs ?? []),
      );
      setAuditPage(res.data.page ?? nextPage);
      setAuditTotalPages(res.data.totalPages ?? 1);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to load audit log",
      );
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (user?.role !== "admin") return;

    let cancelled = false;
    void (async () => {
      try {
        const [postsRes, reportsRes, plagiarismRes, challengesRes] = await Promise.all([
          api.get("/api/posts/admin/all"),
          api.get("/api/reports"),
          api.get("/api/admin/plagiarism-reports"),
          api.get("/api/challenges"),
        ]);
        if (!cancelled) {
          setPosts(postsRes.data.posts ?? []);
          setReports(reportsRes.data.reports ?? []);
          setPlagiarismReports(plagiarismRes.data.reports ?? []);
          setChallenges(challengesRes.data.challenges ?? []);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load posts",
          );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user?.role]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || user?.role !== "admin") return undefined;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        try {
          const [postsRes, reportsRes, plagiarismRes] = await Promise.all([
            api.get("/api/posts/admin/all"),
            api.get("/api/reports"),
            api.get("/api/admin/plagiarism-reports"),
          ]);
          setPosts(postsRes.data.posts ?? []);
          setReports(reportsRes.data.reports ?? []);
          setPlagiarismReports(plagiarismRes.data.reports ?? []);
        } catch {
          // Keep the current dashboard values if a realtime refresh misses.
        }
      })();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAuthenticated, isLoading, user?.role]);

  const setStatus = async (id, status, scheduledAt = null, adminReviewComment = "") => {
    setError("");
    try {
      await api.patch(`/api/posts/admin/${id}/status`, {
        status,
        scheduledAt,
        adminReviewComment,
      });
      await loadPosts();
      setSelectedPost(null);
      setReviewComment("");
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update post",
      );
    }
  };

  const openPostReview = (post) => {
    setSelectedPost(post);
    setReviewComment(post.adminReviewComment ?? "");
  };

  const checkSelectedPostPlagiarism = async () => {
    if (!selectedPost?._id) return;
    setError("");
    setIsCheckingPlagiarism(true);
    try {
      const res = await api.post(
        `/api/posts/admin/${selectedPost._id}/plagiarism-check`,
      );
      const plagiarismCheck = res.data.plagiarismCheck;
      setSelectedPost((current) =>
        current ? { ...current, plagiarismCheck } : current,
      );
      setPosts((current) =>
        current.map((post) =>
          post._id === selectedPost._id
            ? { ...post, plagiarismCheck }
            : post,
        ),
      );
      await loadPlagiarismReports();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to check plagiarism",
      );
    } finally {
      setIsCheckingPlagiarism(false);
    }
  };

  const toggleFeature = async (id) => {
    setError("");
    try {
      await api.post(`/api/admin/posts/${id}/feature`);
      await loadPosts();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update feature",
      );
    }
  };

  const updateReportStatus = async (id, status) => {
    setError("");
    try {
      await api.patch(`/api/reports/${id}`, { status });
      await loadReports();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update report",
      );
    }
  };

  const updatePlagiarismStatus = async (id, status) => {
    setError("");
    try {
      await api.patch(`/api/admin/plagiarism-reports/${id}`, { status });
      await loadPlagiarismReports();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to update plagiarism report",
      );
    }
  };

  const createChallenge = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/api/challenges", challengeForm);
      setChallengeForm({
        title: "",
        description: "",
        prompt: "",
        startDate: "",
        endDate: "",
      });
      await loadChallenges();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to create challenge",
      );
    }
  };

  const updateChallengeStatus = async (challenge, status) => {
    setError("");
    try {
      await api.put(`/api/challenges/${challenge._id}`, { status });
      await loadChallenges();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update challenge",
      );
    }
  };

  const announceChallengeWinner = async (challengeOrId, entryOrPostId) => {
    const challengeId = challengeOrId?._id ?? challengeOrId;
    const postId = entryOrPostId?._id ?? entryOrPostId;
    if (!challengeId || !postId) return;

    setError("");
    try {
      await api.patch(`/api/challenges/${challengeId}/winner`, { postId });
      await loadChallenges();
      await loadPosts();
      setSelectedPost(null);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to announce challenge winner",
      );
    }
  };

  const openAdminSection = (section) => {
    setActiveAdminSection(section);
    if (section === "audit" && auditLogs.length === 0) {
      void loadAudit(1);
    }
  };

  const updateAuditFilter = (key, value) => {
    setAuditFilters((current) => ({ ...current, [key]: value }));
  };

  const applyAuditFilters = () => {
    setAuditLogs([]);
    void loadAudit(1);
  };

  const pendingPosts = posts.filter((post) => post.status === "pending");
  const featuredCount = posts.filter((post) => post.featured).length;
  const pendingReports = reports.filter((report) => report.status === "pending");
  const flaggedPlagiarismReports = plagiarismReports.filter(
    (report) => report.status === "flagged",
  );
  const adminMetrics = getAdminMetrics(posts, reports);
  const metricMaxValue = Math.max(
    1,
    ...adminMetrics.map((metric) => metric.value),
    ...metricHistory.flatMap((point) =>
      adminMetrics.map((metric) => point[metric.key] ?? 0),
    ),
  );

  useEffect(() => {
    if (user?.role !== "admin") return;
    const snapshot = getAdminMetrics(posts, reports).reduce(
      (current, metric) => ({ ...current, [metric.key]: metric.value }),
      { time: Date.now() },
    );
    setMetricHistory((current) => [...current.slice(-19), snapshot]);
  }, [user?.role, posts, reports]);
  const auditActions = [
    "Post approved",
    "Post rejected",
    "Post deleted",
    "User banned",
    "Comment deleted",
    "Report dismissed",
    "Post featured",
    "Post unfeatured",
  ];
  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString() : "";
  const getApprovalAction = (post) => {
    const scheduledDate = post?.scheduledAt ? new Date(post.scheduledAt) : null;
    if (scheduledDate && scheduledDate > new Date()) {
      return {
        status: "scheduled",
        scheduledAt: post.scheduledAt,
        label: `Approve & Schedule for ${formatDateTime(post.scheduledAt)}`,
      };
    }

    return { status: "approved", scheduledAt: null, label: "Approve and publish" };
  };
  const approvePost = (post, comment = "") => {
    if (isApprovedStatus(post?.status)) return Promise.resolve();
    const action = getApprovalAction(post);
    return setStatus(post._id, action.status, action.scheduledAt, comment);
  };
  const rejectPost = (post, comment = "") =>
    setStatus(post._id, "rejected", null, comment);
  const selectedPostStatus = String(selectedPost?.status ?? "").toLowerCase();
  const selectedPostChallengeId = String(
    selectedPost?.challenge?._id ?? selectedPost?.challenge ?? "",
  );
  const selectedPostChallenge = challenges.find(
    (challenge) => String(challenge._id) === selectedPostChallengeId,
  );
  const selectedPostIsChallengeWinner =
    selectedPostChallenge &&
    String(selectedPostChallenge.winner?.post?._id ?? "") ===
      String(selectedPost?._id ?? "");
  const reviewGroups = [
    {
      key: "pending-stories",
      title: "Pending Stories",
      description: "Stories waiting for an editorial decision.",
      posts: posts.filter((post) => post.type === "story" && post.status === "pending"),
    },
    {
      key: "pending-blogs",
      title: "Pending Blogs",
      description: "Blogs waiting for an editorial decision.",
      posts: posts.filter((post) => post.type === "blog" && post.status === "pending"),
    },
    {
      key: "approved-stories",
      title: "Approved Stories",
      description: "Approved, scheduled, and published stories. Approve is disabled here.",
      posts: posts.filter((post) => post.type === "story" && isApprovedStatus(post.status)),
    },
    {
      key: "approved-blogs",
      title: "Approved Blogs",
      description: "Approved, scheduled, and published blogs. Approve is disabled here.",
      posts: posts.filter((post) => post.type === "blog" && isApprovedStatus(post.status)),
    },
    {
      key: "rejected-stories",
      title: "Rejected Stories",
      description: "Stories rejected by the editorial desk.",
      posts: posts.filter((post) => post.type === "story" && post.status === "rejected"),
    },
    {
      key: "rejected-blogs",
      title: "Rejected Blogs",
      description: "Blogs rejected by the editorial desk.",
      posts: posts.filter((post) => post.type === "blog" && post.status === "rejected"),
    },
  ];

  return (
    <main className="editorial-shell py-12">
      <header className="mb-9 border-b border-[#ded2c1] pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Editorial desk
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold text-[#25211d]">
          Admin review
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#6d6155]">
          Approve community submissions and keep the publication polished.
        </p>
      </header>

      {accessDenied ? (
        <p className="paper-card mb-6 rounded-lg p-5 text-sm font-semibold text-[#9f3d2e]">
          Admin access is required.
        </p>
      ) : null}
      {error ? <p className="mb-6 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="paper-card rounded-lg">
          <div className="border-b border-[#ded2c1] px-6 py-5">
            <h2 className="serif-title text-3xl font-bold text-[#25211d]">
              Posts
            </h2>
            <p className="mt-2 text-sm font-bold text-[#8b7f72]">
              Editor&apos;s Pick: {featuredCount} / 3 slots used
            </p>
          </div>
          <div className="space-y-6 p-6">
            {reviewGroups.map((group) => (
              <section key={group.key} className="rounded-lg border border-[#ded2c1] bg-[#f5f0e8]/65 p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="serif-title text-2xl font-bold text-[#25211d]">
                      {group.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#8b7f72]">
                      {group.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-black text-[#8f5f35]">
                    {group.posts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {group.posts.map((post) => (
                    <AdminPostCard
                      key={post._id}
                      post={post}
                      formatDateTime={formatDateTime}
                      onOpen={openPostReview}
                      onApprove={approvePost}
                      onReject={rejectPost}
                      onToggleFeature={toggleFeature}
                    />
                  ))}
                  {group.posts.length === 0 ? (
                    <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4 text-sm text-[#6d6155]">
                      No submissions in this box.
                    </p>
                  ) : null}
                </div>
              </section>
            ))}
            {posts.length === 0 ? (
              <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                No posts found.
              </p>
            ) : null}
          </div>
        </div>

        <aside className="paper-card h-fit rounded-lg p-6">
          <div className="mb-6 grid gap-2">
            {[
              ["metrics", "Metrics", null],
              ["challenges", "Challenges", null],
              ["reports", "Reports", pendingReports.length],
              ["plagiarism", "Plagiarism", flaggedPlagiarismReports.length],
              ["audit", "Audit Log", null],
            ].map(([value, label, badge]) => (
              <button
                key={value}
                type="button"
                onClick={() => openAdminSection(value)}
                className="flex items-center justify-between rounded-md px-4 py-3 text-left text-sm font-bold transition"
                style={{
                  backgroundColor:
                    activeAdminSection === value ? "var(--accent)" : "var(--bg3)",
                  color: activeAdminSection === value ? "#fff" : "var(--text2)",
                }}
              >
                {label}
                {badge ? (
                  <span className="rounded-full bg-[#9f3d2e] px-2 py-0.5 text-xs text-white">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {activeAdminSection === "metrics" ? (
            <>
              <h2 className="serif-title text-3xl font-bold text-[#25211d]">
                Realtime Metrics
              </h2>
              <p className="mt-2 text-sm text-[#8b7f72]">
                Live snapshots of every admin value, refreshed from the server.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {adminMetrics.map((metric) => (
                  <MetricGraph
                    key={metric.key}
                    metric={metric}
                    history={metricHistory}
                    maxValue={metricMaxValue}
                  />
                ))}
              </div>
            </>
          ) : null}

          {activeAdminSection === "challenges" ? (
            <div className="border-t border-[#ded2c1] pt-6">
              <h2 className="serif-title text-3xl font-bold text-[#25211d]">
                Challenges
              </h2>

              <form onSubmit={createChallenge} className="mt-5 space-y-3">
                <input
                  value={challengeForm.title}
                  onChange={(event) =>
                    setChallengeForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="field"
                  placeholder="Challenge title"
                  required
                />
                <textarea
                  value={challengeForm.description}
                  onChange={(event) =>
                    setChallengeForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="field min-h-20 resize-y"
                  placeholder="Short description"
                  required
                />
                <textarea
                  value={challengeForm.prompt}
                  onChange={(event) =>
                    setChallengeForm((current) => ({
                      ...current,
                      prompt: event.target.value,
                    }))
                  }
                  className="field min-h-24 resize-y"
                  placeholder="Writing prompt"
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                    Start
                    <input
                      type="datetime-local"
                      value={challengeForm.startDate}
                      onChange={(event) =>
                        setChallengeForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                      className="field mt-1"
                      required
                    />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                    End
                    <input
                      type="datetime-local"
                      value={challengeForm.endDate}
                      onChange={(event) =>
                        setChallengeForm((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                      className="field mt-1"
                      required
                    />
                  </label>
                </div>
                <button type="submit" className="primary-btn w-full px-4 py-3">
                  Create Challenge
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {challenges.map((challenge) => (
                  <div
                    key={challenge._id}
                    className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="serif-title text-xl font-bold text-[#25211d]">
                          {challenge.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-[#8b7f72]">
                          {challenge.entryCount ?? 0} entries
                        </p>
                        {challenge.winner?.post ? (
                          <p className="mt-2 text-xs font-bold text-[#5f7263]">
                            Winner: {challenge.winner.post.title} by{" "}
                            {challenge.winner.post.author?.name ??
                              challenge.winner.author?.name ??
                              "Unknown"}
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8f5f35]">
                        {challenge.status}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6d6155]">
                      {challenge.prompt}
                    </p>
                    {challenge.entrySummaries?.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-[#ded2c1] bg-[#f7efe5] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f5f35]">
                          Applied users / submissions
                        </p>
                        <div className="mt-3 space-y-2">
                          {challenge.entrySummaries.map((entry) => {
                            const isWinner =
                              String(challenge.winner?.post?._id ?? "") ===
                              String(entry._id);
                            return (
                            <div
                              key={entry._id}
                              className="flex flex-col gap-2 rounded-md bg-[#fffaf2] p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#25211d]">
                                  {entry.title}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[#8b7f72]">
                                  By {entry.author?.name ?? "Unknown"} · {entry.status}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <AppLink
                                  href={`/post/${entry._id}`}
                                  className="secondary-btn px-3 py-2 text-center text-xs"
                                >
                                  Review post
                                </AppLink>
                                {isWinner ? (
                                  <span className="rounded-md bg-[#e8f0e8] px-3 py-2 text-xs font-black text-[#3d6b45]">
                                    Winner
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => announceChallengeWinner(challenge, entry)}
                                    className="primary-btn px-3 py-2 text-xs"
                                    title="Select this story as the challenge winner"
                                  >
                                    Select winner
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-lg border border-dashed border-[#ded2c1] bg-[#f7efe5] p-3 text-sm text-[#8b7f72]">
                        No one has applied to this challenge yet.
                      </p>
                    )}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <select
                        value={challenge.status}
                        onChange={(event) =>
                          updateChallengeStatus(challenge, event.target.value)
                        }
                        className="field"
                      >
                        <option value="upcoming">upcoming</option>
                        <option value="active">active</option>
                        <option value="voting">voting</option>
                        <option value="ended">ended</option>
                      </select>
                      <AppLink
                        href={`/challenges/${challenge._id}`}
                        className="secondary-btn px-4 py-3 text-center text-sm"
                      >
                        View
                      </AppLink>
                    </div>
                  </div>
                ))}
                {challenges.length === 0 ? (
                  <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4 text-sm text-[#6d6155]">
                    No challenges created yet.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeAdminSection === "reports" ? (
          <div className="border-t border-[#ded2c1] pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="serif-title text-3xl font-bold text-[#25211d]">
                Reports
              </h2>
              {pendingReports.length > 0 ? (
                <span className="rounded-full bg-[#9f3d2e] px-3 py-1 text-xs font-black text-white">
                  {pendingReports.length}
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              {reports.slice(0, 8).map((report) => (
                <div
                  key={report._id}
                  className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#ead9c7] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8f5f35]">
                      {report.contentType}
                    </span>
                    <span className="rounded-full bg-[#fff4dc] px-2.5 py-1 text-[11px] font-bold capitalize text-[#92400e]">
                      {report.reason}
                    </span>
                    <span className="rounded-full bg-[var(--bg3)] px-2.5 py-1 text-[11px] font-bold capitalize text-[var(--accent)]">
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#352a20]">
                    {report.reporter?.name ?? "Unknown reporter"}
                  </p>
                  <p className="mt-1 text-xs text-[#8b7f72]">
                    {report.createdAt ? new Date(report.createdAt).toLocaleString() : ""}
                  </p>
                  {report.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6d6155]">
                      {report.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.targetPostId ? (
                      <AppLink
                        href={`/post/${report.targetPostId}${
                          report.contentType === "comment" ? "#discussion" : ""
                        }`}
                        className="secondary-btn px-3 py-2 text-xs"
                      >
                        View
                      </AppLink>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => updateReportStatus(report._id, "reviewed")}
                      className="secondary-btn px-3 py-2 text-xs"
                    >
                      Reviewed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateReportStatus(report._id, "dismissed")}
                      className="rounded-md border border-[#9f3d2e]/35 px-3 py-2 text-xs font-bold text-[#9f3d2e] transition hover:bg-[#9f3d2e]/10"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
              {reports.length === 0 ? (
                <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4 text-sm text-[#6d6155]">
                  No reports.
                </p>
              ) : null}
            </div>
          </div>
          ) : null}

          {activeAdminSection === "plagiarism" ? (
            <div className="border-t border-[#ded2c1] pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="serif-title text-3xl font-bold text-[#25211d]">
                  Plagiarism
                </h2>
                {flaggedPlagiarismReports.length > 0 ? (
                  <span className="rounded-full bg-[#9f3d2e] px-3 py-1 text-xs font-black text-white">
                    {flaggedPlagiarismReports.length}
                  </span>
                ) : null}
              </div>

              <div className="space-y-3">
                {plagiarismReports.map((report) => {
                  const score = Number(report.similarityScore ?? 0);
                  const scoreStyle =
                    score > 90
                      ? { backgroundColor: "#f0e8e8", color: "var(--red)" }
                      : { backgroundColor: "#f5edd8", color: "#8a6020" };
                  return (
                    <article
                      key={report._id}
                      className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-[3px] px-2.5 py-1 text-xs font-black"
                          style={scoreStyle}
                        >
                          {score}% match
                        </span>
                        <span className="rounded-[3px] bg-[#ead9c7] px-2.5 py-1 text-xs font-bold capitalize text-[#8f5f35]">
                          {report.status}
                        </span>
                      </div>

                      <h3 className="serif-title mt-3 text-xl font-bold text-[#25211d]">
                        {report.post?.title ?? "Deleted post"}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-[#8b7f72]">
                        Author: {report.post?.author?.name ?? "Unknown"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#6d6155]">
                        Similar to{" "}
                        <span className="font-bold text-[#352a20]">
                          {report.matchedPost?.title ??
                            report.matchedPostTitle ??
                            "another post"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-[#8b7f72]">
                        {report.checkedAt
                          ? new Date(report.checkedAt).toLocaleString()
                          : ""}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {report.post?._id ? (
                          <AppLink
                            href={`/post/${report.post._id}`}
                            className="secondary-btn px-3 py-2 text-xs"
                          >
                            View post
                          </AppLink>
                        ) : null}
                        {report.matchedPost?._id ? (
                          <AppLink
                            href={`/post/${report.matchedPost._id}`}
                            className="secondary-btn px-3 py-2 text-xs"
                          >
                            View match
                          </AppLink>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => updatePlagiarismStatus(report._id, "cleared")}
                          className="secondary-btn px-3 py-2 text-xs"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePlagiarismStatus(report._id, "dismissed")}
                          className="rounded-md border border-[#9f3d2e]/35 px-3 py-2 text-xs font-bold text-[#9f3d2e] transition hover:bg-[#9f3d2e]/10"
                        >
                          Dismiss
                        </button>
                      </div>
                    </article>
                  );
                })}

                {plagiarismReports.length === 0 ? (
                  <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4 text-sm text-[#6d6155]">
                    No plagiarism flags.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeAdminSection === "audit" ? (
            <AuditLogPanel
              actions={auditActions}
              filters={auditFilters}
              logs={auditLogs}
              page={auditPage}
              totalPages={auditTotalPages}
              isLoading={isLoadingAudit}
              onFilterChange={updateAuditFilter}
              onApplyFilters={applyAuditFilters}
              onLoadMore={() => loadAudit(auditPage + 1, { append: true })}
            />
          ) : null}
        </aside>
      </section>

      {selectedPost ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#25211d]/45 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl rounded-lg border border-[#ded2c1] bg-[#fffaf2] shadow-[0_28px_80px_rgba(37,33,29,0.24)]">
            <div className="flex flex-col gap-4 border-b border-[#ded2c1] p-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8f5f35]">
                  {selectedPost.type}
                </span>
                <h2 className="serif-title mt-4 text-4xl font-bold leading-tight text-[#25211d]">
                  {selectedPost.title}
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#8b7f72]">
                  Submitted by {selectedPost.author?.name ?? "Unknown"}{" "}
                  {selectedPost.author?.email ? `(${selectedPost.author.email})` : ""}
                </p>
                {selectedPost.scheduledAt ? (
                  <span className="mt-3 inline-flex rounded-full bg-[var(--bg3)] px-3 py-1 text-xs font-bold text-[var(--accent)]">
                    Scheduled: {formatDateTime(selectedPost.scheduledAt)}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPost(null);
                  setReviewComment("");
                }}
                className="secondary-btn px-4 py-2"
              >
                Close
              </button>
            </div>

            <div className="space-y-6 p-6">
              {selectedPost.coverImage ? (
                <img
                  src={getMediaUrl(selectedPost.coverImage)}
                  alt=""
                  className="max-h-[620px] w-full rounded-lg border border-[#d8cab8] object-contain opacity-100 mix-blend-normal filter-none"
                  style={{ filter: "none" }}
                />
              ) : null}
              {selectedPost.videoUrl ? (
                <video
                  src={getMediaUrl(selectedPost.videoUrl)}
                  controls
                  className="w-full rounded-lg border border-[#d8cab8] bg-[var(--ink)]"
                />
              ) : null}
              <article className="whitespace-pre-wrap text-lg leading-9 text-[#352a20]">
                {selectedPost.content}
              </article>

              <section className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="serif-title text-2xl font-bold text-[#25211d]">
                      AI plagiarism check
                    </h3>
                    <p className="mt-1 text-sm text-[#8b7f72]">
                      Compare this upload against approved and published posts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={checkSelectedPostPlagiarism}
                    disabled={isCheckingPlagiarism}
                    className="secondary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCheckingPlagiarism ? "Checking..." : "Check plagiarism"}
                  </button>
                </div>

                {selectedPost.plagiarismCheck?.checkedAt ? (
                  <div className="mt-4 rounded-md border p-4" style={{
                    borderColor: selectedPost.plagiarismCheck.isFlagged
                      ? "#cbb0b0"
                      : "#b0cbb0",
                    backgroundColor: selectedPost.plagiarismCheck.isFlagged
                      ? "#f0e8e8"
                      : "#e8f0e8",
                  }}>
                    <p className="text-sm font-bold" style={{
                      color: selectedPost.plagiarismCheck.isFlagged
                        ? "var(--red)"
                        : "var(--green)",
                    }}>
                      {selectedPost.plagiarismCheck.similarityScore ?? 0}% similarity
                      {selectedPost.plagiarismCheck.isFlagged
                        ? " · flagged for review"
                        : " · no high-similarity match"}
                    </p>
                    {selectedPost.plagiarismCheck.matchedPostTitle ? (
                      <p className="mt-2 text-sm text-[#6d6155]">
                        Closest match:{" "}
                        <span className="font-bold text-[#352a20]">
                          {selectedPost.plagiarismCheck.matchedPostTitle}
                        </span>
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-[#8b7f72]">
                      Checked {formatDateTime(selectedPost.plagiarismCheck.checkedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-md border border-[#ded2c1] bg-[#f5f0e8] p-4 text-sm text-[#6d6155]">
                    This upload has not been checked from the review panel yet.
                  </p>
                )}
              </section>

              <label className="block rounded-lg border border-[#ded2c1] bg-[#fffaf2]/80 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                  Private review comment
                </span>
                <textarea
                  value={reviewComment}
                  maxLength={1000}
                  onChange={(event) => setReviewComment(event.target.value)}
                  className="field mt-3 min-h-28 resize-y"
                  placeholder="Optional note for the author explaining why this upload is approved or rejected..."
                />
                <span className="mt-2 block text-xs font-semibold text-[#8b7f72]">
                  Only the related author can see this note in their profile submissions.
                </span>
              </label>

              {selectedPostChallenge ? (
                <section className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                    Challenge entry
                  </p>
                  <h3 className="serif-title mt-2 text-2xl font-bold text-[#25211d]">
                    {selectedPostChallenge.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#6d6155]">
                    Select this story as the winner. If it is still pending or rejected, it will be approved automatically so readers can open it from the homepage.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      announceChallengeWinner(selectedPostChallenge._id, selectedPost._id)
                    }
                    disabled={selectedPostIsChallengeWinner}
                    className="primary-btn mt-4 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {selectedPostIsChallengeWinner
                      ? "Already selected as winner"
                      : "Select as challenge winner"}
                  </button>
                </section>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#ded2c1] p-6 sm:flex-row sm:justify-end">
              {selectedPostStatus === "pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => rejectPost(selectedPost, reviewComment)}
                    className="secondary-btn px-5 py-3"
                  >
                    Reject submission
                  </button>
                  <button
                    type="button"
                    onClick={() => approvePost(selectedPost, reviewComment)}
                    className="primary-btn px-5 py-3"
                  >
                    {getApprovalAction(selectedPost).label}
                  </button>
                </>
              ) : null}
              {isApprovedStatus(selectedPostStatus) ? (
                <button
                  type="button"
                  onClick={() => rejectPost(selectedPost, reviewComment)}
                  className="secondary-btn px-5 py-3"
                  style={{ color: "var(--red)" }}
                >
                  Reject this approved upload
                </button>
              ) : null}
              {selectedPostStatus === "rejected" ? (
                <button
                  type="button"
                  onClick={() => approvePost(selectedPost, reviewComment)}
                  className="primary-btn px-5 py-3"
                >
                  Approve again
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function timeAgo(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function groupLabel(value) {
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);

  if (date >= startToday) return "Today";
  if (date >= startYesterday) return "Yesterday";
  if (date >= startWeek) return "This week";
  return date.toLocaleDateString();
}

function actionColor(action) {
  if (action.includes("approved")) return "#10b981";
  if (["rejected", "deleted", "banned"].some((word) => action.toLowerCase().includes(word))) {
    return "#ef4444";
  }
  if (action.includes("dismissed")) return "#6b7280";
  if (action.includes("featured")) return "#f59e0b";
  return "var(--accent)";
}

function initials(name) {
  return (name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function groupLogs(logs) {
  return logs.reduce((groups, log) => {
    const label = groupLabel(log.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
    return groups;
  }, {});
}

function AuditLogPanel({
  actions,
  filters,
  logs,
  page,
  totalPages,
  isLoading,
  onFilterChange,
  onApplyFilters,
  onLoadMore,
}) {
  const groupedLogs = groupLogs(logs);

  return (
    <div className="border-t border-[#ded2c1] pt-6">
      <h2 className="serif-title text-3xl font-bold text-[#25211d]">
        Audit Log
      </h2>

      <div className="mt-4 grid gap-3">
        <select
          value={filters.action}
          onChange={(event) => onFilterChange("action", event.target.value)}
          className="field"
        >
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(event) => onFilterChange("dateFrom", event.target.value)}
          className="field"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(event) => onFilterChange("dateTo", event.target.value)}
          className="field"
        />
        <button
          type="button"
          onClick={onApplyFilters}
          className="primary-btn px-4 py-2 text-sm"
        >
          Apply filters
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {Object.entries(groupedLogs).map(([label, entries]) => (
          <section key={label}>
            <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#8b7f72]">
              {label}
            </h3>
            <div className="space-y-3">
              {entries.map((log) => (
                <article
                  key={log._id}
                  className="rounded-lg border bg-[#fffaf2]/70 p-4"
                  style={{
                    borderColor: "#ded2c1",
                    borderLeft: `4px solid ${actionColor(log.action)}`,
                  }}
                >
                  <div className="flex gap-3">
                    {log.admin?.avatar ? (
                      <img
                        src={getMediaUrl(log.admin.avatar)}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ead9c7] text-xs font-black text-[#8f5f35]">
                        {initials(log.admin?.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-[#352a20]">
                        <span className="font-bold">
                          {log.admin?.name ?? "Admin"}
                        </span>{" "}
                        <span className="font-bold">{log.action}</span>
                      </p>
                      {log.targetName ? (
                        <p className="mt-1 truncate text-xs font-semibold text-[#8b7f72]">
                          {log.targetName}
                        </p>
                      ) : null}
                      {log.details ? (
                        <p className="mt-2 text-xs leading-5 text-[#6d6155]">
                          {log.details}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-[#8b7f72]">
                        {timeAgo(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {logs.length === 0 && !isLoading ? (
          <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4 text-sm text-[#6d6155]">
            No audit entries found.
          </p>
        ) : null}

        {page < totalPages ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="secondary-btn w-full px-4 py-2 text-sm disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
