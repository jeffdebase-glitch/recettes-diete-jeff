/* Ma Diète V2 — mise à jour et consultation hors connexion */
const CACHE='ma-diete-v2-20261108';
const FILES=['./','./index.html','./app.js?v=2','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ma-diete-')&&key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 const isCore=event.request.mode==='navigate'||new URL(event.request.url).pathname.endsWith('/app.js');
 if(isCore){
   event.respondWith(fetch(event.request).then(response=>{if(response.ok){const backup=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,backup));}return response;}).catch(()=>caches.match(event.request)));
 } else {
   event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const backup=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,backup));}return response;})));
 }
});