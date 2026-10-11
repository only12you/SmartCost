const C='pqc-user-v303b',A=['./','index.html','manifest.json','icon-192.png','icon-512.png','icon-180.png','icon-maskable-512.png'];
const X=['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'];
self.oninstall=e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(async c=>{await Promise.all(A.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})));await Promise.all(X.map(u=>c.add(u).catch(()=>{})))}))};
self.onactivate=e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
// 앱 파일은 네트워크 우선(항상 최신), 오프라인이면 캐시 / 외부 라이브러리는 캐시 우선
self.onfetch=e=>{const r=e.request;if(r.method!='GET')return;const same=new URL(r.url).origin==location.origin;
if(same)e.respondWith(fetch(r,{cache:'no-cache'}).then(n=>{const cp=n.clone();caches.open(C).then(c=>c.put(r,cp));return n}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
else e.respondWith(caches.match(r).then(m=>m||fetch(r).then(n=>{const cp=n.clone();caches.open(C).then(c=>c.put(r,cp));return n})))};
