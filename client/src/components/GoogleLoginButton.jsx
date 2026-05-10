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

        googleIdentity.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const loggedInUser = await loginWithGoogle(response.credential);
              onSuccess?.(loggedInUser);
            } catch (err) {
              onError?.(err);
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
        setLoadError("Could not load Google sign-in.");
        onError?.(err);
      }
    })();

    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, [clientId, loginWithGoogle, onError, onSuccess]);

  const handlePrompt = () => {
    if (!window.google?.accounts?.id) {
      setLoadError("Google sign-in is still unavailable.");
      return;
    }

    window.google.accounts.id.prompt();
  };

  if (!clientId || clientId === "your_google_oauth_client_id_here") {
    return (
      <p className="mt-4 rounded-md border border-[#ded2c1] bg-[#ead9c7]/50 px-4 py-3 text-xs font-semibold text-[#6d6155]">
        Google login needs `REACT_APP_GOOGLE_CLIENT_ID` and server
        `GOOGLE_CLIENT_ID`.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div ref={buttonRef} className="min-h-11 w-full" />
      {!isReady || isLoading ? (
        <p className="mt-2 text-center text-xs text-[#8b7f72]">
          Loading Google sign-in...
        </p>
      ) : null}
      {loadError ? (
        <div className="mt-3 rounded-md border border-[#ded2c1] bg-[#ead9c7]/50 p-3">
          <p className="text-xs font-semibold text-[#6d6155]">{loadError}</p>
          <button
            type="button"
            onClick={handlePrompt}
            disabled={!isReady}
            className="secondary-btn mt-3 w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google
          </button>
        </div>
      ) : null}
    </div>
  );
}
