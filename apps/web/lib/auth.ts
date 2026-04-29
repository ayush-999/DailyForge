// Token storage — localStorage for Phase 1. Migrated to HTTP-only cookies in Phase 2.

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

export const clearTokens = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const isAuthenticated = (): boolean => !!getAccessToken();

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Exchanges the stored refresh token for a new access + refresh token pair.
 * Returns the new access token, or null if the session has expired.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }
    );

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
};

// ── Backwards-compat aliases (used by existing dashboard/profile code) ────────

/** @deprecated Use getAccessToken() */
export const getToken = getAccessToken;

/** @deprecated Use setTokens() */
export const setToken = (token: string): void => {
  const refresh = getRefreshToken() ?? "";
  setTokens(token, refresh);
};

/** @deprecated Use clearTokens() */
export const removeToken = clearTokens;
