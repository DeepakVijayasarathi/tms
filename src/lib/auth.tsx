import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, tokenStore } from "./api";
import type { Me } from "./types";

interface AuthState {
  me: Me | null | undefined;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { email: string; password: string; fullName: string; accountType: string; organizationName?: string }) => Promise<void>;
  logout: () => void;
  can: (permission: string, tenantId?: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => (tokenStore.get() ? api<Me>("/me").catch(() => null) : Promise.resolve(null)),
    staleTime: 60_000,
  });

  const afterAuth = useCallback(
    async (token: string) => {
      tokenStore.set(token);
      await qc.resetQueries();
    },
    [qc],
  );

  const value: AuthState = {
    me,
    loading: isLoading,
    login: async (email, password) => afterAuth((await post<{ token: string }>("/auth/login", { email, password })).token),
    register: async (body) => afterAuth((await post<{ token: string }>("/auth/register", body)).token),
    logout: () => {
      tokenStore.set(null);
      qc.clear();
      qc.setQueryData(["me"], null);
    },
    can: (permission, tenantId) =>
      !!me?.tenants.some(
        (t) => t.permissions.includes(permission) && (tenantId === undefined || t.id === tenantId || t.kind === "Platform"),
      ),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
