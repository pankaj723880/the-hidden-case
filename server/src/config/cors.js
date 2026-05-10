import { env } from "./env.js";

const allowedOrigins = new Set([env.CLIENT_URL, "http://localhost:3000"]);

function isPrivateNetworkHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      /^30\d{2}$/.test(url.port) &&
      isPrivateNetworkHost(url.hostname)
    );
  } catch {
    return false;
  }
}

export function corsOrigin(origin, callback) {
  callback(null, isAllowedCorsOrigin(origin));
}
