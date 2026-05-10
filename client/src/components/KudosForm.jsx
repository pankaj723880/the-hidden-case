"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function KudosForm({ postId, authorId, onSuccess }) {
  const { isAuthenticated, user } = useAuth();
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isAuthenticated || String(user?.id) === String(authorId) || submitted) {
    return submitted ? (
      <p className="mt-5 rounded-lg border border-[#ded2c1] bg-[#ead9c7]/45 px-4 py-3 text-sm font-semibold text-[#5f7263]">
        Thanks for leaving kudos.
      </p>
    ) : null;
  }

  const submitKudos = async (event) => {
    event.preventDefault();
    const nextMessage = message.trim();
    if (!nextMessage) return;

    try {
      const res = await api.post(`/api/posts/${postId}/kudos`, {
        message: nextMessage,
      });
      setSubmitted(true);
      setMessage("");
      onSuccess?.(res.data.kudos);
      toast.success("Kudos sent");
    } catch (err) {
      const errorMessage = err?.response?.data?.error || err?.message || "";
      if (errorMessage === "Already left kudos") {
        toast("You already left kudos for this post.");
        setSubmitted(true);
        return;
      }
      toast.error(errorMessage || "Failed to leave kudos");
    }
  };

  return (
    <form onSubmit={submitKudos} className="mt-6 rounded-lg border border-[#ded2c1] bg-[#fffaf2]/70 p-4">
      <label className="block">
        <span className="text-sm font-bold text-[#352a20]">Leave kudos</span>
        <input
          value={message}
          maxLength={80}
          onChange={(event) => setMessage(event.target.value)}
          className="field mt-2"
          placeholder="Tell the author what moved you... (80 chars)"
          required
        />
      </label>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#8b7f72]">
          {message.length}/80
        </span>
        <button type="submit" className="primary-btn px-4 py-2 text-sm">
          Leave kudos
        </button>
      </div>
    </form>
  );
}
