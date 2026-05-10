"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export default function VoiceInput({ onTranscript }) {
  const recognitionRef = useRef(null);
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  useEffect(() => {
    const hasSupport =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setSupported(hasSupport);
    if (!hasSupport) return undefined;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let nextInterimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          nextInterimText += transcript;
        }
      }

      if (finalText.trim()) {
        onTranscript(finalText.trim());
        setInterimText("");
      } else {
        setInterimText(nextInterimText.trim());
      }
    };

    recognition.onerror = (event) => {
      const error = event.error || "unknown error";
      if (error === "not-allowed" || error === "service-not-allowed") {
        setPermissionBlocked(true);
        toast.error("Microphone access is blocked. Allow microphone permission in your browser.");
      } else if (error !== "aborted") {
        toast.error(`Voice input failed: ${error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  if (!supported) return null;

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setInterimText("");
      return;
    }

    try {
      setPermissionBlocked(false);
      recognition.start();
      setIsListening(true);
    } catch {
      toast.error("Voice input is already starting");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggleListening}
        disabled={permissionBlocked}
        className="inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          borderColor: isListening ? "#dc2626" : "var(--border)",
          backgroundColor: isListening ? "rgba(220, 38, 38, 0.08)" : "var(--bg2)",
          color: isListening ? "#dc2626" : "var(--text2)",
        }}
      >
        {isListening ? (
          <>
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#dc2626]" />
            Listening...
          </>
        ) : (
          <>
            <span>🎙</span>
            Dictate
          </>
        )}
      </button>
      {isListening && interimText ? (
        <p className="max-w-xs text-right text-xs italic" style={{ color: "var(--text3)" }}>
          {interimText}
        </p>
      ) : null}
      {permissionBlocked ? (
        <p className="max-w-xs text-right text-xs italic" style={{ color: "var(--red)" }}>
          Allow microphone access in the browser, then refresh this page.
        </p>
      ) : null}
    </div>
  );
}
