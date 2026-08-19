"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Settings,
  PlusCircle,
  type LucideIcon,
} from "lucide-react"

interface SidebarItem {
  key: string
  label: string
  href: string
  Icon: LucideIcon
}

const MAIN_NAV: SidebarItem[] = [
  { key: "dashboard", label: "仪表盘", href: "/", Icon: LayoutDashboard },
  { key: "words", label: "单词列表", href: "/words", Icon: BookOpen },
  { key: "study", label: "开始学习", href: "/study", Icon: GraduationCap },
  { key: "add-word", label: "添加单词", href: "/words/add", Icon: PlusCircle },
  { key: "settings", label: "设置", href: "/settings", Icon: Settings },
]

function NavSection({
  items,
  isActive,
  title,
}: {
  items: SidebarItem[]
  isActive: (href: string) => boolean
  title?: string
}) {
  return (
    <div className="space-y-0.5">
      {title && (
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {title}
        </p>
      )}
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              active
                ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <item.Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  // 精确匹配高亮：每个侧边栏项独立判断，不做前缀匹配
  const isActive = (href: string): boolean => {
    if (href.includes("?")) {
      // 带 query 的链接：只匹配完整 query（处理方式：仅比较 pathname 时不考虑 query，不做额外高亮）
      const basePath = href.split("?")[0]
      return pathname === basePath
    }
    // 精确匹配，不做 startsWith 模糊前缀
    return pathname === href
  }

  return (
    <aside
      className="hidden md:flex flex-col w-[240px] min-w-[240px] h-[100dvh] sticky top-0 border-r-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-y-auto"
      role="navigation"
      aria-label="侧边栏导航"
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b-2 border-[var(--color-border)]">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-lg text-[var(--color-primary)] no-underline"
        >
          <span className="text-2xl">🇪🇸</span>
          <span>西语单词</span>
        </Link>
      </div>

      {/* 导航区 */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        <NavSection items={MAIN_NAV} isActive={isActive} />
      </nav>
    </aside>
  )
}