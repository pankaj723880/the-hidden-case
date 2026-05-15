"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      window.setTimeout(resolve, 1000);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function waitForGoogleIdentity(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Google sign-in script did not initialize."));
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  });
}

export default function GoogleLoginButton({ onSuccess, onError }) {
  const { loginWithGoogle, isLoading } = useAuth();
  const buttonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // Store latest callbacks in refs so we don't re-trigger useEffect on every render
  const callbacksRef = useRef({ onSuccess, onError, loginWithGoogle });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError, loginWithGoogle };
  });

  useEffect(() => {
    if (!clientId || clientId === "your_google_oauth_client_id_here") return;
    let cancelled = false;
    let fallbackTimer = null;

    void (async () => {
      try {
        setLoadError("");
        await loadGoogleScript();
        const googleIdentity = await waitForGoogleIdentity();
        if (cancelled || !buttonRef.current) {
          return;
        }

        // Initialize only once per mount
        googleIdentity.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const { loginWithGoogle, onSuccess } = callbacksRef.current;
              const loggedInUser = await loginWithGoogle(response.credential);
              onSuccess?.(loggedInUser);
            } catch (err) {
              callbacksRef.current.onError?.(err);
            }
          },
        });

        googleIdentity.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: buttonRef.current.offsetWidth || 320,
          text: "continue_with",
        });
        
        setIsReady(true);
        
        fallbackTimer = window.setTimeout(() => {
          if (!buttonRef.current?.querySelector("iframe")) {
            setLoadError(
              "Google button did not render. Check Google OAuth authorized JavaScript origins.",
            );
          }
        }, 2500);
      } catch (err) {
        if (!cancelled) {
          setLoadError("Could not load Google sign-in.");
          callbacksRef.current.onError?.(err);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, [clientId]); // Remove callbacks from dependencies to prevent infinite re-initialization

  const handlePrompt = () => {
    if (!window.google?.accounts?.id) {
      setLoadError("Google sign-in is still unavailable.");
      return;
    }
    window.google.accounts.id.prompt();
  };

  if (!clientId || clientId === "your_google_oauth_client_id_here") {
    return (
      <p className="mt-4 rounded-md border px-4 py-3 text-xs font-semibold" style={{ borderColor: "rgba(192,57,43,0.3)", backgroundColor: "rgba(192,57,43,0.08)", color: "var(--accent2)" }}>
        Google login needs `REACT_APP_GOOGLE_CLIENT_ID` and server
        `GOOGLE_CLIENT_ID`.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div ref={buttonRef} className="min-h-11 w-full" />
      {!isReady || isLoading ? (
        <p className="mt-2 text-center text-xs" style={{ color: "var(--text3)" }}>
          Loading Google sign-in...
        </p>
      ) : null}
      {loadError ? (
        <div className="mt-3 rounded-md border p-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg3)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text2)" }}>{loadError}</p>
          <button
            type="button"
            onClick={handlePrompt}
            disabled={!isReady}
            className="secondary-btn mt-3 w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry Login
          </button>
        </div>
      ) : null}
    </div>
  );
}
