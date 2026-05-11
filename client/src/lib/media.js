import { API_URL } from "./api";

const apiBase = API_URL.replace(/\/$/, "");

export function getMediaUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return "";

  if (url.startsWith("//")) return `https:${url}`;

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      const apiHost = new URL(apiBase).host;
      if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(parsed.host) && parsed.pathname.startsWith("/uploads/")) {
        return `${apiBase}${parsed.pathname}${parsed.search}`;
      }
      if (parsed.protocol === "http:" && parsed.host === apiHost) {
        parsed.protocol = "https:";
        return parsed.toString();
      }
    } catch {
      return url;
    }
    return url;
  }

  if (/^(data:|blob:)/i.test(url)) return url;

  const normalizedPath = url.startsWith("/")
    ? url
    : `/${url.replace(/^\.?\//, "")}`;
  return `${apiBase}${normalizedPath}`;
}

export function normalizeMediaHtml(html) {
  return String(html ?? "").replace(
    /(<(?:img|video|source)\b[^>]*\s(?:src|poster)=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, before, src, after) => `${before}${getMediaUrl(src)}${after}`,
  );
}
