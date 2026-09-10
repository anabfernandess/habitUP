import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { appService } from "../lib/appService";
import type { AuthUserInfo } from "../lib/types";

interface AuthContextValue {
  user: AuthUserInfo | null;
  status: "loading" | "authed" | "anon";
  isDemo: boolean;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string, name: string): Promise<
    { error: string } | { needsConfirmation: boolean }
  >;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserInfo | null>(() =>
    appService.getUser(),
  );
  const [status, setStatus] = useState<"loading" | "authed" | "anon">(() =>
    appService.getUser() ? "authed" : "anon",
  );

  useEffect(() => {
    setStatus(appService.getUser() ? "authed" : "loading");
    const unsubscribe = appService.onAuthChange((u) => {
      setUser(u);
      setStatus(u ? "authed" : "anon");
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await appService.signIn(email, password);
    if (res.ok) {
      setUser(appService.getUser());
      setStatus("authed");
      return null;
    }
    return res.error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await appService.signUp(email, password, name);
      if (!res.ok) return { error: res.error };
      if (appService.isRealAuth && res.needsConfirmation) {
        return { needsConfirmation: true };
      }
      setUser(appService.getUser());
      setStatus("authed");
      return { needsConfirmation: false };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await appService.signOut();
    setUser(null);
    setStatus("anon");
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const res = await appService.resetPassword(email);
    return res.ok ? null : (res.error ?? "Algo deu errado");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isDemo: appService.mode === "demo",
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, status, signIn, signUp, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}