import { getMediaUrl } from "../lib/media";
"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AppLink, navigate } from "../lib/navigation";
import { useAuth } from "../context/AuthContext";

function getInitials(name) {
  return (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UserConnectionsModal({ isOpen, onClose, type, userId }) {
  const { isAuthenticated, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const title = type === "following" ? "Following" : "Followers";
  const currentUserId = String(user?.id ?? user?._id ?? "");

  useEffect(() => {
    if (!isOpen || !userId || !type) return;

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/users/${userId}/${type}`);
        if (!cancelled) setUsers(res.data.users ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              `Failed to load ${title.toLowerCase()}`,
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, title, type, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(44,36,22,0.6)] px-4">
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border shadow-2xl"
        style={{ backgroundColor: "var(--bg2)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="serif-title text-2xl font-bold"
            style={{ color: "var(--text)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border text-lg font-bold"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {isLoading ? (
            <p className="p-4 text-sm" style={{ color: "var(--text2)" }}>
              Loading {title.toLowerCase()}...
            </p>
          ) : null}

          {error ? (
            <p className="p-4 text-sm font-semibold text-[#9f3d2e]">{error}</p>
          ) : null}

          {!isLoading && !error && users.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: "var(--text2)" }}>
              No users found.
            </p>
          ) : null}

          <div className="space-y-2">
            {users.map((connectionUser) => {
              const connectionUserId = String(connectionUser.id ?? connectionUser._id ?? "");
              const canMessage =
                isAuthenticated && connectionUserId && connectionUserId !== currentUserId;

              return (
              <div
                key={connectionUserId}
                className="flex items-center gap-3 rounded-lg border p-3 transition hover:shadow-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg3)",
                }}
              >
                <AppLink
                  href={`/profile/${connectionUserId}`}
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {connectionUser.avatar ? (
                    <img
                      src={getMediaUrl(connectionUser.avatar)}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif font-bold"
                      style={{ backgroundColor: "var(--bg4)", color: "var(--accent)" }}
                    >
                      {getInitials(connectionUser.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p
                      className="truncate font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {connectionUser.name || "Unknown User"}
                    </p>
                    {connectionUser.role === "admin" ? (
                      <p
                        className="text-xs capitalize"
                        style={{ color: "var(--text3)" }}
                      >
                        Admin
                      </p>
                    ) : null}
                  </div>
                </AppLink>
                {canMessage ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/messages?user=${connectionUserId}`);
                    }}
                    className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    Message
                  </button>
                ) : null}
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
