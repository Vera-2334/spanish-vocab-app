"use client"

import { useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { BottomNav } from "@/components/BottomNav"
import { ToastContainer } from "@/components/ToastContainer"
import { useOnlineStatus, useInstallPrompt } from "@/lib/pwa"
import { useToastStore } from "@/stores/toastStore"
import { useAuthStore } from "@/stores/authStore"
import { useSrsStore } from "@/stores/srsStore"
import { useAutoSync } from "@/hooks/useAutoSync"
import { WifiOff, Download } from "lucide-react"

export default function LayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const online = useOnlineStatus()
  const { canInstall, promptInstall } = useInstallPrompt()
  const { addToast } = useToastStore()

  const { restore } = useAuthStore()
  const restoreStreak = useSrsStore((s) => s.restoreStreak)
  useEffect(() => { restore(); restoreStreak() }, [])

  // 页面加载时自动从云端拉取最新数据
  useAutoSync()

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => { /* ignore */ })
  }, [])

  useEffect(() => {
    if (!online) {
      addToast("当前处于离线模式，数据保存在本地", "info", 5000)
    }
  }, [online])

  async function handleInstall() {
    const outcome = await promptInstall()
    if (outcome === "accepted") {
      addToast("安装成功！", "success")
    }
  }

  return (
    <>
      {!online && (
        <div className="sticky top-0 z-[var(--z-progress)] flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white text-xs font-bold">
          <WifiOff size={14} />
          离线模式 · 数据保存在本地，联网后自动同步
        </div>
      )}

      <div className="flex min-h-[100dvh]">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <div className="mx-auto w-full max-w-[672px] px-4 py-4 md:px-6 md:py-6">
            {canInstall && (
              <div className="card p-3 mb-4 flex items-center gap-3 bg-[var(--color-primary-light)] border-[var(--color-primary)]">
                <Download size={18} className="text-[var(--color-primary)] shrink-0" />
                <p className="text-xs font-semibold text-[var(--color-primary)] flex-1">
                  安装到主屏幕，离线也能用
                </p>
                <button onClick={handleInstall} className="btn-primary !text-xs !px-3 !py-1">安装</button>
              </div>
            )}
            {children}
          </div>
        </main>
        <BottomNav />
      </div>

      <ToastContainer />
    </>
  )
}