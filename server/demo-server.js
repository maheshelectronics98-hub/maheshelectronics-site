// Local preview of dist/ — serves the exact files that GitHub Pages will
// serve. Run: node demo-server.js   →   http://localhost:8080
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'dist');
const PORT = 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const f = path.join(ROOT, url);
  // basic path traversal guard
  if (!path.resolve(f).startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  if (!fs.existsSync(f)) { console.log('404', url); res.writeHead(404); return res.end('not found'); }
  if (fs.statSync(f).isDirectory()) {
    const idx = path.join(f, 'index.html');
    if (fs.existsSync(idx)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(idx));
    }
    res.writeHead(404); return res.end();
  }
  const ext = path.extname(f).toLowerCase();
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(fs.readFileSync(f));
}).listen(PORT, () => {
  console.log(`Demo (final-deploy preview):  http://localhost:${PORT}`);
  console.log(`Serving:  ${ROOT}`);
});
