"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";

const actions = [
  ["continue", "✨ Continue"],
  ["improve", "💡 Improve"],
  ["fix-grammar", "✏️ Fix Grammar"],
  ["summarize", "📝 Summarize"],
  ["generate-title", "🎯 Title Ideas"],
];

export default function AIAssistant({ editor, content = "", onInsert }) {
  const [loading, setLoading] = useState("");
  const [result, setResult] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const getEditorContent = () => {
    if (editor?.getHTML) return editor.getHTML();
    return content;
  };

  const insertAtEnd = () => {
    if (editor?.commands?.insertContentAt && editor?.state?.doc?.content) {
      editor.commands.insertContentAt(editor.state.doc.content.size, result);
    } else {
      onInsert?.(result);
    }
    setResult("");
    setShowModal(false);
  };

  const requestSuggestion = async (instruction, promptText = "") => {
    const editorContent = getEditorContent();
    if (!editorContent.trim()) {
      toast.error("Write something first");
      return;
    }
    if (instruction === "custom" && !promptText.trim()) {
      toast.error("Enter a command for AI");
      return;
    }

    setLoading(instruction);

    try {
      const res = await api.post("/api/ai/suggest", {
        content: editorContent,
        instruction,
        customPrompt: promptText,
      });
      setResult(res.data.result ?? "");
      setShowModal(true);
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.message || "AI assistant failed",
      );
    } finally {
      setLoading("");
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    toast.success("Copied");
  };

  return (
    <>
      <div
        className="flex flex-wrap gap-2 border-b px-3 py-3"
        style={{
          backgroundColor: "var(--bg3)",
          borderColor: "var(--border)",
        }}
      >
        {actions.map(([instruction, label]) => (
          <button
            key={instruction}
            type="button"
            onClick={() => requestSuggestion(instruction)}
            disabled={Boolean(loading)}
            className="rounded-full border px-3 py-2 text-xs font-bold transition hover:shadow-[0_0_18px_rgba(122,79,45,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: "var(--bg2)",
              borderColor: "var(--border)",
              color: "var(--text2)",
            }}
          >
            {loading === instruction ? "Working..." : label}
          </button>
        ))}
        <div className="flex min-w-full gap-2 sm:min-w-[360px] sm:flex-1">
          <input
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            maxLength={500}
            className="min-w-0 flex-1 rounded-full border px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--bg2)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
            placeholder="Tell AI what to do..."
          />
          <button
            type="button"
            onClick={() => requestSuggestion("custom", customPrompt)}
            disabled={Boolean(loading)}
            className="rounded-full border px-3 py-2 text-xs font-bold transition hover:shadow-[0_0_18px_rgba(122,79,45,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: "var(--accent)",
              borderColor: "var(--accent)",
              color: "#fff",
            }}
          >
            {loading === "custom" ? "Working..." : "Ask AI"}
          </button>
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[rgba(44,36,22,0.6)] p-4">
          <div
            className="w-full max-w-2xl rounded-lg border p-5 shadow-2xl"
            style={{
              backgroundColor: "var(--bg2)",
              borderColor: "var(--border)",
            }}
          >
            <h2 className="serif-title text-2xl font-bold text-[#25211d]">
              AI suggestion
            </h2>
            <textarea
              value={result}
              readOnly
              className="mt-4 min-h-72 w-full resize-y rounded-md border p-4 font-mono text-sm leading-7"
              style={{
                backgroundColor: "var(--bg)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={insertAtEnd}
                className="primary-btn px-4 py-2.5"
              >
                Insert at end
              </button>
              <button
                type="button"
                onClick={copyResult}
                className="secondary-btn px-4 py-2.5"
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult("");
                  setShowModal(false);
                }}
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
