import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { navigate } from "../../lib/navigation";
import AIAssistant from "../../components/AIAssistant";
import RevisionHistory from "../../components/RevisionHistory";
import WritingStats from "../../components/WritingStats";
import ReadabilityScore from "../../components/ReadabilityScore";
import { LANGUAGES, isRTL } from "../../lib/languages";
import VoiceInput from "../../components/VoiceInput";
import TemplateSelector from "../../components/TemplateSelector";

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Something failed";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function showWritingStreakToast(profileUser) {
  const streak = Number(profileUser?.currentStreak ?? 0);
  if (streak > 1) {
    toast.success(`🔥 ${streak} day writing streak! Keep it up!`);
  } else if (streak === 1) {
    toast.success("Writing streak started! Come back tomorrow to keep it going 🔥");
  }
}

function countWords(value) {
  const plainText = String(value ?? "").replace(/<[^>]+>/g, "").trim();
  return plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
}

const CONTENT_WARNING_OPTIONS = [
  "Violence",
  "Mature themes",
  "Strong language",
  "Psychological horror",
  "Grief and loss",
  "Substance use",
];

export default function WritePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [draftId, setDraftId] = useState(null);
  const [editingMode, setEditingMode] = useState(false);
  const [loadedPost, setLoadedPost] = useState(null);
  const [coAuthorEmail, setCoAuthorEmail] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("story");
  const [language, setLanguage] = useState("en");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [coverImage, setCoverImage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [userSeries, setUserSeries] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDescription, setNewSeriesDescription] = useState("");
  const [seriesOrder, setSeriesOrder] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [templateSelected, setTemplateSelected] = useState(false);
  const [contentWarnings, setContentWarnings] = useState([]);
  const [multiChapterMode, setMultiChapterMode] = useState(false);
  const [chapters, setChapters] = useState([
    { title: "", content: "" },
    { title: "", content: "" },
  ]);
  const [focusMode, setFocusMode] = useState(false);
  const contentTextareaRef = useRef(null);
  const inlineImageInputRef = useRef(null);
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState("");

  const uploadMedia = useCallback(async () => {
    if (!imageFile && !videoFile) {
      return { coverImage, videoUrl };
    }

    const formData = new FormData();
    if (imageFile) formData.append("image", imageFile);
    if (videoFile) formData.append("video", videoFile);

    const mediaRes = await api.post("/api/posts/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const nextCoverImage = mediaRes.data.coverImage || coverImage;
    const nextVideoUrl = mediaRes.data.videoUrl || videoUrl;
    setCoverImage(nextCoverImage);
    setVideoUrl(nextVideoUrl);
    setImageFile(null);
    setVideoFile(null);

    return { coverImage: nextCoverImage, videoUrl: nextVideoUrl };
  }, [coverImage, imageFile, videoFile, videoUrl]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    let cancelled = false;

    void (async () => {
      try {
        const [seriesRes, groupsRes] = await Promise.all([
          api.get("/api/series"),
          api.get("/api/groups/mine"),
        ]);
        if (cancelled) return;

        const mine = (seriesRes.data.series ?? []).filter(
          (item) => String(item.author?._id ?? item.author?.id) === String(user?.id),
        );
        setUserSeries(mine);
        setUserGroups(groupsRes.data.groups ?? []);
      } catch {
        // Series is optional while writing; keep the form usable if this fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user?.id]);

  useEffect(() => {
    if (focusMode) {
      document.body.classList.add("focus-mode");
    } else {
      document.body.classList.remove("focus-mode");
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") setFocusMode(false);
    };

    if (focusMode) window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("focus-mode");
    };
  }, [focusMode]);

  const resolveSeriesId = async () => {
    const title = newSeriesTitle.trim();
    if (title) {
      const res = await api.post("/api/series", {
        title,
        description: newSeriesDescription,
        coverImage,
      });
      const createdSeries = res.data.series;
      setUserSeries((current) => [createdSeries, ...current]);
      setNewSeriesTitle("");
      setNewSeriesDescription("");
      setSelectedSeriesId(createdSeries._id);
      return createdSeries._id;
    }

    return selectedSeriesId || "";
  };

  const attachPostToSeries = async (postId) => {
    const seriesId = await resolveSeriesId();
    if (!seriesId) return;

    await api.post(`/api/series/${seriesId}/posts`, {
      postId,
      order: seriesOrder ? Number(seriesOrder) : undefined,
    });
  };

  const savePostPoll = async (postId) => {
    if (!pollEnabled) return;

    const question = pollQuestion.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);

    if (!question) throw new Error("Poll question is required");
    if (question.length > 200) {
      throw new Error("Poll question must be 200 characters or less");
    }
    if (options.length < 2) throw new Error("Add at least two poll options");

    await api.post(`/api/posts/${postId}/poll`, { question, options });
  };

  const saveDraft = useCallback(
    async ({
      includeMedia = false,
      showMessage = false,
      statusOverride = "draft",
    } = {}) => {
      if (!isAuthenticated) {
        navigate("/login");
        return null;
      }

      const chapterPayload = chapters
        .map((chapter) => ({
          title: chapter.title.trim(),
          content: chapter.content,
        }))
        .filter((chapter) => chapter.title || chapter.content.trim());
      const effectiveContent = multiChapterMode
        ? chapterPayload[0]?.content ?? ""
        : content;

      if (!title.trim() && !effectiveContent.trim()) return null;

      setError("");
      if (showMessage) setIsSaving(true);
      setAutoSaveStatus("saving");

      try {
        const media = includeMedia
          ? await uploadMedia()
          : { coverImage, videoUrl };
        const payload = {
          title,
          type,
          content: effectiveContent,
          hasChapters: multiChapterMode,
          chapters: multiChapterMode ? chapterPayload : [],
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          contentWarnings,
          language,
          coverImage: media.coverImage,
          videoUrl: media.videoUrl,
          scheduledAt: scheduleEnabled && scheduledAt ? scheduledAt : null,
          status: statusOverride,
          groupId: selectedGroupId || null,
        };

        const res = draftId
          ? await api.put(`/api/posts/${draftId}`, payload)
          : await api.post("/api/posts", payload);

      const savedPost = res.data.post;
      setDraftId(savedPost?._id ?? draftId);
      if (savedPost?.coverImage) {
        setCoverImage(savedPost.coverImage);
      }
      if (savedPost?.coAuthors || savedPost?.coAuthorInvites) {
        setLoadedPost(savedPost);
      }
        setAutoSaveStatus("saved");
        setLastSavedAt(new Date());
        if (showMessage) {
          setMessage(
            statusOverride === "draft"
              ? "Draft saved."
              : "Changes saved and sent for review.",
          );
        }
        return savedPost;
      } catch (err) {
        setAutoSaveStatus("idle");
        setError(getErrorMessage(err));
        return null;
      } finally {
        if (showMessage) setIsSaving(false);
      }
    },
    [
      content,
      contentWarnings,
      coverImage,
      chapters,
      draftId,
      isAuthenticated,
      multiChapterMode,
      scheduleEnabled,
      scheduledAt,
      selectedGroupId,
      tags,
      title,
      type,
      language,
      uploadMedia,
      videoUrl,
    ],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;

    const params = new window.URLSearchParams(window.location.search);
    const challengeId = params.get("challenge");
    if (challengeId) {
      setTags((current) => {
        const challengeTag = `challenge:${challengeId}`;
        const tagsList = current
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        return tagsList.includes(challengeTag)
          ? current
          : [...tagsList, challengeTag].join(", ");
      });
    }

    const editId = params.get("edit");
    const draftParam = params.get("draft");
    const id = editId || draftParam;
    if (!id) return;
    setTemplateSelected(true);
    setEditingMode(Boolean(editId));

    let cancelled = false;
    setIsLoadingDraft(true);
    setError("");

    void (async () => {
      try {
        const res = await api.get(`/api/posts/${id}`);
        const post = res.data.post;
        if (cancelled) return;

        setLoadedPost(post);
        setDraftId(post._id);
        setTitle(post.title === "Untitled draft" ? "" : post.title ?? "");
        setType(post.type ?? "story");
        setLanguage(post.language ?? "en");
        setContent(post.content ?? "");
        setMultiChapterMode(Boolean(post.hasChapters));
        setChapters(
          post.hasChapters && post.chapters?.length
            ? post.chapters.map((chapter) => ({
                title: chapter.title ?? "",
                content: chapter.content ?? "",
              }))
            : [
                { title: "", content: "" },
                { title: "", content: "" },
              ],
        );
        setTags((post.tags ?? []).join(", "));
        setContentWarnings(post.contentWarnings ?? []);
        setCoverImage(post.coverImage ?? "");
        setVideoUrl(post.videoUrl ?? "");
        if (post.scheduledAt) {
          setScheduleEnabled(true);
          setScheduledAt(new Date(post.scheduledAt).toISOString().slice(0, 16));
        }
        setSelectedSeriesId(post.series?._id ?? post.series ?? "");
        setSelectedGroupId(post.group?._id ?? post.group ?? "");
        setSeriesOrder(
          Number.isFinite(post.seriesOrder) ? String(post.seriesOrder) : "",
        );
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoadingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading || isLoadingDraft || !isAuthenticated) return undefined;
    if (editingMode) return undefined;
    const hasChapterContent = chapters.some(
      (chapter) => chapter.title.trim() || chapter.content.trim(),
    );
    if (!title.trim() && !content.trim() && !hasChapterContent) return undefined;

    const timeout = window.setTimeout(() => {
      void saveDraft();
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    content,
    chapters,
    isAuthenticated,
    isLoading,
    isLoadingDraft,
    editingMode,
    multiChapterMode,
    saveDraft,
    tags,
    title,
    type,
  ]);

  const handleSaveDraft = async () => {
    setMessage("");
    await saveDraft({
      includeMedia: true,
      showMessage: true,
      statusOverride: editingMode ? "pending" : "draft",
    });
  };

  const inviteCoAuthor = async () => {
    if (!draftId || !coAuthorEmail.trim()) return;

    setError("");
    try {
      await api.post(`/api/posts/${draftId}/invite-coauthor`, {
        email: coAuthorEmail.trim(),
      });
      setCoAuthorEmail("");
      toast.success("Invitation sent!");
      const res = await api.get(`/api/posts/${draftId}`);
      setLoadedPost(res.data.post);
    } catch (err) {
      const messageText = getErrorMessage(err);
      setError(messageText);
      toast.error(messageText);
    }
  };

  const removeCoAuthor = async (coAuthorId) => {
    if (!draftId) return;

    setError("");
    try {
      const res = await api.delete(`/api/posts/${draftId}/coauthors/${coAuthorId}`);
      setLoadedPost(res.data.post);
      toast.success("Co-author removed");
    } catch (err) {
      const messageText = getErrorMessage(err);
      setError(messageText);
      toast.error(messageText);
    }
  };

  const handleSubmitForReview = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      const savedPost = await saveDraft({
        includeMedia: true,
        statusOverride: editingMode ? "pending" : "draft",
      });
      const id = savedPost?._id ?? draftId;
      if (!id) throw new Error("Save your draft before submitting");

      await attachPostToSeries(id);
      await savePostPoll(id);
      await api.post(`/api/posts/${id}/submit`, {
        scheduledAt: scheduleEnabled && scheduledAt ? scheduledAt : null,
      });
      try {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 250);
        });
        const profileRes = await api.get("/api/users/me");
        showWritingStreakToast(profileRes.data.user);
      } catch {
        // Streak toast is non-critical.
      }
      navigate("/browse");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduleInPast =
    scheduleEnabled &&
    (!scheduledDate ||
      Number.isNaN(scheduledDate.getTime()) ||
      scheduledDate <= new Date());
  const isOriginalAuthor =
    String(loadedPost?.author?._id ?? loadedPost?.author) === String(user?.id);
  const coAuthors = loadedPost?.coAuthors ?? [];
  const pendingInvites = (loadedPost?.coAuthorInvites ?? []).filter(
    (invite) => invite.status === "pending",
  );
  const suggestionWordCount = countWords(getSuggestionContent());
  const canRequestTagSuggestions =
    Boolean(title.trim()) && suggestionWordCount >= 200 && !suggestionsLoading;

  const updatePollOption = (index, value) => {
    setPollOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  };

  const addPollOption = () => {
    setPollOptions((current) =>
      current.length >= 4 ? current : [...current, ""],
    );
  };

  const removePollOption = (index) => {
    setPollOptions((current) =>
      current.length <= 2
        ? current
        : current.filter((_option, optionIndex) => optionIndex !== index),
    );
  };

  const insertTranscript = useCallback((text) => {
    const transcript = String(text ?? "").trim();
    if (!transcript) return;

    const textarea = contentTextareaRef.current;
    setContent((current) => {
      if (!textarea) return current ? `${current} ${transcript} ` : `${transcript} `;

      const start = textarea.selectionStart ?? current.length;
      const end = textarea.selectionEnd ?? start;
      const prefix = current.slice(0, start);
      const suffix = current.slice(end);
      const spacerBefore = prefix && !/\s$/.test(prefix) ? " " : "";
      const spacerAfter = suffix && !/^\s/.test(suffix) ? " " : "";
      const insertion = `${spacerBefore}${transcript} ${spacerAfter}`;
      const nextValue = `${prefix}${insertion}${suffix}`;
      const nextCursor = prefix.length + insertion.length;

      window.requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      });

      return nextValue;
    });
  }, []);

  const insertContentAtCursor = useCallback((insertedContent) => {
    const textarea = contentTextareaRef.current;
    setContent((current) => {
      if (!textarea) return current ? `${current}\n\n${insertedContent}` : insertedContent;

      const start = textarea.selectionStart ?? current.length;
      const end = textarea.selectionEnd ?? start;
      const prefix = current.slice(0, start);
      const suffix = current.slice(end);
      const spacerBefore = prefix && !/\n\n$/.test(prefix) ? "\n\n" : "";
      const spacerAfter = suffix && !/^\n\n/.test(suffix) ? "\n\n" : "";
      const insertion = `${spacerBefore}${insertedContent}${spacerAfter}`;
      const nextValue = `${prefix}${insertion}${suffix}`;
      const nextCursor = prefix.length + insertion.length;

      window.requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      });

      return nextValue;
    });
  }, []);

  const handleInlineImageSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingInlineImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/api/posts/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.url;
      if (!url) throw new Error("Upload did not return an image URL");

      insertContentAtCursor(`<img src="${url}" alt="" />`);
      toast.success("Image inserted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsUploadingInlineImage(false);
    }
  };

  const insertCodeBlock = () => {
    const textarea = contentTextareaRef.current;
    const selectedText = textarea
      ? content.slice(textarea.selectionStart ?? 0, textarea.selectionEnd ?? 0)
      : "";
    const code = selectedText || "// Write code here";

    insertContentAtCursor(
      `<pre><code class="language-javascript">${escapeHtml(code)}</code></pre>`,
    );
  };

  const handleTemplateSelect = (template) => {
    setTemplateSelected(true);
    if (!template || template.id === "blank") return;
    setType(template.type);
    setContent(template.content);
  };

  function getSuggestionContent() {
    if (!multiChapterMode) return content;
    return chapters
      .map((chapter) => `${chapter.title}\n${chapter.content}`)
      .join("\n\n");
  }

  const requestTagSuggestions = async () => {
    const suggestionContent = getSuggestionContent();
    if (!title.trim()) {
      toast.error("Add a title before requesting tag suggestions");
      return;
    }
    if (countWords(suggestionContent) < 200) {
      toast.error("Write at least 200 words before requesting tag suggestions");
      return;
    }

    setSuggestionsLoading(true);
    setError("");
    try {
      const res = await api.post("/api/posts/suggest-tags", {
        title,
        content: suggestionContent,
        type,
      });
      const currentTags = tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      const suggestions = (res.data.suggestions ?? []).filter(
        (tag) => !currentTags.includes(String(tag).toLowerCase()),
      );
      setTagSuggestions(suggestions);
      if (suggestions.length === 0) {
        toast("No new tag suggestions found");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const addSuggestedTag = (tag) => {
    const cleanTag = String(tag ?? "").trim();
    if (!cleanTag) return;

    setTags((current) => {
      const currentTags = current
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (currentTags.some((item) => item.toLowerCase() === cleanTag.toLowerCase())) {
        return current;
      }
      return [...currentTags, cleanTag].join(", ");
    });
    setTagSuggestions((current) => current.filter((item) => item !== tag));
  };

  const dismissSuggestedTag = (tag) => {
    setTagSuggestions((current) => current.filter((item) => item !== tag));
  };

  const handleGenerateCover = async () => {
    if (!title.trim()) {
      toast.error("Add a title before generating cover art");
      return;
    }

    setGeneratingCover(true);
    setError("");
    try {
      const savedPost = await saveDraft({
        includeMedia: false,
        showMessage: false,
        statusOverride: editingMode ? "pending" : "draft",
      });
      const id = savedPost?._id ?? draftId;
      if (!id) throw new Error("Save your draft before generating cover art");

      const res = await api.post(`/api/posts/${id}/generate-cover`);
      const nextCoverImage = res.data.coverImage;
      if (!nextCoverImage) throw new Error("No cover image was generated");

      setCoverImage(nextCoverImage);
      setGeneratedCoverUrl(nextCoverImage);
      setImageFile(null);
      toast.success("Cover art generated!");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setError(getErrorMessage(err));
    } finally {
      setGeneratingCover(false);
    }
  };

  const toggleContentWarning = (warning) => {
    setContentWarnings((current) =>
      current.includes(warning)
        ? current.filter((item) => item !== warning)
        : [...current, warning],
    );
  };

  const updateChapter = (index, field, value) => {
    setChapters((current) =>
      current.map((chapter, chapterIndex) =>
        chapterIndex === index ? { ...chapter, [field]: value } : chapter,
      ),
    );
  };

  const addChapter = () => {
    setChapters((current) => [...current, { title: "", content: "" }]);
  };

  const removeChapter = (index) => {
    setChapters((current) =>
      current.length <= 1
        ? current
        : current.filter((_chapter, chapterIndex) => chapterIndex !== index),
    );
  };

  const moveChapter = (index, direction) => {
    setChapters((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  if (!isLoading && user?.role === "admin") {
    return (
      <main className="editorial-shell py-12">
        <section className="paper-card mx-auto max-w-2xl rounded-lg p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
            Admin account
          </p>
          <h1 className="serif-title mt-3 text-4xl font-bold text-[#25211d]">
            Admins cannot post stories or blogs.
          </h1>
          <p className="mt-4 text-[#6d6155]">
            Use the admin panel to review, approve, feature, or moderate user
            content.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="primary-btn mt-6 px-5 py-3"
          >
            Open Admin Panel
          </button>
        </section>
      </main>
    );
  }

  const focusWordCount = multiChapterMode
    ? chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0)
    : countWords(content);
  const canUseFocusMode = templateSelected || draftId || editingMode;

  return (
    <main className="editorial-shell grid gap-8 py-12 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="write-chrome lg:pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Writer desk
        </p>
        <h1 className="serif-title mt-3 text-5xl font-bold leading-tight text-[#25211d]">
          {editingMode
            ? "Refine your posted piece."
            : "Shape your draft into a story worth reading."}
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#6d6155]">
          {editingMode
            ? "Update your story or blog, then send the revised version for review."
            : "Add a title, choose story or blog, attach an image or video from your system, then send it for review."}
        </p>
      </aside>

      <section className="write-editor-area paper-card rounded-lg p-6 sm:p-8">
        {focusMode ? (
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="fixed right-5 top-5 z-[130] rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            Exit focus mode
          </button>
        ) : null}
        {!isLoading && !isAuthenticated ? (
          <div className="write-chrome mb-6 rounded-md border border-[#d8cab8] bg-[#ead9c7]/60 px-4 py-3 text-sm font-semibold text-[#5a3a22]">
            Login is required only when you want to write or submit.
          </div>
        ) : null}

        <form onSubmit={handleSubmitForReview} className="flex flex-col gap-6">
          <div className="write-chrome flex min-h-9 items-center justify-between gap-3">
            {draftId ? (
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="secondary-btn px-4 py-2 text-sm"
              >
                History
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {canUseFocusMode ? (
                <button
                  type="button"
                  onClick={() => setFocusMode(true)}
                  className="secondary-btn px-4 py-2 text-sm"
                >
                  Focus mode
                </button>
              ) : null}
              <p className="text-right text-xs font-semibold text-[#8b7f72]">
                {autoSaveStatus === "saving" ? "Saving..." : null}
                {autoSaveStatus === "saved" && lastSavedAt
                  ? `${editingMode ? "Changes saved" : "Draft saved"} ${lastSavedAt.toLocaleTimeString()}`
                  : null}
              </p>
            </div>
          </div>

          {!templateSelected && !draftId && !editingMode ? (
            <div className="write-chrome contents">
              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">
                  What are you writing?
                </span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="field mt-2"
                >
                  <option value="story">Story</option>
                  <option value="blog">Blog</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">Language</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="field mt-2"
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.nativeName}
                    </option>
                  ))}
                </select>
              </label>
              <TemplateSelector
                onSelect={handleTemplateSelect}
                selectedType={type}
              />
            </div>
          ) : null}

          {templateSelected || draftId || editingMode ? (
            <>
          <label className="write-title-field block">
            <span className="text-sm font-bold text-[#352a20]">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="field mt-2"
              placeholder="Give your piece a clear title"
              required
            />
          </label>

          <label className="write-chrome block">
            <span className="text-sm font-bold text-[#352a20]">Format</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="field mt-2"
            >
              <option value="story">Story</option>
              <option value="blog">Blog</option>
            </select>
          </label>

          <section className="write-chrome rounded-lg border border-[#ded2c1] bg-[#fffaf2]/55 p-4">
            <label className="flex items-center gap-3 text-sm font-bold text-[#352a20]">
              <input
                type="checkbox"
                checked={multiChapterMode}
                onChange={(event) => setMultiChapterMode(event.target.checked)}
              />
              Multi-chapter mode
            </label>
            <p className="mt-2 text-xs text-[#8b7f72]">
              Split this story into chapters readers can navigate one at a time.
            </p>
          </section>

          {!multiChapterMode ? (
          <label className="write-body-field block">
            <span className="text-sm font-bold text-[#352a20]">Body</span>
            <div className="mt-2 overflow-hidden rounded-md border border-[#ded2c1]">
              <div className="write-editor-toolbar border-b border-[#ded2c1]">
                <AIAssistant
                  content={content}
                  onInsert={(text) =>
                    setContent((current) =>
                      current ? `${current}\n\n${text}` : text,
                    )
                  }
                />
                <div className="flex justify-end bg-[#fffaf2]/70 px-3 py-2">
                  <input
                    ref={inlineImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleInlineImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => inlineImageInputRef.current?.click()}
                    disabled={isUploadingInlineImage}
                    className="secondary-btn mr-2 px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    {isUploadingInlineImage ? "Uploading..." : "Insert Image"}
                  </button>
                  <button
                    type="button"
                    onClick={insertCodeBlock}
                    className="secondary-btn mr-2 px-3 py-1.5 text-sm"
                  >
                    Code block
                  </button>
                  <VoiceInput onTranscript={insertTranscript} />
                </div>
              </div>
            <textarea
              ref={contentTextareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              dir={isRTL(language) ? "rtl" : "ltr"}
                className="field min-h-[320px] resize-y border-0 leading-7"
              placeholder="Start writing..."
              required
            />
              <WritingStats content={content} />
              <ReadabilityScore content={content} />
            </div>
          </label>
          ) : (
            <section className="write-body-field space-y-4">
              <div className="write-chrome flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="serif-title text-2xl font-bold text-[#25211d]">
                    Chapters
                  </h2>
                  <p className="mt-1 text-sm text-[#8b7f72]">
                    Use arrows to reorder chapters before publishing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addChapter}
                  className="secondary-btn px-4 py-2 text-sm"
                >
                  Add chapter
                </button>
              </div>

              {chapters.map((chapter, index) => (
                <details
                  key={index}
                  open={index === 0}
                  className="rounded-lg border border-[#ded2c1] bg-[#fffaf2]/60 p-4"
                >
                  <summary className="cursor-pointer font-bold text-[#352a20]">
                    Chapter {index + 1}
                    {chapter.title ? ` - ${chapter.title}` : ""}
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="write-chrome flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveChapter(index, -1)}
                        disabled={index === 0}
                        className="secondary-btn px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChapter(index, 1)}
                        disabled={index === chapters.length - 1}
                        className="secondary-btn px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        Down
                      </button>
                      {chapters.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeChapter(index)}
                          className="rounded-md border border-[#9f3d2e]/35 px-3 py-1.5 text-sm font-bold text-[#9f3d2e]"
                        >
                          Remove chapter
                        </button>
                      ) : null}
                    </div>
                    <label className="block">
                      <span className="text-sm font-bold text-[#352a20]">
                        Chapter title
                      </span>
                      <input
                        value={chapter.title}
                        onChange={(event) =>
                          updateChapter(index, "title", event.target.value)
                        }
                        className="field mt-2"
                        placeholder={`Chapter ${index + 1}`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-[#352a20]">
                        Chapter content
                      </span>
                      <textarea
                        value={chapter.content}
                        onChange={(event) =>
                          updateChapter(index, "content", event.target.value)
                        }
                        className="field mt-2 min-h-[260px] resize-y leading-7"
                        placeholder="Write this chapter..."
                      />
                    </label>
                    <WritingStats content={chapter.content} />
                    <ReadabilityScore content={chapter.content} />
                  </div>
                </details>
              ))}
            </section>
          )}

          <section className="write-chrome rounded-lg border border-[#ded2c1] bg-[#fffaf2]/55 p-5">
            <label className="flex items-center gap-3 text-sm font-bold text-[#352a20]">
              <input
                type="checkbox"
                checked={pollEnabled}
                onChange={(event) => setPollEnabled(event.target.checked)}
              />
              Add a poll
            </label>

            {pollEnabled ? (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-[#352a20]">
                    Poll question
                  </span>
                  <input
                    value={pollQuestion}
                    maxLength={200}
                    onChange={(event) => setPollQuestion(event.target.value)}
                    className="field mt-2"
                    placeholder="Ask readers to vote..."
                  />
                  <span className="mt-1 block text-xs text-[#8b7f72]">
                    {pollQuestion.length}/200
                  </span>
                </label>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-[#352a20]">Options</p>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={option}
                        onChange={(event) =>
                          updatePollOption(index, event.target.value)
                        }
                        className="field"
                        placeholder={`Option ${index + 1}`}
                      />
                      {pollOptions.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => removePollOption(index)}
                          className="rounded-md border border-[#9f3d2e]/35 px-3 text-sm font-bold text-[#9f3d2e]"
                        >
                          x
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addPollOption}
                  disabled={pollOptions.length >= 4}
                  className="secondary-btn px-4 py-2 text-sm disabled:opacity-60"
                >
                  Add option
                </button>
              </div>
            ) : null}
          </section>

          <section className="write-chrome block">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="block flex-1">
                <span className="text-sm font-bold text-[#352a20]">Tags</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className="field mt-2"
                  placeholder="mystery, memory, city"
                />
              </label>
              <button
                type="button"
                onClick={requestTagSuggestions}
                disabled={!canRequestTagSuggestions}
                className="secondary-btn px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                title={
                  suggestionWordCount < 200
                    ? "Write at least 200 words first"
                    : undefined
                }
              >
                {suggestionsLoading ? "Analysing your content..." : "Get tag suggestions"}
              </button>
            </div>

            {tagSuggestions.length > 0 ? (
              <div className="mt-3 rounded-md border border-[#ded2c1] bg-[#fffaf2]/70 p-3">
                <p className="text-xs italic text-[#8b7f72]">
                  AI-suggested tags — click to add
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tagSuggestions.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-[#d4c9b5] bg-[#f0e8d8] px-2.5 py-1 text-xs font-bold text-[#7a4f2d]"
                    >
                      <button
                        type="button"
                        onClick={() => addSuggestedTag(tag)}
                        className="font-bold"
                        title={`Add ${tag}`}
                      >
                        + {tag}
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissSuggestedTag(tag)}
                        className="pl-1 text-[#8b7f72] hover:text-[#9f3d2e]"
                        aria-label={`Dismiss ${tag}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="write-chrome rounded-lg border border-[#ded2c1] bg-[#fffaf2]/55 p-5">
            <h2 className="serif-title text-2xl font-bold text-[#25211d]">
              Content warnings
            </h2>
            <p className="mt-1 text-sm text-[#8b7f72]">
              Select any themes readers should know before opening the post.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CONTENT_WARNING_OPTIONS.map((warning) => (
                <label
                  key={warning}
                  className="flex items-center gap-3 rounded-md border border-[#ded2c1] bg-[#fffaf2]/70 px-3 py-2 text-sm font-bold text-[#352a20]"
                >
                  <input
                    type="checkbox"
                    checked={contentWarnings.includes(warning)}
                    onChange={() => toggleContentWarning(warning)}
                  />
                  {warning}
                </label>
              ))}
            </div>
          </section>

          <label className="write-chrome block">
            <span className="text-sm font-bold text-[#352a20]">
              Post to group
            </span>
            <select
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className="field mt-2"
            >
              <option value="">No group</option>
              {userGroups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          {editingMode && draftId ? (
            <section className="write-chrome rounded-lg border border-[#ded2c1] bg-[#fffaf2]/55 p-5">
              <h2 className="serif-title text-2xl font-bold text-[#25211d]">
                Co-authors
              </h2>
              <p className="mt-1 text-sm text-[#8b7f72]">
                Invite another writer to help edit this post.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {coAuthors.length > 0 ? (
                  coAuthors.map((coAuthor) => (
                    <span
                      key={coAuthor._id}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ded2c1] bg-[#fffaf2] px-3 py-1.5 text-sm font-bold text-[#352a20]"
                    >
                      {coAuthor.avatar ? (
                        <img
                          src={coAuthor.avatar}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ead9c7] text-xs text-[#8f5f35]">
                          {(coAuthor.name ?? "C").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {coAuthor.name}
                      {isOriginalAuthor ? (
                        <button
                          type="button"
                          onClick={() => removeCoAuthor(coAuthor._id)}
                          className="ml-1 text-[#9f3d2e]"
                          aria-label={`Remove ${coAuthor.name}`}
                        >
                          x
                        </button>
                      ) : null}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[#8b7f72]">No co-authors yet.</p>
                )}
              </div>

              {pendingInvites.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
                    Pending invites
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pendingInvites.map((invite) => (
                      <span
                        key={invite.user?._id ?? invite.user}
                        className="rounded-full bg-[#ead9c7] px-3 py-1 text-xs font-bold text-[#8f5f35]"
                      >
                        {invite.user?.name ?? invite.user?.email ?? "Invited user"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {isOriginalAuthor ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    value={coAuthorEmail}
                    onChange={(event) => setCoAuthorEmail(event.target.value)}
                    className="field"
                    placeholder="coauthor@example.com"
                  />
                  <button
                    type="button"
                    onClick={inviteCoAuthor}
                    className="secondary-btn px-5 py-3"
                  >
                    Invite
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="write-chrome rounded-lg border border-[#ded2c1] bg-[#fffaf2]/55 p-5">
            <h2 className="serif-title text-2xl font-bold text-[#25211d]">
              Add to Series
            </h2>
            <p className="mt-1 text-sm text-[#8b7f72]">
              Group this post with related stories or blogs.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_140px]">
              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">
                  Existing series
                </span>
                <select
                  value={selectedSeriesId}
                  onChange={(event) => setSelectedSeriesId(event.target.value)}
                  className="field mt-2"
                  disabled={Boolean(newSeriesTitle.trim())}
                >
                  <option value="">No series</option>
                  {userSeries.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">Part</span>
                <input
                  type="number"
                  min="1"
                  value={seriesOrder}
                  onChange={(event) => setSeriesOrder(event.target.value)}
                  className="field mt-2"
                  placeholder="1"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">
                  New series title
                </span>
                <input
                  value={newSeriesTitle}
                  onChange={(event) => setNewSeriesTitle(event.target.value)}
                  className="field mt-2"
                  placeholder="Create a new collection"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#352a20]">
                  Description
                </span>
                <input
                  value={newSeriesDescription}
                  onChange={(event) => setNewSeriesDescription(event.target.value)}
                  className="field mt-2"
                  placeholder="Optional note"
                />
              </label>
            </div>
          </section>

          <div className="write-chrome grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#352a20]">
                Cover image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] ?? null);
                  setGeneratedCoverUrl("");
                }}
                className="field mt-2 file:mr-4 file:rounded-md file:border-0 file:bg-[#2f4638] file:px-4 file:py-2 file:font-bold file:text-[#fffaf2]"
              />
              {imageFile ? (
                <p className="mt-2 text-xs text-[#8b7f72]">{imageFile.name}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateCover}
                  disabled={generatingCover || !title.trim()}
                  className="secondary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatingCover
                    ? "Painting your cover... (this takes ~20 seconds)"
                    : "Generate with AI"}
                </button>
                <span className="text-xs italic text-[#8b7f72]">
                  AI-generated using DALL-E 3. You can replace this with your own image.
                </span>
              </div>
              {(generatedCoverUrl || coverImage) && !imageFile ? (
                <div className="mt-4 overflow-hidden rounded-md border border-[#ded2c1] bg-[#fffaf2]">
                  <img
                    src={generatedCoverUrl || coverImage}
                    alt="Cover preview"
                    className="max-h-72 w-full object-contain opacity-100 mix-blend-normal filter-none"
                    style={{ filter: "none" }}
                  />
                </div>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#352a20]">Video</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                className="field mt-2 file:mr-4 file:rounded-md file:border-0 file:bg-[#2f4638] file:px-4 file:py-2 file:font-bold file:text-[#fffaf2]"
              />
              {videoFile ? (
                <p className="mt-2 text-xs text-[#8b7f72]">{videoFile.name}</p>
              ) : null}
            </label>
          </div>

          {error ? <p className="write-chrome text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}
          {message ? <p className="write-chrome text-sm font-semibold text-[#5f7263]">{message}</p> : null}

          <div className="write-chrome flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting || isLoading || isLoadingDraft}
              className="secondary-btn w-full px-5 py-3.5 sm:w-auto"
            >
              {isSaving ? "Saving..." : editingMode ? "Save Changes" : "Save Draft"}
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isSaving ||
                isLoading ||
                isLoadingDraft ||
                isScheduleInPast
              }
              className="primary-btn w-full px-5 py-3.5 sm:w-auto"
            >
              {isSubmitting
                ? "Submitting..."
                : editingMode
                  ? "Submit Changes"
                  : "Submit for Review"}
            </button>
          </div>

          <div className="write-chrome rounded-lg border border-[#ded2c1] bg-[#fffaf2]/55 p-4">
            <label className="flex items-center gap-3 text-sm font-bold text-[#352a20]">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(event) => setScheduleEnabled(event.target.checked)}
              />
              Schedule for later
            </label>
            {scheduleEnabled ? (
              <div className="mt-4">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="field"
                />
                <p className="mt-2 text-xs text-[#8b7f72]">
                  Your post will be reviewed, then published automatically at
                  your chosen time
                </p>
                {isScheduleInPast ? (
                  <p className="mt-2 text-xs font-semibold text-[#9f3d2e]">
                    Choose a future date and time before submitting.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
            </>
          ) : null}
        </form>
        {focusMode ? (
          <div className="fixed bottom-5 left-1/2 z-[130] -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur">
            {focusWordCount} {focusWordCount === 1 ? "word" : "words"}
          </div>
        ) : null}
      </section>

      {showHistory && draftId ? (
        <RevisionHistory
          postId={draftId}
          onClose={() => setShowHistory(false)}
          onRestore={(post) => {
            setTitle(post.title === "Untitled draft" ? "" : post.title ?? "");
            setContent(post.content ?? "");
            setMessage("Version restored.");
          }}
        />
      ) : null}
    </main>
  );
}
