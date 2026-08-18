const VERSAO = "notas-v60";

self.addEventListener("install", e => {
  // Forçar ativação imediata sem esperar abas fecharem
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  
  // Sempre rede para APIs do Google/Firebase
  if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].some(h => url.hostname.includes(h))) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network First para TUDO: tenta a rede, fallback para cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cachear a resposta fresca
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(VERSAO).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
