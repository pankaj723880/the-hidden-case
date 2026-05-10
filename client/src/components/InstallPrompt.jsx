"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "thc-pwa-dismissed";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed() {
  const timestamp = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return timestamp && Date.now() - timestamp < DISMISS_WINDOW_MS;
}

export default function InstallPrompt() {
  const deferredPromptRef = useRef(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      if (!wasRecentlyDismissed()) setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      setShowBanner(false);
      return;
    }

    promptEvent.prompt();
    await promptEvent.userChoice;
    deferredPromptRef.current = null;
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-[var(--border)] bg-[var(--bg2)] px-4 py-3 shadow-[0_-12px_40px_rgba(44,36,22,0.14)]" style={{ color: "var(--text)" }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold">
          📱 Install The Hidden Case for the best reading experience
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-[3px] bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[#faf7f2] transition hover:bg-[var(--accent2)]"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-9 w-9 items-center justify-center rounded-[3px] border border-[var(--border)] text-lg font-bold transition hover:text-[var(--accent)]"
            style={{ color: "var(--text3)" }}
            aria-label="Dismiss install prompt"
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}
