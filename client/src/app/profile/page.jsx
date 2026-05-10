import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { AppLink, navigate } from "../../lib/navigation";
import PostCard from "../../components/PostCard";
import UserConnectionsModal from "../../components/UserConnectionsModal";
import StreakBadge from "../../components/StreakBadge";
import CritiqueReport from "../../components/CritiqueReport";
import BadgeDisplay from "../../components/BadgeDisplay";
import LevelBadge from "../../components/LevelBadge";
import { XP_ACTIONS } from "../../lib/levels";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, setProfileUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSavingEmailPreference, setIsSavingEmailPreference] = useState(false);
  const [activeTab, setActiveTab] = useState("submissions");
  const [bookmarks, setBookmarks] = useState([]);
  const [hasLoadedBookmarks, setHasLoadedBookmarks] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [hasLoadedDrafts, setHasLoadedDrafts] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [hasLoadedQuestions, setHasLoadedQuestions] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [openQuestionId, setOpenQuestionId] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answerIsPublic, setAnswerIsPublic] = useState(true);
  const [continuationInbox, setContinuationInbox] = useState([]);
  const [hasLoadedContinuations, setHasLoadedContinuations] = useState(false);
  const [isLoadingContinuations, setIsLoadingContinuations] = useState(false);
  const [connectionsType, setConnectionsType] = useState("");
  const [followedTags, setFollowedTags] = useState([]);
  const [critiquePostId, setCritiquePostId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const [profileRes, postsRes, followedTagsRes] = await Promise.all([
          api.get("/api/users/me"),
          api.get("/api/posts/mine"),
          api.get("/api/users/me/followed-tags"),
        ]);

        if (!cancelled) {
          const loadedProfile = profileRes.data.user;
          setProfile(loadedProfile);
          setFormName(loadedProfile.name ?? "");
          setFormBio(loadedProfile.bio ?? "");
          setProfileUser(loadedProfile);
          setPosts(postsRes.data.posts ?? []);
          setFollowedTags(followedTagsRes.data.followedTags ?? []);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err?.response?.data?.error || err?.message || "Failed to load posts",
          );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, setProfileUser]);

  const displayUser = profile ?? user;
  const approvedPosts = posts.filter((post) => post.status === "approved");

  const fetchBookmarks = async () => {
    setIsLoadingBookmarks(true);
    setError("");
    try {
      const res = await api.get("/api/users/me/bookmarks");
      setBookmarks(res.data.bookmarks ?? []);
      setHasLoadedBookmarks(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load reading list",
      );
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  const fetchDrafts = async () => {
    setIsLoadingDrafts(true);
    setError("");
    try {
      const res = await api.get("/api/posts/drafts");
      setDrafts(res.data.posts ?? []);
      setHasLoadedDrafts(true);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to load drafts",
      );
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const fetchQuestions = async () => {
    setIsLoadingQuestions(true);
    setError("");
    try {
      const res = await api.get("/api/my-questions");
      setQuestions(res.data.items ?? []);
      setHasLoadedQuestions(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load questions",
      );
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const fetchContinuations = async () => {
    setIsLoadingContinuations(true);
    setError("");
    try {
      const res = await api.get("/api/my-continuations");
      setContinuationInbox(res.data.continuations ?? []);
      setHasLoadedContinuations(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load continuations",
      );
    } finally {
      setIsLoadingContinuations(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "reading-list" && !hasLoadedBookmarks) {
      void fetchBookmarks();
    }
    if (tab === "drafts" && !hasLoadedDrafts) {
      void fetchDrafts();
    }
    if (tab === "questions" && !hasLoadedQuestions) {
      void fetchQuestions();
    }
    if (tab === "continuations" && !hasLoadedContinuations) {
      void fetchContinuations();
    }
  };

  const openAnswerForm = (questionId) => {
    setOpenQuestionId((current) => (current === questionId ? "" : questionId));
    setAnswerText("");
    setAnswerIsPublic(true);
  };

  const submitAnswer = async (questionId) => {
    const answer = answerText.trim();
    if (!answer) return;

    try {
      await api.put(`/api/qa/${questionId}/answer`, {
        answer,
        isPublic: answerIsPublic,
      });
      setQuestions((current) => current.filter((item) => item._id !== questionId));
      setOpenQuestionId("");
      setAnswerText("");
      toast.success("Answer submitted");
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to answer question",
      );
    }
  };

  const reviewContinuation = async (continuationId, action) => {
    try {
      await api.patch(`/api/continuations/${continuationId}/${action}`);
      setContinuationInbox((current) =>
        current.filter((item) => item._id !== continuationId),
      );
      toast.success(action === "approve" ? "Continuation approved" : "Continuation declined");
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to review continuation",
      );
    }
  };

  const handleDeleteDraft = async (draftId) => {
    setError("");
    try {
      await api.delete(`/api/posts/${draftId}`);
      setDrafts((current) => current.filter((draft) => draft._id !== draftId));
      setPosts((current) => current.filter((post) => post._id !== draftId));
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to delete draft",
      );
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      let updatedUser = null;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const avatarRes = await api.post("/api/users/me/avatar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updatedUser = avatarRes.data.user;
      }

      const res = await api.patch("/api/users/me", {
        name: formName,
        bio: formBio,
      });
      updatedUser = { ...updatedUser, ...res.data.user };
      setProfile(updatedUser);
      setProfileUser(updatedUser);
      setAvatarFile(null);
      setIsEditing(false);
      setMessage("Profile updated.");
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update profile",
      );
    }
  };

  const handleEmailNotificationsChange = async (event) => {
    const emailNotifications = event.target.checked;
    setIsSavingEmailPreference(true);
    setError("");

    setProfile((current) =>
      current ? { ...current, emailNotifications } : current,
    );

    try {
      const res = await api.put("/api/users/me", { emailNotifications });
      setProfile(res.data.user);
      setProfileUser(res.data.user);
      toast.success("Email notification preference updated");
    } catch (err) {
      setProfile((current) =>
        current ? { ...current, emailNotifications: !emailNotifications } : current,
      );
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to update email preference",
      );
    } finally {
      setIsSavingEmailPreference(false);
    }
  };

  const handleUnfollowTag = async (tag) => {
    const previousTags = followedTags;
    setFollowedTags((current) => current.filter((item) => item !== tag));

    try {
      const res = await api.post("/api/users/me/follow-tag", { tag });
      setFollowedTags(res.data.followedTags ?? []);
      const updatedProfile = {
        ...(profile ?? {}),
        followedTags: res.data.followedTags ?? [],
      };
      setProfile((current) =>
        current ? { ...current, followedTags: res.data.followedTags ?? [] } : current,
      );
      setProfileUser(updatedProfile);
      toast.success(`Unfollowed #${tag}`);
    } catch (err) {
      setFollowedTags(previousTags);
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to unfollow tag",
      );
    }
  };

  if (isLoading) {
    return <main className="editorial-shell py-12 text-[#6d6155]">Loading profile...</main>;
  }

  return (
    <main className="editorial-shell py-12">
      <header className="mb-9 border-b border-[#ded2c1] pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Your desk
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold text-[#25211d]">
          Profile
        </h1>
      </header>

      <section className="grid gap-8 lg:grid-cols-[0.85fr_1.7fr]">
        <aside className="paper-card h-fit rounded-lg p-7">
          <div className="flex flex-col items-center text-center">
            {displayUser?.avatar ? (
              <img
                src={displayUser.avatar}
                alt=""
                className="h-32 w-32 rounded-full border border-[#d8cab8] object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#ead9c7] font-serif text-4xl font-bold text-[#8f5f35]">
                {(displayUser?.name || "User")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <h2 className="serif-title mt-5 text-3xl font-bold text-[#25211d]">
              {displayUser?.name || "Unknown User"}
            </h2>
            <div className="mt-3 w-full">
              <LevelBadge
                level={displayUser?.level}
                xp={displayUser?.xp ?? 0}
                showProgress
              />
            </div>
            <div className="mt-3">
              <StreakBadge
                streak={displayUser?.currentStreak ?? 0}
                longestStreak={displayUser?.longestStreak ?? 0}
              />
            </div>
            <p className="mt-1 text-sm text-[#8b7f72]">
              {displayUser?.email || "No email available"}
            </p>
            {displayUser?.bio ? (
              <p className="mt-5 leading-7 text-[#6d6155]">{displayUser.bio}</p>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-md bg-[#ead9c7]/55 p-4">
              <p className="text-2xl font-bold text-[#25211d]">{posts.length}</p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                Posts
              </p>
            </div>
            {displayUser?.role === "admin" ? (
              <div className="rounded-md bg-[#ead9c7]/55 p-4">
                <p className="text-2xl font-bold capitalize text-[#25211d]">
                  Admin
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                  Role
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setConnectionsType("followers")}
              className="rounded-md bg-[#ead9c7]/55 p-4 transition hover:shadow-sm"
            >
              <p className="text-2xl font-bold text-[#25211d]">
                {(displayUser?.followers ?? []).length}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                Followers
              </p>
            </button>
            <button
              type="button"
              onClick={() => setConnectionsType("following")}
              className="rounded-md bg-[#ead9c7]/55 p-4 transition hover:shadow-sm"
            >
              <p className="text-2xl font-bold text-[#25211d]">
                {(displayUser?.following ?? []).length}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                Following
              </p>
            </button>
          </div>

          {message ? <p className="mt-5 text-sm font-semibold text-[#5f7263]">{message}</p> : null}

          <div className="mt-7 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-bold text-[#352a20]">
                  Receive email notifications
                </span>
                <span className="mt-1 block text-xs text-[#8b7f72]">
                  Comments, follows, and submission updates.
                </span>
              </span>
              <input
                type="checkbox"
                checked={displayUser?.emailNotifications ?? true}
                disabled={isSavingEmailPreference}
                onChange={handleEmailNotificationsChange}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#d8cab8] transition after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:bg-[var(--accent)] peer-checked:after:translate-x-5 peer-disabled:opacity-60" />
            </label>
          </div>

          <div className="mt-5 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4">
            <h3 className="text-sm font-bold text-[#352a20]">Followed Tags</h3>
            {followedTags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {followedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleUnfollowTag(tag)}
                    className="rounded-full border border-[#d8cab8] bg-[#ead9c7]/70 px-3 py-1 text-xs font-bold text-[#5f4631] transition hover:border-[#9f3d2e] hover:text-[#9f3d2e]"
                    title={`Unfollow #${tag}`}
                  >
                    #{tag} x
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-[#8b7f72]">
                Follow tags from tag pages to shape your home feed.
              </p>
            )}
          </div>

          <div className="mt-5 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4">
            <h3 className="text-sm font-bold text-[#352a20]">How to earn XP</h3>
            <div className="mt-3 space-y-1 text-xs font-semibold text-[#8b7f72]">
              {Object.entries(XP_ACTIONS).map(([action, points]) => (
                <p key={action}>
                  {action.replaceAll("_", " ")}: +{points} XP
                </p>
              ))}
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="mt-7 space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">Name</span>
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="field mt-2"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">
                  Profile picture
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setAvatarFile(event.target.files?.[0] ?? null)
                  }
                  className="field mt-2 file:mr-4 file:rounded-md file:border-0 file:bg-[#2f4638] file:px-4 file:py-2 file:font-bold file:text-[#fffaf2]"
                />
                {avatarFile ? (
                  <p className="mt-2 text-xs text-[#8b7f72]">
                    {avatarFile.name}
                  </p>
                ) : null}
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">Bio</span>
                <textarea
                  value={formBio}
                  onChange={(event) => setFormBio(event.target.value)}
                  className="field mt-2 min-h-24 resize-y"
                  placeholder="Short profile note..."
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button type="submit" className="primary-btn px-4 py-2.5">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="secondary-btn px-4 py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="secondary-btn mt-7 w-full px-4 py-2.5"
            >
              Edit profile
            </button>
          )}
        </aside>

        <section className="paper-card rounded-lg">
          <div className="border-b border-[#ded2c1] px-6 py-5">
            <h2 className="serif-title text-3xl font-bold text-[#25211d]">
              Your library
            </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["submissions", "Submissions"],
                ["published", "Published"],
                ["drafts", "Drafts"],
                ["reading-list", "Reading List"],
                ["achievements", "Achievements"],
                ["questions", "Questions"],
                ["continuations", "Pending continuations"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTabChange(value)}
                  className="rounded-full border px-4 py-2 text-sm font-bold transition"
                  style={{
                    borderColor:
                      activeTab === value ? "var(--accent)" : "var(--border)",
                    backgroundColor:
                      activeTab === value ? "var(--accent)" : "transparent",
                    color: activeTab === value ? "#fff" : "var(--text2)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4 p-6">
            {error ? <p className="text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

            {activeTab === "submissions" ? (
              posts.map((post) => (
                <div
                  key={post._id}
                  className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="serif-title text-2xl font-bold text-[#25211d]">
                        {post.title}
                      </h3>
                      <p className="mt-1 text-sm capitalize text-[#8b7f72]">
                        {post.type}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="inline-flex h-8 min-w-24 items-center justify-center rounded-full bg-[#ead9c7] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#8f5f35]">
                        {post.status}
                      </span>
                      <AppLink
                        href={`/write?edit=${post._id}`}
                        className="secondary-btn px-4 py-2 text-center text-sm"
                      >
                        Edit
                      </AppLink>
                      {["pending", "approved"].includes(post.status) ? (
                        <button
                          type="button"
                          onClick={() => setCritiquePostId(post._id)}
                          className="secondary-btn px-4 py-2 text-center text-sm"
                        >
                          View Critique
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {post.adminReviewComment ? (
                    <div className="mt-4 rounded-md border border-[#d8cab8] bg-[#f5f0e8] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                        Private editor note
                      </p>
                      <p className="mt-2 leading-7 text-[#5f4631]">
                        {post.adminReviewComment}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            ) : null}

            {activeTab === "published" ? (
              <div className="grid gap-6 md:grid-cols-2">
                {approvedPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            ) : null}

            {activeTab === "reading-list" ? (
              isLoadingBookmarks ? (
                <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                  Loading reading list...
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {bookmarks.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              )
            ) : null}

            {activeTab === "drafts" ? (
              isLoadingDrafts ? (
                <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                  Loading drafts...
                </p>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft._id}
                    className="flex flex-col justify-between gap-4 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 lg:flex-row lg:items-center"
                  >
                    <div>
                      <h3 className="serif-title text-2xl font-bold text-[#25211d]">
                        {draft.title}
                      </h3>
                      <p className="mt-1 text-sm text-[#8b7f72]">
                        Last saved{" "}
                        {draft.updatedAt
                          ? new Date(draft.updatedAt).toLocaleString()
                          : "recently"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <AppLink
                        href={`/write?draft=${draft._id}`}
                        className="secondary-btn px-4 py-2.5 text-center"
                      >
                        Continue Writing
                      </AppLink>
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(draft._id)}
                        className="rounded-md border border-[#9f3d2e]/35 px-4 py-2.5 text-sm font-bold text-[#9f3d2e] transition hover:bg-[#9f3d2e]/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : null}

            {activeTab === "achievements" ? (
              <BadgeDisplay badges={displayUser?.badges ?? []} size="lg" showAll />
            ) : null}

            {activeTab === "questions" ? (
              isLoadingQuestions ? (
                <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                  Loading questions...
                </p>
              ) : (
                questions.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5"
                  >
                    <blockquote className="border-l-4 border-[var(--accent)] pl-4 text-lg font-semibold leading-8 text-[#352a20]">
                      {item.question}
                    </blockquote>
                    <p className="mt-3 text-sm font-semibold text-[#8b7f72]">
                      Asked by {item.askedBy?.name ?? "Anonymous"}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAnswerForm(item._id)}
                      className="secondary-btn mt-4 px-4 py-2 text-sm"
                    >
                      Answer
                    </button>

                    {openQuestionId === item._id ? (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={answerText}
                          maxLength={1000}
                          onChange={(event) => setAnswerText(event.target.value)}
                          className="field min-h-28 resize-y"
                          placeholder="Write your answer..."
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm font-bold text-[#352a20]">
                            <input
                              type="checkbox"
                              checked={answerIsPublic}
                              onChange={(event) =>
                                setAnswerIsPublic(event.target.checked)
                              }
                            />
                            Make public
                          </label>
                          <span className="text-xs font-semibold text-[#8b7f72]">
                            {answerText.length}/1000
                          </span>
                          <button
                            type="button"
                            onClick={() => submitAnswer(item._id)}
                            className="primary-btn px-5 py-2.5 text-sm"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )
            ) : null}

            {activeTab === "continuations" ? (
              isLoadingContinuations ? (
                <p className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                  Loading continuations...
                </p>
              ) : (
                continuationInbox.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8f5f35]">
                      For {item.originalPost?.title ?? "your story"}
                    </p>
                    <h3 className="serif-title mt-2 text-2xl font-bold text-[#25211d]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#8b7f72]">
                      By {item.author?.name ?? "Unknown"}
                    </p>
                    <p className="mt-4 leading-7 text-[#6d6155]">
                      {item.excerpt}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reviewContinuation(item._id, "approve")}
                        className="primary-btn px-4 py-2 text-sm"
                      >
                        Approve as Official
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewContinuation(item._id, "reject")}
                        className="secondary-btn px-4 py-2 text-sm"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : null}

            {activeTab === "submissions" && posts.length === 0 && !error ? (
              <div className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                No submissions yet.{" "}
                <AppLink href="/write" className="font-bold text-[#2f4638]">
                  Write your first piece.
                </AppLink>
              </div>
            ) : null}

            {activeTab === "published" && approvedPosts.length === 0 && !error ? (
              <div className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                No approved posts yet.
              </div>
            ) : null}

            {activeTab === "reading-list" &&
            !isLoadingBookmarks &&
            bookmarks.length === 0 &&
            !error ? (
              <div className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                Your reading list is empty. Bookmark stories to read later.
              </div>
            ) : null}

            {activeTab === "drafts" &&
            !isLoadingDrafts &&
            drafts.length === 0 &&
            !error ? (
              <div className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                No drafts yet.{" "}
                <AppLink href="/write" className="font-bold text-[#2f4638]">
                  Start writing!
                </AppLink>
              </div>
            ) : null}

            {activeTab === "questions" &&
            !isLoadingQuestions &&
            questions.length === 0 &&
            !error ? (
              <div className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                No unanswered questions.
              </div>
            ) : null}

            {activeTab === "continuations" &&
            !isLoadingContinuations &&
            continuationInbox.length === 0 &&
            !error ? (
              <div className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-5 text-[#6d6155]">
                No pending continuations.
              </div>
            ) : null}
          </div>
        </section>
      </section>
      <UserConnectionsModal
        isOpen={Boolean(connectionsType)}
        onClose={() => setConnectionsType("")}
        type={connectionsType}
        userId={displayUser?.id ?? displayUser?._id}
      />
      {critiquePostId ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(44,36,22,0.6)] px-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[6px] border bg-[var(--bg2)] p-6 shadow-[0_20px_60px_rgba(44,36,22,0.25)]" style={{ borderColor: "var(--border)" }}>
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setCritiquePostId("")}
                className="secondary-btn px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>
            <CritiqueReport postId={critiquePostId} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
