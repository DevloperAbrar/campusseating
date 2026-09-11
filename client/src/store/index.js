import { create } from 'zustand'
import { authAPI, superadminAPI } from '../api'

const useStore = create((set, get) => ({
  // ── Admin Auth ────────────────────────────────────────────────────────────
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

  // ── Super Admin Auth ──────────────────────────────────────────────────────
  superAdmin: null,
  superAdminLoading: true,

  checkSuperAdmin: async () => {
    // Super admin token is cookie-based just like admin
    // We check by hitting stats — if 401, not logged in
    try {
      await superadminAPI.stats()
      set({ superAdmin: { role: 'SUPER_ADMIN' }, superAdminLoading: false })
    } catch {
      set({ superAdmin: null, superAdminLoading: false })
    }
  },

  superAdminLogin: async (email, password) => {
    const res = await superadminAPI.login({ email, password })
    set({ superAdmin: res.data.data })
    return res.data
  },

  superAdminLogout: async () => {
    try { await superadminAPI.logout() } catch {}
    set({ superAdmin: null })
  },

  // ── UI state ──────────────────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Global loading overlay ────────────────────────────────────────────────
  globalLoading: false,
  setGlobalLoading: (v) => set({ globalLoading: v }),
}))

export default useStore