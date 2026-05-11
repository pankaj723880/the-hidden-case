import { getMediaUrl } from "../lib/media";
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { AppLink } from "../lib/navigation";
import { formatDateRelative } from "../lib/format";

function getInitials(name) {
  return (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function messageFor(notification) {
  const actorName = notification.actor?.name ?? "Someone";
  if (notification.type === "like") return `${actorName} liked your post`;
  if (notification.type === "comment") return `${actorName} commented on your post`;
  if (notification.type === "reply") return `${actorName} replied to your comment`;
  if (notification.type === "follow") return `${actorName} started following you`;
  if (notification.type === "mention")
    return `${actorName} mentioned you in a post/comment`;
  if (notification.type === "coauthor_invite")
    return `${actorName} invited you to co-write a post`;
  if (notification.type === "group_join_request")
    return `${actorName} requested to join your group`;
  if (notification.type === "post_approved") return "Your post was approved ✨";
  if (notification.type === "post_rejected") return "Your post was not approved";
  if (notification.type === "badge_earned") return "Achievement badge unlocked!";
  return "You have a new notification";
}

export default function NotificationBell() {
  const { isAuthenticated, accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return undefined;

    let cancelled = false;

    void (async () => {
      try {
        const res = await api.get("/api/notifications");
        if (!cancelled) setNotifications(res.data.notifications ?? []);
      } catch {
        if (!cancelled) setNotifications([]);
      }
    })();

    socket.auth = { token: accessToken };
    if (socket.connected) socket.disconnect();
    socket.connect();

    const handleNotification = (notification) => {
      setNotifications((current) => {
        if (current.some((item) => item._id === notification._id)) return current;
        return [notification, ...current].slice(0, 20);
      });
    };
    const handleBadgeEarned = ({ badge }) => {
      if (badge?.name) toast.success(`${badge.icon ?? "✦"} ${badge.name} badge unlocked!`);
    };
    const handleLevelUp = ({ newLevel }) => {
      if (newLevel) toast.success(`Level up! You are now a ${newLevel}!`);
    };

    socket.on("notification", handleNotification);
    socket.on("badge_earned", handleBadgeEarned);
    socket.on("level_up", handleLevelUp);

    return () => {
      cancelled = true;
      socket.off("notification", handleNotification);
      socket.off("badge_earned", handleBadgeEarned);
      socket.off("level_up", handleLevelUp);
    };
  }, [accessToken, isAuthenticated]);

  if (!isAuthenticated) return null;

  const markAllRead = async () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
    try {
      await api.patch("/api/notifications/read-all");
    } catch {
      // The optimistic local read state is harmless if this fails.
    }
  };

  const toggleOpen = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) await markAllRead();
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const respondToCoAuthorInvite = async (notification, response) => {
    const postId = notification.post?._id;
    if (!postId) return;

    try {
      await api.post(`/api/posts/${postId}/${response}-coauthor`);
      setNotifications((current) =>
        current.filter((item) => item._id !== notification._id),
      );
      toast.success(response === "accept" ? "Invitation accepted" : "Invitation declined");
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to update invitation",
      );
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border text-lg transition"
        style={{
          borderColor: "var(--border)",
          color: "var(--text2)",
          backgroundColor: "var(--bg2)",
        }}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[11px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-12 z-[120] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border shadow-2xl"
          style={{ backgroundColor: "var(--bg2)", borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="serif-title text-xl font-bold" style={{ color: "var(--text)" }}>
              Notifications
            </p>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-bold"
              style={{ color: "var(--accent)" }}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: "var(--text2)" }}>
                No notifications yet.
              </p>
            ) : null}

            {notifications.map((notification) => (
              <div
                key={notification._id}
                className="border-b p-4"
                style={{
                  borderColor: "var(--border)",
                  borderLeft: notification.read
                    ? "4px solid transparent"
                    : "4px solid var(--accent)",
                }}
              >
                <div className="flex gap-3">
                  {notification.actor?.avatar ? (
                    <img
                      src={getMediaUrl(notification.actor.avatar)}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif font-bold"
                      style={{ backgroundColor: "var(--bg4)", color: "var(--accent)" }}
                    >
                      {getInitials(notification.actor?.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {messageFor(notification)}
                    </p>
                    {notification.post?._id ? (
                      <AppLink
                        href={`/post/${notification.post._id}`}
                        onClick={() => setIsOpen(false)}
                        className="mt-1 block truncate text-xs font-bold"
                        style={{ color: "var(--accent)" }}
                      >
                        {notification.post.title}
                      </AppLink>
                    ) : null}
                    {notification.type === "coauthor_invite" &&
                    notification.post?._id ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            respondToCoAuthorInvite(notification, "accept")
                          }
                          className="rounded-md px-3 py-1.5 text-xs font-bold text-white"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            respondToCoAuthorInvite(notification, "decline")
                          }
                          className="rounded-md border px-3 py-1.5 text-xs font-bold"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--text2)",
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : null}
                    <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
                      {formatDateRelative(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
