import { create } from 'zustand'
import { authAPI } from '../api'

const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  admin: null,
  authLoading: true,

  setAdmin: (admin) => set({ admin }),

  checkAuth: async () => {
    try {
      const res = await authAPI.me()
      set({ admin: res.data.data, authLoading: false })
    } catch {
      set({ admin: null, authLoading: false })
    }
  },

  login: async (email, password) => {
    const res = await authAPI.login({ email, password })
    set({ admin: res.data.data })
    return res.data
  },

  logout: async () => {
    try { await authAPI.logout() } catch {}
    set({ admin: null })
  },

  // ── UI state ──────────────────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Global loading overlay ────────────────────────────────────────────────
  globalLoading: false,
  setGlobalLoading: (v) => set({ globalLoading: v }),
}))

export default useStore