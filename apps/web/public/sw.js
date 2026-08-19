// Service Worker · 西语单词 PWA
const CACHE_NAME = "spanish-vocab-v0.6.0"
const CACHE_URLS = [
  "/",
  "/words",
  "/study",
  "/stats",
  "/settings",
  "/manifest.json",
]

// Install — 预缓存核心页面
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS)
    }).then(() => self.skipWaiting())
  )
})

// Activate — 清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch — Network First 策略，离线时回退缓存
self.addEventListener("fetch", (event) => {
  // 跳过 API 请求和非 GET
  if (!event.request.url.startsWith("http") || event.request.method !== "GET") return

  // 对 HTML 页面使用 Network First
  if (event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // JS/CSS/Font/Image 使用 Cache First
  if (
    event.request.url.includes("/_next/") ||
    event.request.url.includes(".js") ||
    event.request.url.includes(".css") ||
    event.request.url.includes(".woff")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
    return
  }
})