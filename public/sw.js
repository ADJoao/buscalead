// Service worker mínimo: só deixa o navegador oferecer "Instalar app".
// Não guarda nada em cache, então o app sempre abre na versão mais nova.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
