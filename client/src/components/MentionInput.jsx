import { getMediaUrl } from "../lib/media";
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

function mentionValue(name) {
  return `@${String(name || "").trim().replace(/\s+/g, "_")}`;
}

export default function MentionInput({
  value,
  onChange,
  placeholder,
  className = "field min-h-28 resize-y",
  required = false,
}) {
  const wrapperRef = useRef(null);
  const textareaRef = useRef(null);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState(null);
  const [users, setUsers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const updateMentionState = (text, cursor) => {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(/(^|\s)@(\w*)$/);

    if (!match) {
      setIsOpen(false);
      setQuery("");
      setRange(null);
      return;
    }

    const typed = match[2] ?? "";
    setQuery(typed);
    setRange({ start: cursor - typed.length - 1, end: cursor });
    setIsOpen(typed.length >= 2);
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    onChange(nextValue);
    updateMentionState(nextValue, event.target.selectionStart ?? nextValue.length);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectUser = (user) => {
    if (!range) return;

    const insertion = mentionValue(user.name);
    const nextValue = `${value.slice(0, range.start)}${insertion} ${value.slice(
      range.end,
    )}`;
    const nextCursor = range.start + insertion.length + 1;
    onChange(nextValue);
    setIsOpen(false);
    setQuery("");
    setRange(null);

    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  useEffect(() => {
    if (!isOpen || query.length < 2) {
      setUsers([]);
      return undefined;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await api.get("/api/users/search", {
            params: { q: query.replace(/_/g, " ") },
          });
          if (!cancelled) setUsers(res.data.users ?? []);
        } catch {
          if (!cancelled) setUsers([]);
        }
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isOpen, query]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
        required={required}
      />

      {isOpen ? (
        <div className="absolute left-3 right-3 top-full z-40 mt-2 overflow-hidden rounded-md border border-[#ded2c1] bg-[#fffaf2] shadow-xl">
          {users.length > 0 ? (
            users.map((user) => (
              <button
                key={user._id}
                type="button"
                onClick={() => selectUser(user)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold text-[#352a20] transition hover:bg-[#ead9c7]/70"
              >
                {user.avatar ? (
                  <img
                    src={getMediaUrl(user.avatar)}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ead9c7] font-bold text-[#8f5f35]">
                    {(user.name ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>{user.name}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm font-semibold text-[#8b7f72]">
              No users found
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
