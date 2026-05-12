//frontend/src/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role, LoginForm, AuthResponse } from "@/types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://oasis-vincent-lauderdale-dock.trycloudflare.com";

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (credentials: LoginForm) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
  seedAdmin: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (credentials: LoginForm) => {
        try {
          set({ isLoading: true });

          const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          if (!res.ok) throw new Error("Invalid username or password");

          const response: AuthResponse = await res.json();

          set({
            user: response.user,
            token: response.access_token,
            role: response.role,
            isAuthenticated: true,
            isLoading: false,
          });

          localStorage.setItem("auth_token", response.access_token);
          localStorage.setItem("user_role", response.role);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        });

        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
      },

      initialize: async () => {
        const token = get().token || localStorage.getItem("auth_token");
        if (!token) return;

        try {
          set({ isLoading: true });
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) throw new Error("Invalid session");

          const user: User = await res.json();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          get().logout();
        }
      },

      seedAdmin: async () => {
        await fetch(`${API_BASE_URL}/auth/seed-admin`, { method: "POST" });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
