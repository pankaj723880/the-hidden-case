import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { AppLink, navigate } from "../../lib/navigation";
import GoogleLoginButton from "../../components/GoogleLoginButton";

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Something failed";
}

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser?.role === "admin" ? "/admin" : "/profile");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <main className="editorial-shell grid min-h-[calc(100vh-4rem)] items-center gap-8 py-12 md:grid-cols-[1fr_0.9fr]">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--accent2)" }}>
          Welcome back
        </p>
        <h1 className="serif-title mt-3 max-w-xl text-5xl font-bold leading-tight">
          CONTINUE WRITING, SAVING, AND MANAGING YOUR PIECES.
        </h1>
      </section>

      <form onSubmit={handleSubmit} className="paper-card rounded-xl p-6 sm:p-8">
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field mt-2"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field mt-2"
              placeholder="Your password"
              required
            />
          </label>
        </div>

        {error ? <p className="mt-5 text-sm font-semibold" style={{ color: "var(--accent2)" }}>{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="primary-btn mt-6 w-full px-5 py-3.5"
        >
          {isLoading ? "Opening..." : "Login"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text3)" }}>
          <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
          Or
          <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
        </div>

        <GoogleLoginButton
          onSuccess={(loggedInUser) =>
            navigate(loggedInUser?.role === "admin" ? "/admin" : "/profile")
          }
          onError={(err) => setError(getErrorMessage(err))}
        />

        <p className="mt-5 text-center text-sm" style={{ color: "var(--text2)" }}>
          No account?{" "}
          <AppLink href="/register" className="font-semibold" style={{ color: "var(--accent2)" }}>
            Register
          </AppLink>
        </p>
      </form>
    </main>
  );
}
