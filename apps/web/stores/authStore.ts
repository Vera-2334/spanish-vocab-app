"use client"

import { create } from "zustand"

interface User {
  id: string
  email: string
  createdAt: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoggedIn: boolean
  isLoading: boolean

  // 从 localStorage 恢复
  restore: () => void

  // 登录
  login: (email: string, password: string) => Promise<{ error?: string }>

  // 注册
  register: (email: string, password: string) => Promise<{ error?: string }>

  // 刷新 token
  refreshAccessToken: () => Promise<boolean>

  // 登出
  logout: () => void

  // 获取认证 header
  getAuthHeaders: () => Record<string, string>
}

const API_BASE = "" // 同域 API Routes

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoggedIn: false,
  isLoading: true,

  restore: () => {
    if (typeof window === "undefined") return
    try {
      const accessToken = localStorage.getItem("accessToken")
      const refreshToken = localStorage.getItem("refreshToken")
      const userJson = localStorage.getItem("user")

      if (accessToken && userJson) {
        const user = JSON.parse(userJson)
        set({ user, accessToken, refreshToken, isLoggedIn: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        return { error: data.error || "登录失败" }
      }

      // 存储 token
      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
      localStorage.setItem("user", JSON.stringify(data.user))

      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isLoggedIn: true,
      })

      return {}
    } catch {
      return { error: "网络错误，请检查连接" }
    }
  },

  register: async (email, password) => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        return { error: data.error || "注册失败" }
      }

      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
      localStorage.setItem("user", JSON.stringify(data.user))

      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isLoggedIn: true,
      })

      return {}
    } catch {
      return { error: "网络错误，请检查连接" }
    }
  },

  refreshAccessToken: async () => {
    const { refreshToken: rt } = get()
    if (!rt) return false

    try {
      const resp = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      })

      if (!resp.ok) {
        get().logout()
        return false
      }

      const data = await resp.json()
      localStorage.setItem("accessToken", data.accessToken)
      set({ accessToken: data.accessToken })
      return true
    } catch {
      return false
    }
  },

  logout: () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    set({ user: null, accessToken: null, refreshToken: null, isLoggedIn: false })
  },

  getAuthHeaders: () => {
    const { accessToken } = get()
    const headers: Record<string, string> = {}
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`
    }
    return headers
  },
}))