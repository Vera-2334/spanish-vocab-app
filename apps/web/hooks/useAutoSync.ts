"use client"

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/stores/authStore"
import { useWordStore } from "@/stores/wordStore"
import { pullAndMerge } from "@/lib/syncEngine"

/**
 * 自动同步（只拉不推，纯读操作，不增加云端写入）：
 * - 页面加载时拉取一次
 * - 切回页面（visibilitychange / focus）时拉取，带 30 秒节流
 */
export function useAutoSync() {
  const { isLoggedIn, isLoading } = useAuthStore()
  const lastSyncAt = useRef(0)
  const isLoggedInRef = useRef(isLoggedIn)

  useEffect(() => {
    isLoggedInRef.current = isLoggedIn
  }, [isLoggedIn])

  useEffect(() => {
    const sync = () => {
      if (!isLoggedInRef.current) return
      const now = Date.now()
      if (now - lastSyncAt.current < 30_000) return // 30s 节流，避免频繁切窗口反复拉
      lastSyncAt.current = now
      pullAndMerge().then((merged) => {
        if (merged > 0) useWordStore.getState().fetchWords()
      })
    }

    // 页面加载拉取一次（登录状态就绪后）
    if (!isLoading && isLoggedIn) sync()

    // 切回页面自动拉取
    const onVisible = () => {
      if (document.visibilityState === "visible") sync()
    }
    const onFocus = () => sync()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  }, [isLoading, isLoggedIn])
}
