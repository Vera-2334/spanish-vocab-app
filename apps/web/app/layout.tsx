import type { Metadata } from "next"
import LayoutWrapper from "./layout-wrapper"
import "./globals.css"

export const metadata: Metadata = {
  title: "Spanish Vocab",
  description: "西语单词记忆工具 · 闪卡 + SRS 间隔重复",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-[100dvh] bg-[var(--color-bg-secondary)] antialiased">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}