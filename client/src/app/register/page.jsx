import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { AppLink, navigate } from "../../lib/navigation";
import GoogleLoginButton from "../../components/GoogleLoginButton";

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Something failed";
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(name, email, password);
      navigate("/profile");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      {/* Hero */}
      <section
        className="relative overflow-hidden px-8 py-20 sm:py-28"
        style={{
          background: "linear-gradient(180deg, #0a0a0a 0%, #1a0f0f 40%, #1f1515 70%, #0d0d0d 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "500px",
            height: "350px",
            background: "radial-gradient(ellipse, rgba(192,57,43,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="editorial-shell relative z-10 text-center">
          <span
            className="inline-block rounded-md border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em]"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "rgba(192,57,43,0.1)",
              color: "var(--accent2)",
            }}
          >
            CLEARANCE REQUEST
          </span>
          <h1
            className="mx-auto mt-5 max-w-2xl text-[2.5rem] leading-none sm:text-[4rem]"
            style={{
              color: "#fff",
              fontFamily: "var(--font-bebas), sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            AGENT REGISTRATION
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm" style={{ color: "var(--text2)" }}>
            Create your clearance profile to submit case files, join
            investigations, and access classified archives.
          </p>
        </div>
      </section>

      <div className="editorial-shell py-12">
        <div className="mx-auto max-w-md">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border p-6 sm:p-8"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg2)",
              boxShadow: "0 0 30px rgba(192,57,43,0.06), 0 4px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div className="mb-6 text-center">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  fontFamily: "var(--font-bebas), sans-serif",
                  boxShadow: "0 0 20px rgba(192,57,43,0.3)",
                }}
              >
                H
              </div>
              <h2
                className="mt-4 text-2xl font-bold tracking-wider"
                style={{ fontFamily: "var(--font-bebas), sans-serif", color: "var(--ink)" }}
              >
                NEW AGENT FILE
              </h2>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text3)" }}>
                  Agent Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="field mt-2"
                  placeholder="Agent codename"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text3)" }}>
                  Secure Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field mt-2"
                  placeholder="agent@hiddencase.org"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text3)" }}>
                  Access Code
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field mt-2"
                  placeholder="Create a secure password"
                  required
                />
              </label>
            </div>

            {error ? (
              <div
                className="mt-5 rounded-md border px-4 py-3 text-sm font-semibold"
                style={{
                  borderColor: "rgba(192,57,43,0.3)",
                  backgroundColor: "rgba(192,57,43,0.08)",
                  color: "var(--accent2)",
                }}
              >
                ⚠ {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="primary-btn mt-6 w-full px-5 py-3.5 font-bold uppercase tracking-[0.12em]"
              style={{ fontFamily: "var(--font-bebas), sans-serif", fontSize: "1rem" }}
            >
              {loading ? "PROCESSING..." : "REQUEST CLEARANCE →"}
            </button>

            <div
              className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--text3)" }}
            >
              <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
              OR
              <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
            </div>

            <GoogleLoginButton
              onSuccess={() => navigate("/profile")}
              onError={(err) => setError(getErrorMessage(err))}
            />

            <p className="mt-6 text-center text-sm" style={{ color: "var(--text3)" }}>
              Already have clearance?{" "}
              <AppLink
                href="/login"
                className="font-bold"
                style={{ color: "var(--accent2)" }}
              >
                Login →
              </AppLink>
            </p>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 text-center" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-center gap-6">
          <a href="#" className="text-lg transition hover:text-[var(--accent2)]" style={{ color: "var(--text3)" }} aria-label="Facebook">⬤</a>
          <a href="#" className="text-lg transition hover:text-[var(--accent2)]" style={{ color: "var(--text3)" }} aria-label="Instagram">⬤</a>
          <a href="#" className="text-lg transition hover:text-[var(--accent2)]" style={{ color: "var(--text3)" }} aria-label="YouTube">⬤</a>
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--text3)" }}>© 2026 The Hidden Case. All rights reserved.</p>
      </footer>
    </main>
  );
}
