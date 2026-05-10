"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown date";
}

export default function RevisionHistory({ postId, onRestore, onClose }) {
  const [revisions, setRevisions] = useState([]);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/posts/${postId}/revisions`);
        if (!cancelled) setRevisions(res.data.revisions ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Failed to load revision history",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handlePreview = async (revisionId) => {
    setError("");
    try {
      const res = await api.get(`/api/posts/${postId}/revisions/${revisionId}`);
      setPreview(res.data.revision);
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to load revision",
      );
    }
  };

  const handleRestore = async () => {
    if (!preview) return;

    setIsRestoring(true);
    try {
      const res = await api.post(
        `/api/posts/${postId}/revisions/${preview._id}/restore`,
      );
      onRestore?.(res.data.post);
      toast.success("Version restored");
      setPreview(null);
      onClose?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to restore revision",
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <aside
        className="fixed right-0 top-0 z-[200] h-screen w-80 border-l shadow-2xl"
        style={{ backgroundColor: "var(--bg2)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="serif-title text-2xl font-bold text-[#25211d]">
            History
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xl leading-none text-[#8b7f72] transition hover:bg-[#ead9c7]/60"
            aria-label="Close revision history"
          >
            ×
          </button>
        </div>

        <div className="h-[calc(100vh-65px)] overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-[#6d6155]">Loading versions...</p>
          ) : null}
          {error ? (
            <p className="text-sm font-semibold text-[#9f3d2e]">{error}</p>
          ) : null}

          <div className="space-y-3">
            {revisions.map((revision) => (
              <div
                key={revision._id}
                className="rounded-lg border p-4"
                style={{
                  backgroundColor: "var(--bg3)",
                  borderColor: "var(--border)",
                }}
              >
                <p className="text-sm font-bold text-[#25211d]">
                  Version {revision.versionNumber} · {formatDate(revision.savedAt)}
                </p>
                <button
                  type="button"
                  onClick={() => handlePreview(revision._id)}
                  className="secondary-btn mt-3 px-3 py-2 text-xs"
                >
                  Preview
                </button>
              </div>
            ))}
          </div>

          {!isLoading && revisions.length === 0 && !error ? (
            <p className="text-sm text-[#6d6155]">No previous versions yet.</p>
          ) : null}
        </div>
      </aside>

      {preview ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(44,36,22,0.6)] p-4">
          <div
            className="w-full max-w-3xl rounded-lg border p-5 shadow-2xl"
            style={{
              backgroundColor: "var(--bg2)",
              borderColor: "var(--border)",
            }}
          >
            <h3 className="serif-title text-3xl font-bold text-[#25211d]">
              Version {preview.versionNumber}
            </h3>
            <p className="mt-1 text-sm text-[#8b7f72]">
              Saved {formatDate(preview.savedAt)}
            </p>
            <input
              value={preview.title ?? ""}
              readOnly
              className="field mt-4"
            />
            <textarea
              value={preview.content ?? ""}
              readOnly
              className="field mt-4 min-h-80 resize-y leading-7"
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleRestore}
                disabled={isRestoring}
                className="primary-btn px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRestoring ? "Restoring..." : "Restore this version"}
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="secondary-btn px-4 py-2.5"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
