import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { login as loginRequest, logout as logoutRequest } from "../lib/auth";
import { refreshAccessToken } from "../lib/http";
import { clearTokens, getAccessToken, setAccessToken, subscribeAccessToken } from "../lib/token";
import { AuthContext, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setTokenState] = useState<string | null>(getAccessToken());

  useEffect(() => subscribeAccessToken(setTokenState), []);

  useEffect(() => {
    refreshAccessToken();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginRequest(email, password);
    if (!token) throw new Error("Login failed");
    setAccessToken(token);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    clearTokens();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ accessToken, login, logout }),
    [accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
