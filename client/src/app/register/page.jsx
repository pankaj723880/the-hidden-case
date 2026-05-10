import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { AppLink, navigate } from "../../lib/navigation";
import GoogleLoginButton from "../../components/GoogleLoginButton";

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Something failed";
}

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await register(name, email, password);
      navigate("/write");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <main className="editorial-shell grid min-h-[calc(100vh-4rem)] items-center gap-8 py-12 md:grid-cols-[1fr_0.9fr]">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#8f5f35]">
          Create an account
        </p>
        <h1 className="serif-title mt-3 max-w-xl text-5xl font-bold leading-tight text-[#25211d]">
          Join the community and publish your own stories.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[#6d6155]">
          Reading is open for everyone. An account is only needed for writing,
          liking, commenting, and managing your profile.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="paper-card rounded-lg p-6 sm:p-8">
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-[#352a20]">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field mt-2"
              placeholder="Jane Doe"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[#352a20]">Email</span>
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
            <span className="text-sm font-bold text-[#352a20]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field mt-2"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
        </div>

        {error ? <p className="mt-5 text-sm font-semibold text-[#9f3d2e]">{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="primary-btn mt-6 w-full px-5 py-3.5"
        >
          {isLoading ? "Creating..." : "Register"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8b7f72]">
          <span className="h-px flex-1 bg-[#ded2c1]" />
          Or
          <span className="h-px flex-1 bg-[#ded2c1]" />
        </div>

        <GoogleLoginButton
          onSuccess={() => navigate("/write")}
          onError={(err) => setError(getErrorMessage(err))}
        />

        <p className="mt-5 text-center text-sm text-[#6d6155]">
          Already registered?{" "}
          <AppLink href="/login" className="font-bold text-[#2f4638]">
            Login
          </AppLink>
        </p>
      </form>
    </main>
  );
}
