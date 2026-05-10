"use client";

import { useEffect, useState } from "react";

export default function ContentWarningGate({ postId, warnings, children }) {
  const warningList = Array.isArray(warnings) ? warnings.filter(Boolean) : [];
  const storageKey = `revealed_${postId ?? warningList.join("_")}`;
  const [revealed, setRevealed] = useState(warningList.length === 0);

  useEffect(() => {
    if (warningList.length === 0) {
      setRevealed(true);
      return;
    }

    setRevealed(window.sessionStorage.getItem(storageKey) === "true");
  }, [storageKey, warningList.length]);

  if (warningList.length === 0 || revealed) return children;

  const reveal = () => {
    window.sessionStorage.setItem(storageKey, "true");
    setRevealed(true);
  };

  return (
    <div className="relative">
      <div style={{ filter: "blur(12px)", pointerEvents: "none" }}>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-start justify-center bg-[rgba(17,16,24,0.58)] px-4 py-14 backdrop-blur-sm">
        <div className="paper-card max-w-lg rounded-lg p-6 text-center">
          <div className="text-4xl">⚠</div>
          <h2 className="serif-title mt-3 text-3xl font-bold text-[#25211d]">
            Content warning
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6d6155]">
            This post includes themes some readers may prefer to avoid.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {warningList.map((warning) => (
              <span
                key={warning}
                className="rounded-full border border-[#d8cab8] bg-[#ead9c7] px-3 py-1 text-xs font-bold text-[#8f5f35]"
              >
                {warning}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={reveal}
            className="primary-btn mt-6 px-5 py-3"
          >
            I understand - show post
          </button>
        </div>
      </div>
    </div>
  );
}
