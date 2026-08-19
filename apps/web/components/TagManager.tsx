"use client"

import { useState, useEffect } from "react"
import { Tag, Plus, X, Pencil, Trash2 } from "lucide-react"
import type { Tag as TagType } from "@spanish-vocab/database"
import { useTagStore } from "@/stores/tagStore"

export function TagManager() {
  const { tags, fetchTags, addTag, updateTag, deleteTag } = useTagStore()
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  useEffect(() => {
    fetchTags()
  }, [])

  async function handleAdd() {
    const name = newName.trim()
    if (!name || name.length > 20) return
    await addTag(name)
    setNewName("")
  }

  async function handleUpdate(id: string) {
    const name = editName.trim()
    if (!name || name.length > 20) return
    await updateTag(id, { name })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tag size={18} className="text-[var(--color-primary)]" />
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          标签管理
        </h3>
        <span className="text-xs text-[var(--color-text-secondary)]">({tags.length})</span>
      </div>

      {/* 添加标签 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="新标签名称…"
          maxLength={20}
          className="flex-1 px-3 py-2 text-sm bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="btn-primary !px-3 !py-2 !text-sm disabled:opacity-50"
        >
          <Plus size={14} />
          添加
        </button>
      </div>

      {/* 标签列表 */}
      {tags.length > 0 && (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-bg-secondary)]"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />

              {editingId === tag.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                  className="flex-1 px-2 py-1 text-sm bg-white border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-semibold text-[var(--color-text-primary)] truncate">
                  {tag.name}
                </span>
              )}

              {editingId === tag.id ? (
                <>
                  <button
                    onClick={() => handleUpdate(tag.id)}
                    className="text-xs text-[var(--color-primary)] font-semibold hover:underline"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-[var(--color-text-secondary)]"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(tag.id)
                      setEditName(tag.name)
                    }}
                    className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteTag(tag.id)}
                    className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}