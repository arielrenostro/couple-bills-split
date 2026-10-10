// Service worker do app: guarda só o "casco" (HTML, JS, CSS, ícones) para abrir
// rápido. A API (/api/*) nunca passa pelo cache: saldo velho seria pior que erro.
const CACHE = "contas-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) {
        if (nome !== CACHE) await caches.delete(nome);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);

  if (pedido.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Páginas: rede primeiro (pega versão nova), cache se estiver sem sinal.
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          void caches.open(CACHE).then((c) => c.put("/", copia));
          return resposta;
        })
        .catch(() => caches.match("/").then((r) => r ?? Response.error())),
    );
    return;
  }

  // Arquivos estáticos: cache primeiro; os de /assets têm hash no nome.
  evento.respondWith(
    caches.match(pedido).then(
      (guardado) =>
        guardado ??
        fetch(pedido).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            void caches.open(CACHE).then((c) => c.put(pedido, copia));
          }
          return resposta;
        }),
    ),
  );
});
