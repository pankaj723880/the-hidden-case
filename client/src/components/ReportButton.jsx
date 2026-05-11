"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const reasons = [
  ["spam", "Spam"],
  ["inappropriate", "Inappropriate"],
  ["harassment", "Harassment"],
  ["misinformation", "Misinformation"],
  ["other", "Other"],
];

export default function ReportButton({
  contentType,
  contentId,
  label = "Report",
  disabled = false,
  onSubmitted,
}) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState("spam");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wrapperRef = useRef(null);

  if (!isAuthenticated || submitted) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/api/reports", {
        contentType,
        contentId,
        reason,
        description,
      });
      setSubmitted(true);
      setIsOpen(false);
      onSubmitted?.();
      toast.success("Report submitted. Thank you.");
    } catch (err) {
      if (err?.response?.status === 400) {
        toast.error("You already reported this content");
      } else {
        toast.error(
          err?.response?.data?.error || err?.message || "Failed to submit report",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled || !contentId}
        onClick={() => setIsOpen((current) => !current)}
        className="text-xs font-bold text-[#8b7f72] transition hover:text-[#9f3d2e] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
      </button>

      {isOpen ? (
        <form
          onSubmit={handleSubmit}
          className="mt-3 w-full rounded-lg border border-[#ded2c1] bg-[#fffaf2] p-4 shadow-lg sm:w-72"
        >
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
              Reason
            </span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="field mt-2"
            >
              {reasons.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7f72]">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 500))}
              className="field mt-2 min-h-20 resize-y"
              maxLength={500}
              placeholder="Optional details..."
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-btn px-3 py-2 text-xs disabled:opacity-60"
            >
              Submit Report
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="secondary-btn px-3 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
