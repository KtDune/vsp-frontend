import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { register, validateRegister, type RegisterValues, type Visibility } from "../lib/auth";

const emptyValues: RegisterValues = {
  username: "",
  email: "",
  password: "",
  reEnterPassword: "",
  visibility: "PUBLIC",
};

type FieldName = keyof typeof emptyValues;

export default function SignupPage() {
  const [values, setValues] = useState<RegisterValues>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const set = (field: FieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setFailure(null);

    const next = validateRegister({ ...values, email: values.email.trim() });
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);

    try {
      await register({
        username: values.username.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        reEnterPassword: values.reEnterPassword,
        visibility: values.visibility,
      });
    } catch (err) {
      setFailure(
        err instanceof Error && err.message
          ? err.message
          : "Could not create the account. Check the fields and try again.",
      );
      setBusy(false);
      return;
    }

    try {
      await login(values.email.trim().toLowerCase(), values.password);
      navigate("/");
    } catch {
      setFailure("Account created. Please log in to continue.");
    } finally {
      setBusy(false);
    }
  };

  const loginHint = (
    <p className="mt-4 text-center text-sm text-text-dim">
      Already have an account?{" "}
      <Link to="/login" className="font-medium text-accent hover:underline">
        Sign in
      </Link>
    </p>
  );

  const serverFailure = failure && !Object.keys(errors).some(Boolean);

  return (
    <main className="flex justify-center px-4 pt-28 pb-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-black text-white">
              V
            </span>
            <h1 className="text-xl font-bold">Create account</h1>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-2.5" noValidate>
            <Field
              label="Username"
              name="username"
              value={values.username}
              onChange={set}
              error={errors.username}
              autoComplete="username"
              placeholder="5-20 letters, digits or _"
            />
            <Field
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={set}
              error={errors.email}
              autoComplete="email"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              value={values.password}
              onChange={set}
              error={errors.password}
              autoComplete="new-password"
              placeholder="8-50 chars, 1 uppercase, 1 number, 1 symbol"
            />
            <Field
              label="Re-enter password"
              name="reEnterPassword"
              type="password"
              value={values.reEnterPassword}
              onChange={set}
              error={errors.reEnterPassword}
              autoComplete="new-password"
            />

            <div>
              <span className="text-xs font-medium tracking-wide text-text-dim uppercase">Visibility</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["PUBLIC", "PRIVATE"] as Visibility[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => set("visibility", option)}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      values.visibility === option
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-text-dim hover:border-text-dim"
                    }`}
                  >
                    {option === "PUBLIC" ? "Public" : "Private"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-text-dim">
                Private accounts are searchable but show only the username to others.
              </p>
            </div>

            {serverFailure && <p className="text-sm text-red-400">{failure}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 h-10 cursor-pointer rounded-full bg-accent text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Creating…" : "Sign up"}
            </button>
          </form>
        </div>

        {loginHint}
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  name: FieldName;
  value: string;
  onChange: (field: FieldName, value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-text-dim uppercase">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className={`h-10 rounded-lg border bg-bg px-3 text-sm outline-none ${
          error ? "border-red-400" : "border-border focus:border-accent"
        }`}
      />
      {error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : (
        placeholder && <span className="text-xs text-text-dim">{placeholder}</span>
      )}
    </label>
  );
}
