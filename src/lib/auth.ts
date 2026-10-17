import { http } from "./http";

export type Visibility = "PUBLIC" | "PRIVATE";

export type RegisterValues = {
  username: string;
  email: string;
  password: string;
  reEnterPassword: string;
  visibility: Visibility;
};

export type FieldErrors = Partial<Record<"username" | "email" | "password" | "reEnterPassword", string>>;

export function validateUsername(username: string): string | undefined {
  if (!/^[a-zA-Z0-9_]{5,20}$/.test(username)) {
    return "Username must be 5-20 characters (letters, digits, _ only)";
  }
}

export function validateEmail(email: string): string | undefined {
  if (email.length < 5 || email.length > 50) {
    return "Email must be 5-50 characters";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address";
  }
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8 || password.length > 50) {
    return "Password must be 8-50 characters";
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
    return "Needs at least one uppercase letter, one number, and one symbol";
  }
}

export function validateRegister(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {
    username: validateUsername(values.username),
    email: validateEmail(values.email.trim()),
    password: validatePassword(values.password),
  };
  if (values.password !== values.reEnterPassword) {
    errors.reEnterPassword = "Passwords do not match";
  }
  return errors;
}

export async function register(values: RegisterValues): Promise<void> {
  await http.post("/users", values);
}

export async function login(email: string, password: string): Promise<string | null> {
  const res = await http.post<{ token?: string; accessToken?: string }>("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });
  return res.data.token ?? res.data.accessToken ?? null;
}
