const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^[/\\]+/, '');
  const file = path.resolve(root, requested);

  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) {
    response.writeHead(403); response.end('Forbidden'); return;
  }

  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(data);
  });
}).listen(4173, () => console.log('Ultron is running at http://localhost:4173'));
