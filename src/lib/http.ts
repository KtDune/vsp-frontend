import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, setAccessToken } from "./token";

export const http = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function requestNewAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post<{ accessToken?: string }>(
      "/api/v1/auth/refresh",
      {},
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      },
    );
    const accessToken = res.data.accessToken ?? null;
    if (!accessToken) return null;
    setAccessToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= requestNewAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const isAuthCall = config?.url?.includes("/auth/") ?? false;
    if (error.response?.status !== 401 || !config || config._retried || isAuthCall) {
      return Promise.reject(error);
    }

    config._retried = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      clearTokens();
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${newToken}`;
    return http.request(config);
  },
);
