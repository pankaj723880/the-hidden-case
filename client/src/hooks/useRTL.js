"use client";

import { isRTL as isRTLLanguage } from "../lib/languages";

export function useRTL(pageLanguage) {
  const language =
    pageLanguage ||
    (typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en");
  const rtl = isRTLLanguage(language);
  return { isRTL: rtl, dir: rtl ? "rtl" : "ltr" };
}
