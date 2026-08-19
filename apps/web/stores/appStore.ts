import { create } from "zustand"

// 4 个 Tab 常量
export const TABS = [
  { key: "dashboard" as const, label: "仪表盘", icon: "LayoutDashboard" },
  { key: "words" as const, label: "单词", icon: "BookOpen" },
  { key: "study" as const, label: "学习", icon: "GraduationCap" },
  { key: "settings" as const, label: "设置", icon: "Settings" },
] as const

export type TabKey = (typeof TABS)[number]["key"]

interface AppState {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void

  // 桌面端侧边栏
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))