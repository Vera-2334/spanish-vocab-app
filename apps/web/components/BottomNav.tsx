"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Settings,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  key: string
  label: string
  href: string
  Icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "仪表盘", href: "/", Icon: LayoutDashboard },
  { key: "words", label: "单词", href: "/words", Icon: BookOpen },
  { key: "study", label: "学习", href: "/study", Icon: GraduationCap },
  { key: "settings", label: "设置", href: "/settings", Icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (item: NavItem): boolean => {
    if (item.href === "/") return pathname === "/"
    // 精确匹配，不做前缀
    return pathname === item.href
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-navbar)] flex items-center justify-around border-t-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] pb-[env(safe-area-inset-bottom)] md:hidden"
      role="navigation"
      aria-label="主导航"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item)
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch
            className={`flex flex-col items-center gap-0.5 px-2 py-2 min-w-0 flex-1 transition-colors duration-200 ${
              active
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <item.Icon
              size={24}
              strokeWidth={active ? 2.5 : 2}
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold leading-tight whitespace-nowrap">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}