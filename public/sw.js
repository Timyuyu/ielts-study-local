/* 雅思学习APP 离线 Service Worker */
const CACHE_NAME = "ielts-offline-v1";
const AUDIO_CACHE_NAME = "ielts-audio-v1";

/* 应用壳：页面与资源（不含音频，音频单独缓存便于批量管理） */
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== AUDIO_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* 请求匹配：http(s) 且 GET */
function isCacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  return url.protocol === "http:" || url.protocol === "https:";
}

function isAudio(url) {
  return url.pathname.startsWith("/audio/");
}

function isHashedAsset(url) {
  return url.pathname.startsWith("/assets/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!isCacheable(request)) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* 音频与带 hash 的静态资源：cache-first（不可变，离线友好）
     页面 HTML 等动态内容：network-first（保证拿到最新版，断网时回退缓存） */
  if (isAudio(url) || isHashedAsset(url)) {
    const cacheName = isAudio(url) ? AUDIO_CACHE_NAME : CACHE_NAME;
    event.respondWith(
      caches.open(cacheName).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && (response.status === 200 || response.status === 0)) {
              const copy = response.clone();
              cache.put(request, copy);
            }
            return response;
          });
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && (response.status === 200 || response.status === 0)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.open(CACHE_NAME).then((cache) => cache.match(request))
      )
  );
});

/* 页面脚本可发消息请求批量缓存音频列表 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_AUDIO_LIST") {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(AUDIO_CACHE_NAME).then((cache) => cache.addAll(urls)).then(() => {
        event.source.postMessage({ type: "CACHE_AUDIO_DONE", count: urls.length });
      })
    );
  }
  if (event.data && event.data.type === "CACHE_STATS") {
    caches.open(AUDIO_CACHE_NAME).then((cache) => cache.keys()).then((keys) => {
      event.source.postMessage({ type: "CACHE_STATS_RESULT", audioCount: keys.length });
    });
  }
});
