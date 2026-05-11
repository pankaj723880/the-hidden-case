import { useEffect, useState } from "react";
import { preloadRoute } from "./routePreloaders";

export function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  return pathname;
}

export function AppLink({ href, className, children, onClick, ...props }) {
  const warmRoute = () => {
    if (
      typeof href !== "string" ||
      href.startsWith("#") ||
      href.startsWith("http")
    ) {
      return;
    }
    preloadRoute(href);
  };

  const handleClick = (event) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      href.startsWith("#") ||
      href.startsWith("http")
    ) {
      return;
    }

    event.preventDefault();
    navigate(href);
  };

  return (
    <a
      href={href}
      className={className}
      onClick={handleClick}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onTouchStart={warmRoute}
      {...props}
    >
      {children}
    </a>
  );
}
