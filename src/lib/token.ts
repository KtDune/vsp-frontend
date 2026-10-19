type AccessTokenListener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<AccessTokenListener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  for (const listener of listeners) {
    listener(token);
  }
}

export function clearTokens() {
  setAccessToken(null);
}

export function subscribeAccessToken(listener: AccessTokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

export function getAuthUser(): AuthUser | null {
  const payload = getAccessToken()?.split(".")[1];
  if (!payload) return null;

  try {
    const claims: { sub?: string; username?: string; email?: string; type?: string } =
      JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
    const id = Number(claims.sub);
    if (
      claims.type !== "access" ||
      !Number.isInteger(id) ||
      claims.username == null ||
      claims.email == null
    ) {
      return null;
    }
    return { id, username: claims.username, email: claims.email };
  } catch {
    return null;
  }
}
