import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { AppLink, usePathname } from "../lib/navigation";
import { socket } from "../lib/socket";

export default function MessagesNavLink() {
  const pathname = usePathname();
  const { isAuthenticated, accessToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;
    const refreshUnread = async () => {
      try {
        const res = await api.get("/api/conversations");
        if (!cancelled) {
          setUnreadCount(
            (res.data.conversations ?? []).filter(
              (conversation) => (conversation.unreadCount ?? 0) > 0,
            ).length,
          );
        }
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };

    void refreshUnread();

    if (accessToken) {
      socket.auth = { token: accessToken };
      if (!socket.connected) socket.connect();
    }

    const handleNewMessage = () => {
      void refreshUnread();
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      cancelled = true;
      socket.off("new_message", handleNewMessage);
    };
  }, [accessToken, isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <AppLink
      href="/messages"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border text-lg transition"
      style={{
        borderColor: pathname === "/messages" ? "var(--accent)" : "var(--border)",
        backgroundColor: pathname === "/messages" ? "var(--accent)" : "var(--bg2)",
        color: pathname === "/messages" ? "#fff" : "var(--text2)",
      }}
      aria-label="Messages"
    >
      ✉
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[11px] font-black text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </AppLink>
  );
}
