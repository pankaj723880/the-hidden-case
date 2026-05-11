import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { navigate } from "../../lib/navigation";
import { socket } from "../../lib/socket";
import ReportButton from "../../components/ReportButton";

const reactionOptions = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

function timeAgo(value) {
  const date = value ? new Date(value) : new Date();
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function initials(name) {
  return (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function userIdOf(user) {
  return String(user?._id ?? user?.id ?? "");
}

function isUserBlocked(user, targetUserId) {
  return (user?.blockedUsers ?? []).some(
    (id) => String(id?._id ?? id) === String(targetUserId),
  );
}

function upsertMessage(messages, nextMessage) {
  return messages.map((message) =>
    message._id === nextMessage._id ? nextMessage : message,
  );
}

function ConversationItem({ conversation, isActive, onOpen, compact = false }) {
  const partner = conversation.user;
  return (
    <button
      type="button"
      onClick={() => onOpen(partner)}
      className={
        compact
          ? "flex w-20 shrink-0 flex-col items-center gap-1 rounded-[4px] border p-2 text-center transition"
          : "flex w-full gap-3 border-b border-[#ead9c7] p-4 text-left transition hover:bg-[#ead9c7]/35"
      }
      style={{
        backgroundColor: isActive ? "#ead9c7" : "transparent",
        borderColor: isActive ? "#c8a978" : "#ead9c7",
      }}
    >
      {partner.avatar ? (
        <img
          src={partner.avatar}
          alt=""
          className={compact ? "h-10 w-10 rounded-full object-cover" : "h-11 w-11 rounded-full object-cover"}
        />
      ) : (
        <span
          className={
            compact
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ead9c7] font-serif font-bold text-[#8f5f35]"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ead9c7] font-serif font-bold text-[#8f5f35]"
          }
        >
          {initials(partner.name)}
        </span>
      )}
      {compact ? (
        <>
          <span className="w-full truncate text-xs font-bold text-[#25211d]">
            {partner.name}
          </span>
          {conversation.unreadCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-black text-white">
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </span>
          ) : null}
        </>
      ) : (
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-[#25211d]">
              {partner.name}
            </span>
            <span className="shrink-0 text-xs font-semibold text-[#8b7f72]">
              {timeAgo(conversation.lastMessage?.createdAt)}
            </span>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="truncate text-sm text-[#6d6155]">
              {conversation.lastMessage?.deleted
                ? "This message was deleted"
                : conversation.lastMessage?.text ?? ""}
            </span>
            {conversation.unreadCount > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-black text-white">
                {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
              </span>
            ) : null}
          </span>
        </span>
      )}
    </button>
  );
}

export default function MessagesPage() {
  const { user, accessToken, isAuthenticated, isLoading } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [blockedUserIds, setBlockedUserIds] = useState(() =>
    (user?.blockedUsers ?? []).map((id) => String(id?._id ?? id)),
  );
  const [isBlocked, setIsBlocked] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [reactionMenuMessageId, setReactionMenuMessageId] = useState("");
  const [deleteMenuMessageId, setDeleteMenuMessageId] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);

  const activeUserId = userIdOf(activeUser);
  const currentUserId = String(user?.id ?? user?._id ?? "");

  const loadConversations = async () => {
    const res = await api.get("/api/conversations");
    setConversations(res.data.conversations ?? []);
    return res.data.conversations ?? [];
  };

  const openConversation = async (conversationUser) => {
    const nextUser =
      typeof conversationUser === "string"
        ? { _id: conversationUser, id: conversationUser, name: "Conversation" }
        : conversationUser;
    const nextUserId = userIdOf(nextUser);
    if (!nextUserId) return;

    setActiveUser(nextUser);
    setIsBlocked(
      blockedUserIds.includes(nextUserId) || isUserBlocked(user, nextUserId),
    );
    setIsLoadingMessages(true);
    try {
      if (nextUser.name === "Conversation") {
        const profileRes = await api.get(`/api/users/${nextUserId}`);
        setActiveUser(profileRes.data.user);
      }

      const res = await api.get(`/api/messages/${nextUserId}`);
      setMessages(res.data.messages ?? []);
      setConversations((current) =>
        current.map((conversation) =>
          userIdOf(conversation.user) === nextUserId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to load messages",
      );
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const loadedConversations = await loadConversations();
        if (cancelled) return;

        const queryUser = new window.URLSearchParams(window.location.search).get("user");
        if (queryUser) {
          const existing = loadedConversations.find(
            (conversation) => userIdOf(conversation.user) === queryUser,
          );
          await openConversation(existing?.user ?? queryUser);
        } else if (loadedConversations[0]?.user) {
          await openConversation(loadedConversations[0].user);
        }
      } catch {
        if (!cancelled) setConversations([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return undefined;

    socket.auth = { token: accessToken };
    if (!socket.connected) socket.connect();

    const handleNewMessage = ({ message }) => {
      const senderId = userIdOf(message?.sender);
      if (senderId && senderId === activeUserId) {
        setMessages((current) =>
          current.some((item) => item._id === message._id)
            ? current
            : [...current, message],
        );
        void api.get(`/api/messages/${senderId}`).then((res) => {
          setMessages(res.data.messages ?? []);
          void loadConversations();
        });
      } else {
        void loadConversations();
      }
    };
    const handleMessageUpdated = ({ message }) => {
      setMessages((current) => upsertMessage(current, message));
      void loadConversations();
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_updated", handleMessageUpdated);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_updated", handleMessageUpdated);
    };
  }, [accessToken, activeUserId, isAuthenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeUserId || isSending || isBlocked) return;

    setIsSending(true);
    try {
      const res = await api.post(`/api/messages/${activeUserId}`, { text });
      setMessages((current) => [...current, res.data.message]);
      setDraft("");
      await loadConversations();
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId, mode = "me") => {
    try {
      const res = await api.delete(`/api/messages/${messageId}`, {
        params: { mode },
      });
      setMessages((current) =>
        mode === "everyone" && res.data.message
          ? upsertMessage(current, res.data.message)
          : current.filter((message) => message._id !== messageId),
      );
      setDeleteMenuMessageId("");
      await loadConversations();
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to delete message",
      );
    }
  };

  const reactToMessage = async (messageId, emoji) => {
    try {
      const res = await api.post(`/api/messages/${messageId}/react`, { emoji });
      setMessages((current) => upsertMessage(current, res.data.message));
      setReactionMenuMessageId("");
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to react to message",
      );
    }
  };

  const toggleBlockUser = async () => {
    if (!activeUserId) return;
    try {
      const res = await api.post(`/api/messages/${activeUserId}/block`);
      const blocked = Boolean(res.data.blocked);
      setIsBlocked(blocked);
      setBlockedUserIds((current) =>
        blocked
          ? [...new Set([...current, activeUserId])]
          : current.filter((id) => id !== activeUserId),
      );
      toast.success(res.data.blocked ? "User blocked" : "User unblocked");
      setIsChatMenuOpen(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to update block",
      );
    }
  };

  const deleteConversationForMe = async () => {
    if (!activeUserId) return;
    try {
      await api.delete(`/api/messages/conversation/${activeUserId}`);
      setMessages([]);
      setConversations((current) =>
        current.filter((conversation) => userIdOf(conversation.user) !== activeUserId),
      );
      setActiveUser(null);
      setIsChatMenuOpen(false);
      toast.success("Chat deleted");
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to delete chat",
      );
    }
  };

  if (isLoading) {
    return <main className="editorial-shell py-12 text-[#6d6155]">Loading messages...</main>;
  }

  return (
    <main className="editorial-shell py-10">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Direct messages
        </p>
        <h1 className="serif-title mt-2 text-5xl font-bold text-[#25211d]">
          Messages
        </h1>
      </header>

      <section className="grid min-h-[68vh] overflow-hidden rounded-lg border border-[#ded2c1] bg-[#fffaf2] lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-b border-[#ded2c1] lg:block lg:border-b-0 lg:border-r">
          <div className="border-b border-[#ded2c1] px-4 py-3">
            <p className="text-sm font-bold text-[#352a20]">Conversations</p>
          </div>
          <div className="max-h-[68vh] overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-[#8b7f72]">
                No messages yet. Open an author profile and send a message.
              </p>
            ) : null}
            {conversations.map((conversation) => {
              const partnerId = userIdOf(conversation.user);
              return (
                <ConversationItem
                  key={partnerId}
                  conversation={conversation}
                  isActive={partnerId === activeUserId}
                  onOpen={openConversation}
                />
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-[68vh] min-w-0 flex-col">
          <div className="border-b border-[#ded2c1] p-3 lg:hidden">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8f5f35]">
              Conversations
            </p>
            {conversations.length === 0 ? (
              <p className="text-sm text-[#8b7f72]">
                No messages yet. Open an author profile and send a message.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {conversations.map((conversation) => {
                  const partnerId = userIdOf(conversation.user);
                  return (
                    <ConversationItem
                      key={partnerId}
                      conversation={conversation}
                      isActive={partnerId === activeUserId}
                      onOpen={openConversation}
                      compact
                    />
                  );
                })}
              </div>
            )}
          </div>
          {activeUser ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-[#ded2c1] px-5 py-4">
                {activeUser.avatar ? (
                  <img
                    src={activeUser.avatar}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ead9c7] font-serif font-bold text-[#8f5f35]">
                    {initials(activeUser.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#25211d]">{activeUser.name}</p>
                  <p className="text-xs font-semibold text-[#8b7f72]">
                    {isBlocked ? "Blocked conversation" : "Private conversation"}
                  </p>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsChatMenuOpen((current) => !current)}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d8cab8] text-lg font-bold text-[#5f4631] transition hover:bg-[#ead9c7]"
                    aria-label="Chat options"
                  >
                    ⋯
                  </button>
                  {isChatMenuOpen ? (
                    <div className="absolute right-0 top-11 z-20 w-56 rounded-lg border border-[#ded2c1] bg-[#fffaf2] p-2 shadow-xl">
                      <ReportButton
                        contentType="message"
                        contentId={messages.find((message) => !message.deleted)?._id}
                        label="Report chat"
                        disabled={!messages.some((message) => !message.deleted)}
                        onSubmitted={() => setIsChatMenuOpen(false)}
                      />
                      <button
                        type="button"
                        onClick={toggleBlockUser}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm font-bold text-[#9f3d2e] transition hover:bg-[#f0e8e8]"
                      >
                        {isBlocked ? "Unblock user" : "Block user"}
                      </button>
                      <button
                        type="button"
                        onClick={deleteConversationForMe}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm font-bold text-[#9f3d2e] transition hover:bg-[#f0e8e8]"
                      >
                        Delete chat for me
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7efe5] p-4 sm:p-5">
                {isLoadingMessages ? (
                  <p className="text-sm text-[#8b7f72]">Loading conversation...</p>
                ) : null}
                {messages.map((message) => {
                  const isMine = userIdOf(message.sender) === currentUserId;
                  return (
                    <div
                      key={message._id}
                      className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${isMine ? "rounded-br-[4px]" : "rounded-bl-[4px]"}`}
                        style={{
                          backgroundColor: isMine ? "var(--accent)" : "#fffaf2",
                          color: isMine ? "#fff" : "#352a20",
                          border: isMine ? "none" : "1px solid #ded2c1",
                        }}
                      >
                        <p
                          className="mb-1 text-[11px] font-black uppercase tracking-[0.12em]"
                          style={{ color: isMine ? "rgba(255,255,255,0.72)" : "#8f5f35" }}
                        >
                          {isMine ? "You" : activeUser.name}
                        </p>
                        <p className={`whitespace-pre-wrap text-sm leading-6 ${message.deleted ? "italic opacity-70" : ""}`}>
                          {message.deleted ? "This message was deleted" : message.text}
                        </p>
                        {message.reactions?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.reactions.map((reaction) => (
                              <span
                                key={`${message._id}-${reaction.user?._id ?? reaction.user}-${reaction.emoji}`}
                                className="rounded-full px-2 py-0.5 text-xs"
                                style={{
                                  backgroundColor: isMine
                                    ? "rgba(255,255,255,0.18)"
                                    : "#ead9c7",
                                }}
                              >
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p
                          className="mt-1 text-right text-[11px] font-semibold"
                          style={{ color: isMine ? "rgba(255,255,255,0.72)" : "#8b7f72" }}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {!message.deleted ? (
                          <div className={`mt-2 flex flex-wrap items-center gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setReactionMenuMessageId((current) =>
                                    current === message._id ? "" : message._id,
                                  )
                                }
                                className="rounded-full px-2 py-1 text-xs font-bold transition hover:bg-black/10"
                                style={{
                                  color: isMine
                                    ? "rgba(255,255,255,0.9)"
                                    : "#8b7f72",
                                }}
                                aria-label="React to message"
                              >
                                {message.userReaction ?? "♡"}
                              </button>
                              {reactionMenuMessageId === message._id ? (
                                <div className={`absolute z-20 flex gap-1 rounded-full border border-[#ded2c1] bg-[#fffaf2] p-1 shadow-lg ${isMine ? "right-0" : "left-0"}`}>
                                  {reactionOptions.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => reactToMessage(message._id, emoji)}
                                      className="rounded-full px-2 py-1 text-sm transition hover:bg-[#ead9c7]"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteMenuMessageId((current) =>
                                    current === message._id ? "" : message._id,
                                  )
                                }
                                className="rounded-full px-2 py-1 text-xs font-bold transition hover:bg-black/10"
                                style={{
                                  color: isMine
                                    ? "rgba(255,255,255,0.9)"
                                    : "#8b7f72",
                                }}
                                aria-label="Message options"
                              >
                                ⋯
                              </button>
                              {deleteMenuMessageId === message._id ? (
                                <div className={`absolute z-20 w-44 rounded-lg border border-[#ded2c1] bg-[#fffaf2] p-2 text-[#352a20] shadow-lg ${isMine ? "right-0" : "left-0"}`}>
                                  <button
                                    type="button"
                                    onClick={() => deleteMessage(message._id, "me")}
                                    className="block w-full rounded-md px-3 py-2 text-left text-xs font-bold transition hover:bg-[#ead9c7]"
                                  >
                                    Delete for me
                                  </button>
                                  {isMine ? (
                                    <button
                                      type="button"
                                      onClick={() => deleteMessage(message._id, "everyone")}
                                      className="block w-full rounded-md px-3 py-2 text-left text-xs font-bold text-[#9f3d2e] transition hover:bg-[#f0e8e8]"
                                    >
                                      Delete for everyone
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={sendMessage}
                className="flex gap-3 border-t border-[#ded2c1] p-4"
              >
                <textarea
                  value={draft}
                  maxLength={1000}
                  onChange={(event) => setDraft(event.target.value)}
                  className="field min-h-12 flex-1 resize-none"
                  disabled={isBlocked}
                  placeholder={isBlocked ? "Unblock this user to send messages." : "Write a message..."}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending || isBlocked}
                  className="primary-btn px-5 py-2.5 disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-[#6d6155]">
              Select a conversation or open a user profile to start one.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
