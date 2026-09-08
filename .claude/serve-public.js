/* Serves public/ the way Vercel does — the deployed product is the single
   static file in there, not the Next.js app in src/, which vercel.json
   excludes from the build. Pointing the preview at `next dev` shows a build
   nobody ships.

   No dependencies on purpose: this has to run from a cold checkout. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);

const TYPES = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif', '.webp':'image/webp', '.ico':'image/x-icon',
  '.glb':'model/gltf-binary', '.gltf':'model/gltf+json',
  '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf',
  '.mp3':'audio/mpeg', '.wav':'audio/wav', '.mp4':'video/mp4',
};

http.createServer((req, res)=>{
  let rel;
  try{ rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch(e){ res.writeHead(400); return res.end('bad url'); }
  if(rel.endsWith('/')) rel += 'index.html';

  // Resolve first, then check it is still inside ROOT: "/../../etc/passwd" is
  // a normal-looking path until it has been resolved.
  const file = path.resolve(ROOT, '.' + rel);
  if(file !== ROOT && !file.startsWith(ROOT + path.sep)){
    res.writeHead(403); return res.end('forbidden');
  }
  fs.readFile(file, (err, buf)=>{
    if(err){ res.writeHead(404, {'Content-Type':'text/plain'}); return res.end('404'); }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',        // an edit is meant to show on reload
    });
    res.end(buf);
  });
}).listen(PORT, ()=> console.log('public/ on http://localhost:' + PORT));
