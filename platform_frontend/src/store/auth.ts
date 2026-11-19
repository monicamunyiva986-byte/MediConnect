import { create } from 'zustand'
import type { ApiUser } from '../types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: ApiUser | null
  setSession: (accessToken: string, user: ApiUser, refreshToken: string) => void
  updateTokens: (accessToken: string, refreshToken: string) => void
  updateUser: (user: ApiUser) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setSession: (accessToken, user, refreshToken) => set({ accessToken, refreshToken, user }),
  updateTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  updateUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
}))