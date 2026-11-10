/* Service worker do Controle de Gastos.
   - Guarda o app (HTML, biblioteca, ícones) para abrir sem internet.
   - Nunca guarda nem intercepta chamadas ao Supabase (outro domínio): os dados passam direto.
   - Página principal: tenta a internet primeiro (assim as atualizações chegam) e usa a cópia guardada se estiver offline.
   - Nova versão: fica "esperando" até a pessoa tocar em "Atualizar agora" no aviso do app.
   IMPORTANTE: a cada versão nova, troque o VERSION abaixo (e o APP_VERSION no index.html) para os celulares perceberem. */
const VERSION = '2.1.0';
const V = 'gastos-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './supabase.js', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', v: VERSION });
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;

  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then(res => {
          if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put('./index.html', cp)); }
          return res;
        })
        .catch(() => caches.match('./index.html').then(m => m || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(r).then(m => {
      const net = fetch(r)
        .then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
        .catch(() => m);
      return m || net;
    })
  );
});
