export function formatDate(dateString, options = {}) {
  const defaultOptions = { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(undefined, { ...defaultOptions, ...options }).format(
    new Date(dateString),
  );
}

export function formatDateRelative(dateString) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return formatDate(dateString);
}

export function formatNumber(number) {
  return new Intl.NumberFormat(undefined).format(number ?? 0);
}

export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatReadTime(minutes) {
  return Number(minutes) === 1 ? "1 min read" : `${minutes ?? 1} min read`;
}
