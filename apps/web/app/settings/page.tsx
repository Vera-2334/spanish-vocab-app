"use client"

import { useEffect, useState, useRef } from "react"
import { Settings, Download, Upload, Save, User, LogOut, LogIn, Cloud } from "lucide-react"
import { AuthDialog } from "@/components/AuthDialog"
import { useAuthStore } from "@/stores/authStore"
import { pushAllWords, pullAndMerge } from "@/lib/syncEngine"
import { TagManager } from "@/components/TagManager"
import { useWordStore } from "@/stores/wordStore"
import { useToastStore } from "@/stores/toastStore"
import { downloadCSV, downloadAnkiApkg } from "@/lib/export"
import { backupToJSON, restoreFromJSON } from "@/lib/backup"

function AuthSection() {
  const { user, isLoggedIn, isLoading, restore, logout } = useAuthStore()
  const [authOpen, setAuthOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { restore() }, [])
  useEffect(() => { if (isLoggedIn) { pullAndMerge().then(() => pushAllWords().then(() => useWordStore.getState().fetchWords())) } }, [isLoggedIn])

  if (isLoading) return <div className="card p-5"><div className="h-12 bg-[var(--color-bg-secondary)] rounded animate-pulse" /></div>

  if (isLoggedIn && user) return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center"><User size={20} className="text-[var(--color-primary)]" /></div>
          <div><p className="text-sm font-bold text-[var(--color-text-primary)]">{user.email}</p><p className="text-xs text-[var(--color-secondary)]">已登录 · 自动同步</p></div>
        </div>
        <button onClick={logout} className="btn-ghost !text-xs !py-1.5 !px-3 !text-[var(--color-error)]"><LogOut size={14} />退出</button>
      </div>

      {/* 常规同步 */}
      <button onClick={async () => {
        setSyncing(true)
        // 先拉云端最新合并到本地，再推合并后的本地（不丢任何一边的进度）
        const pulled = await pullAndMerge()
        useWordStore.getState().fetchWords()
        const pushed = await pushAllWords()
        useToastStore.getState().addToast(`已同步（拉取 ${pulled} 词，推送 ${pushed} 词）`, 'success')
        setSyncing(false)
      }} disabled={syncing} className="btn-primary w-full !text-sm !py-2"><Cloud size={16} />{syncing ? "同步中..." : "同步进度"}</button>

    </div>
  )

  return (
    <div className="card p-5 space-y-3">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">账号登录</h3>
      <p className="text-xs text-[var(--color-text-secondary)]">登录后单词自动同步到云端，换设备不丢失。</p>
      <button onClick={() => setAuthOpen(true)} className="btn-primary w-full !text-sm !py-2"><LogIn size={16} />登录 / 注册</button>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

export default function SettingsPage() {
  const { words, fetchWords } = useWordStore()
  const { addToast } = useToastStore()
  const [restoring, setRestoring] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { fetchWords() }, [])

  async function handleBackup() { const { count, filename } = await backupToJSON(); addToast(`已备份 ${count} 个单词 → ${filename}`, "success") }
  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; setRestoring(true)
    try { const result = await restoreFromJSON(file); await fetchWords(); addToast(`已恢复 ${result.words} 个单词`, "success") }
    catch { addToast("备份文件无效，恢复失败", "error") }
    finally { setRestoring(false); if (fileRef.current) fileRef.current.value = "" }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Settings size={28} strokeWidth={2.5} className="text-[var(--color-primary)]" /><h1 className="text-[var(--text-h1)] text-[var(--color-text-primary)]">设置</h1></div>
      <AuthSection />

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2"><Save size={16} className="text-[var(--color-primary)]" />数据备份与恢复</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">定期备份防止浏览器数据丢失。换设备或清缓存后通过备份文件恢复。</p>
        <div className="flex gap-3"><button onClick={handleBackup} disabled={words.length===0} className="btn-primary flex-1 disabled:opacity-50"><Download size={18} />一键备份 ({words.length}词)</button><button onClick={()=>fileRef.current?.click()} disabled={restoring} className="btn-ghost flex-1 disabled:opacity-50"><Upload size={18} />{restoring?"恢复中…":"恢复数据"}</button><input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" /></div>
      </div>

      <div className="card p-4"><TagManager /></div>

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">导出为文件</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">{words.length>0?`导出全部 ${words.length} 个单词`:"还没有单词"}</p>
        <div className="flex gap-3"><button onClick={()=>{downloadCSV(words);addToast("CSV 导出成功","success")}} disabled={words.length===0} className="btn-primary flex-1 disabled:opacity-50"><Download size={18} />导出 CSV</button><button onClick={()=>{downloadAnkiApkg(words);addToast("Anki 格式导出成功","success")}} disabled={words.length===0} className="btn-ghost flex-1 disabled:opacity-50"><Download size={18} />导出 Anki</button></div>
      </div>
    </div>
  )
}
