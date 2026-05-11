export const routeLoaders = {
  home: () => import("../app/page"),
  browse: () => import("../app/browse/page"),
  write: () => import("../app/write/page"),
  login: () => import("../app/login/page"),
  register: () => import("../app/register/page"),
  profile: () => import("../app/profile/page"),
  publicProfile: () => import("../app/profile/[id]/page"),
  profileSearch: () => import("../app/profile/search/[name]/page"),
  admin: () => import("../app/admin/page"),
  post: () => import("../app/post/[id]/page"),
  series: () => import("../app/series/page"),
  seriesDetail: () => import("../app/series/[id]/page"),
  tags: () => import("../app/tags/page"),
  tagDetail: () => import("../app/tags/[tag]/page"),
  challenges: () => import("../app/challenges/page"),
  challengeDetail: () => import("../app/challenges/[id]/page"),
  groups: () => import("../app/groups/page"),
  groupDetail: () => import("../app/groups/[id]/page"),
  analytics: () => import("../app/analytics/page"),
  leaderboard: () => import("../app/leaderboard/page"),
  messages: () => import("../app/messages/page"),
};

const preloadedRoutes = new Set();

export function getRouteKey(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/browse") return "browse";
  if (pathname === "/write") return "write";
  if (pathname === "/login") return "login";
  if (pathname === "/register") return "register";
  if (pathname === "/profile") return "profile";
  if (pathname === "/admin") return "admin";
  if (pathname === "/series") return "series";
  if (pathname === "/tags") return "tags";
  if (pathname === "/challenges") return "challenges";
  if (pathname === "/groups") return "groups";
  if (pathname === "/analytics") return "analytics";
  if (pathname === "/leaderboard") return "leaderboard";
  if (pathname === "/messages") return "messages";
  if (/^\/series\/[^/]+$/.test(pathname)) return "seriesDetail";
  if (/^\/tags\/[^/]+$/.test(pathname)) return "tagDetail";
  if (/^\/challenges\/[^/]+$/.test(pathname)) return "challengeDetail";
  if (/^\/groups\/[^/]+$/.test(pathname)) return "groupDetail";
  if (/^\/profile\/search\/[^/]+$/.test(pathname)) return "profileSearch";
  if (/^\/profile\/[^/]+$/.test(pathname)) return "publicProfile";
  if (/^\/post\/[^/]+$/.test(pathname)) return "post";
  return "";
}

export function preloadRoute(pathname) {
  const key = getRouteKey(pathname);
  if (!key || preloadedRoutes.has(key)) return;
  preloadedRoutes.add(key);
  routeLoaders[key]?.().catch(() => {
    preloadedRoutes.delete(key);
  });
}
