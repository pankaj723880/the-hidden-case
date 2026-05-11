import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { jwtDecode } from "jwt-decode";

import { api, setApiAccessToken } from "../lib/api";

const AuthContext = createContext(undefined);
const ACCESS_TOKEN_KEY = "thc-access-token";

function decodeUserFromAccessToken(token) {
  try {
    const decoded = jwtDecode(token);
    const id = String(decoded.sub ?? decoded.id ?? "");
    if (!id) return null;

    return {
      id,
      name: String(decoded.name ?? ""),
      email: String(decoded.email ?? ""),
      role: decoded.role ?? "user",
      avatar: String(decoded.avatar ?? ""),
      bio: String(decoded.bio ?? ""),
    };
  } catch {
    return null;
  }
}

function isTokenUsable(token) {
  try {
    const decoded = jwtDecode(token);
    const expiresAt = Number(decoded.exp ?? 0) * 1000;
    return Boolean(decoded.sub || decoded.id) && expiresAt > Date.now() + 5000;
  } catch {
    return false;
  }
}

function storeAccessToken(token) {
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

async function fetchCurrentUserProfile(decodedUser) {
  try {
    const res = await api.get("/api/users/me");
    return { ...decodedUser, ...res.data.user };
  } catch {
    return decodedUser;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!accessToken && !!user;

  const refreshAccessTokenImpl = useCallback(async () => {
    // backend should use httpOnly cookie to issue new access token
    const res = await api.post("/api/auth/refresh");
    const refreshedAccessToken = String(res.data.accessToken ?? "");
    if (!refreshedAccessToken)
      throw new Error("Missing accessToken in refresh response");

    setAccessToken(refreshedAccessToken);
    setApiAccessToken(refreshedAccessToken);
    storeAccessToken(refreshedAccessToken);
    const decodedUser = decodeUserFromAccessToken(refreshedAccessToken);
    setUser(await fetchCurrentUserProfile(decodedUser));
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const receivedAccessToken = String(res.data.accessToken ?? "");
      if (!receivedAccessToken)
        throw new Error("Missing accessToken in response");

      setAccessToken(receivedAccessToken);
      setApiAccessToken(receivedAccessToken);
      storeAccessToken(receivedAccessToken);
      const decodedUser = decodeUserFromAccessToken(receivedAccessToken);
      const profileUser = await fetchCurrentUserProfile(decodedUser);
      setUser(profileUser);
      return profileUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    setIsLoading(true);
    try {
      const res = await api.post("/api/auth/google", { credential });
      const receivedAccessToken = String(res.data.accessToken ?? "");
      if (!receivedAccessToken)
        throw new Error("Missing accessToken in response");

      setAccessToken(receivedAccessToken);
      setApiAccessToken(receivedAccessToken);
      storeAccessToken(receivedAccessToken);
      const decodedUser = decodeUserFromAccessToken(receivedAccessToken);
      const profileUser = await fetchCurrentUserProfile(decodedUser);
      setUser(profileUser);
      return profileUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setIsLoading(true);
    try {
      await api.post("/api/auth/register", { name, email, password });
      const res = await api.post("/api/auth/login", { email, password });
      const receivedAccessToken = String(res.data.accessToken ?? "");
      if (!receivedAccessToken)
        throw new Error("Missing accessToken in response");

      setAccessToken(receivedAccessToken);
      setApiAccessToken(receivedAccessToken);
      storeAccessToken(receivedAccessToken);
      const decodedUser = decodeUserFromAccessToken(receivedAccessToken);
      const profileUser = await fetchCurrentUserProfile(decodedUser);
      setUser(profileUser);
      return profileUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await api.post("/api/auth/logout");
    setAccessToken(null);
    setApiAccessToken(null);
    storeAccessToken("");
    setUser(null);
    setIsLoading(false);
  }, []);

  const setProfileUser = useCallback((profileUser) => {
    setUser((current) => ({ ...current, ...profileUser }));
  }, []);

  useEffect(() => {
    // refreshToken is httpOnly cookie; accessToken is held in-memory.
    void (async () => {
      try {
        const savedAccessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
        if (savedAccessToken && isTokenUsable(savedAccessToken)) {
          setAccessToken(savedAccessToken);
          setApiAccessToken(savedAccessToken);
          const decodedUser = decodeUserFromAccessToken(savedAccessToken);
          setUser(await fetchCurrentUserProfile(decodedUser));
          return;
        }
        storeAccessToken("");
        await refreshAccessTokenImpl();
      } catch {
        // ignore (user will remain unauthenticated)
        storeAccessToken("");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshAccessTokenImpl]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated,
      login,
      loginWithGoogle,
      register,
      logout,
      setProfileUser,
      refreshAccessToken: refreshAccessTokenImpl,
    }),
    [
      accessToken,
      isAuthenticated,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      refreshAccessTokenImpl,
      register,
      setProfileUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
