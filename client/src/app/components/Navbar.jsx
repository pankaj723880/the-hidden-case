import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { AppLink, navigate, usePathname } from "../../lib/navigation";
import NotificationBell from "../../components/NotificationBell";
import MessagesNavLink from "../../components/MessagesNavLink";

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const linkClass = (href) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return [
      "px-2 py-2 text-[0.9rem] font-medium tracking-[0.05rem] transition",
      "font-[var(--font-garamond)] underline-offset-4 hover:underline",
      isActive ? "text-[var(--accent)]" : "text-[var(--text2)]",
    ].join(" ");
  };
  const drawerLinkClass = (href) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return [
      "block rounded-[3px] border px-4 py-3 text-sm font-bold tracking-[0.05rem] transition hover:no-underline",
      isActive ? "border-[var(--accent)] bg-[var(--bg3)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]",
    ].join(" ");
  };

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg2)",
        boxShadow: "0 1px 8px rgba(44, 36, 22, 0.08)",
      }}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] flex-wrap items-center gap-3 px-3 py-2 sm:px-4 lg:flex-nowrap">
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border text-xl transition hover:bg-[var(--bg3)]"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          aria-label="Open menu"
        >
          ☰
        </button>

        <AppLink
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-3 hover:no-underline lg:max-w-[18rem]"
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--gold)" }}
          />
          <span
            className="flex h-9 w-9 items-center justify-center rounded-[3px] text-xl font-bold text-[#faf7f2]"
            style={{
              backgroundColor: "var(--accent)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            H
          </span>
          <span className="min-w-0 leading-none">
            <span
              className="block truncate text-[1.25rem] font-semibold italic sm:text-[1.4rem]"
              style={{
                color: "var(--ink)",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}
            >
              The Hidden Case
            </span>
            <span
              className="block text-[0.65rem] uppercase tracking-[0.3rem]"
              style={{
                color: "var(--text3)",
                fontFamily: "var(--font-garamond), Georgia, serif",
              }}
            >
              Untold Stories
            </span>
          </span>
        </AppLink>

        <nav className="navbar-links flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:gap-x-2">
          <AppLink
            href="/browse"
            className={linkClass("/browse")}
          >
            Browse
          </AppLink>
          <AppLink
            href="/challenges"
            className={linkClass("/challenges")}
          >
            Challenges
          </AppLink>
          <AppLink
            href="/leaderboard"
            className={linkClass("/leaderboard")}
          >
            Leaderboard
          </AppLink>
          {isAdmin ? (
            <AppLink
              href="/admin"
              className={linkClass("/admin")}
            >
              Admin
            </AppLink>
          ) : (
            <AppLink
              href="/write"
              className={linkClass("/write")}
            >
              Write
            </AppLink>
          )}
          {isAuthenticated ? (
            <>
              <MessagesNavLink />
              <NotificationBell />
              {!isAdmin ? (
                <>
                  <AppLink
                    href="/profile"
                    className={`${linkClass("/profile")} flex items-center gap-2 hover:no-underline`}
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user?.name ? `${user.name} profile` : "Profile"}
                        className="h-[34px] w-[34px] rounded-full border-2 object-cover"
                        style={{ borderColor: "var(--border2)" }}
                      />
                    ) : (
                      <span
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 text-sm font-semibold text-[#faf7f2]"
                        style={{
                          backgroundColor: "var(--accent)",
                          borderColor: "var(--border2)",
                          fontFamily: "var(--font-playfair), Georgia, serif",
                        }}
                      >
                        {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </AppLink>
                </>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="secondary-btn shrink-0 px-4 py-1.5 text-sm"
                style={{ color: "var(--text2)" }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <AppLink
                href="/login"
                className="secondary-btn shrink-0 px-[18px] py-1.5 text-sm hover:no-underline"
              >
                Login
              </AppLink>
              <AppLink
                href="/register"
                className="primary-btn shrink-0 px-[18px] py-1.5 text-sm hover:no-underline"
              >
                Sign Up
              </AppLink>
            </>
          )}
        </nav>
      </div>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-[200]">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(44,36,22,0.45)]"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
          />
          <aside
            className="absolute left-0 top-0 h-full w-[min(20rem,86vw)] border-r p-5 shadow-[0_18px_50px_rgba(44,36,22,0.2)]"
            style={{ backgroundColor: "var(--bg2)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="serif-title text-xl font-bold italic" style={{ color: "var(--ink)" }}>
                  Menu
                </p>
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text3)" }}>
                  The Hidden Case
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-[3px] border text-lg"
                style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className="mt-6 space-y-3">
              {!isAdmin ? (
                <AppLink href="/tags" onClick={() => setIsMenuOpen(false)} className={drawerLinkClass("/tags")}>
                  Tags
                </AppLink>
              ) : null}
              <AppLink href="/groups" onClick={() => setIsMenuOpen(false)} className={drawerLinkClass("/groups")}>
                Groups
              </AppLink>
              {isAuthenticated && !isAdmin ? (
                <AppLink href="/analytics" onClick={() => setIsMenuOpen(false)} className={drawerLinkClass("/analytics")}>
                  Analytics
                </AppLink>
              ) : null}
            </nav>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
