"use client"

import { useEffect, useState } from "react"

// ============================================================
// PWA 安装提示 Hook
// ============================================================

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return result.outcome
  }

  return { canInstall: !!deferredPrompt, promptInstall }
}

// ============================================================
// 在线状态 Hook
// ============================================================

export function useOnlineStatus() {
  // 始终初始化为 true，避免 SSR hydration 不匹配
  // 客户端的实际状态在 useEffect 中同步
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)

    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)

    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  return online
}

// ============================================================
// SW 注册 Hook
// ============================================================

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("SW registered:", reg.scope)
      })
      .catch((err) => {
        console.log("SW registration failed:", err)
      })
  }, [])
}