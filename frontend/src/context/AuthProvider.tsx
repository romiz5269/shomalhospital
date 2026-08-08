"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthResponse, UserPublic } from "@/lib/types";
import {
  applyAuthResponse,
  clearTokens,
  fetchMe,
  getAccessToken,
  loginPassword,
  logoutApi,
  requestOtp,
  signup,
  verifyOtp,
} from "@/lib/auth-client";

type AuthContextValue = {
  user: UserPublic | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<UserPublic>;
  loginWithOtp: (phone: string, code: string) => Promise<UserPublic>;
  requestOtpCode: (phone: string, purpose: "login" | "signup") => Promise<string | undefined>;
  register: (payload: {
    phone: string;
    password: string;
    first_name?: string;
    last_name?: string;
    panel?: "patient" | "console" | "cms";
  }) => Promise<{ needsOtp: boolean; otpHint?: string }>;
  verifySignupOtp: (phone: string, code: string) => Promise<"ok" | "pending_approval">;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await refreshUser();
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await loginPassword(phone, password);
    const user = applyAuthResponse(res);
    setUser(user);
    return user;
  }, []);

  const loginWithOtp = useCallback(async (phone: string, code: string) => {
    const res = await verifyOtp(phone, code, "login");
    if ("pending_approval" in res) {
      throw new Error("Account not verified — awaiting admin approval");
    }
    const user = applyAuthResponse(res);
    setUser(user);
    return user;
  }, []);

  const requestOtpCode = useCallback(
    async (phone: string, purpose: "login" | "signup") => {
      const res = await requestOtp(phone, purpose);
      return res.otp_code;
    },
    [],
  );

  const register = useCallback(
    async (payload: {
      phone: string;
      password: string;
      first_name?: string;
      last_name?: string;
      panel?: "patient" | "console" | "cms";
    }) => {
      const res = await signup(payload);
      if (res.auto_login && res.user && res.tokens) {
        setUser(applyAuthResponse(res as AuthResponse));
        return { needsOtp: false };
      }
      return { needsOtp: true, otpHint: res.otp_code };
    },
    [],
  );

  const verifySignupOtp = useCallback(async (phone: string, code: string) => {
    const res = await verifyOtp(phone, code, "signup");
    if ("pending_approval" in res && res.pending_approval) {
      return "pending_approval" as const;
    }
    setUser(applyAuthResponse(res as AuthResponse));
    return "ok" as const;
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithOtp,
      requestOtpCode,
      register,
      verifySignupOtp,
      logout,
      refreshUser,
    }),
    [
      user,
      loading,
      login,
      loginWithOtp,
      requestOtpCode,
      register,
      verifySignupOtp,
      logout,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
