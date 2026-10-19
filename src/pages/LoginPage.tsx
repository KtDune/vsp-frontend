import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { validateEmail, validatePassword } from "../lib/auth";

type Errors = Partial<Record<"email" | "password", string>>;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const nextPath = (() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return null;
  })();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {
      email: validateEmail(email.trim()),
      password: validatePassword(password),
    };
    setErrors(next);
    if (next.email || next.password) return;

    setBusy(true);
    setFailure(null);

    try {
      await login(email, password);
      navigate(nextPath ?? "/");
    } catch {
      setFailure("Invalid email or password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex justify-center px-4 pt-28 pb-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-black text-white">
              V
            </span>
            <h1 className="text-xl font-bold">Sign in</h1>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-2.5" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-text-dim uppercase">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-accent"
              />
              {errors.email && <span className="text-xs text-red-400">{errors.email}</span>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-text-dim uppercase">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-accent"
              />
              {errors.password && <span className="text-xs text-red-400">{errors.password}</span>}
            </label>

            {failure && <p className="text-sm text-red-400">{failure}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 h-10 cursor-pointer rounded-full bg-accent text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-text-dim">
          No account yet?{" "}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
