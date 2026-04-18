import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { StateStorage } from "zustand/middleware"
import type { StoredUser } from "@/types/auth"

type AuthState = {
  user: StoredUser | null
  setUser: (user: StoredUser) => void
  clearUser: () => void
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null })
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage
      ),
      partialize: (state) => ({ user: state.user })
    }
  )
)
