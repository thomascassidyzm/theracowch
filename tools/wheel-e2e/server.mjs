// Local harness: serves public/ and routes /api/wheel to the real handler.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const handler = (await import(ROOT + '/api/wheel.js')).default;
const { _store } = await import('@upstash/redis');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.svg':'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/__store') {
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify([...(_store.entries())].filter(([k]) => k.startsWith('cowch:wheel:'))));
    return;
  }
  if (u.pathname === '/api/wheel') {
    let body = '';
    req.on('data', c => body += c);
    await new Promise(r => req.on('end', r));
    // HARNESS ONLY: the real origin lock allows cowch.app and our Vercel
    // previews, never localhost. Rewriting it here tests the handler, not the
    // lock — the lock itself is tested by the curl with an evil origin.
    req.headers.origin = 'https://cowch.app';
    req.query = Object.fromEntries(u.searchParams);
    req.body = body || '';
    const r2 = {
      statusCode: 200,
      setHeader: (k,v)=>res.setHeader(k,v),
      status(c){ this.statusCode=c; return this; },
      json(o){ res.statusCode=this.statusCode; res.setHeader('content-type','application/json'); res.end(JSON.stringify(o)); },
      end(){ res.statusCode=this.statusCode; res.end(); }
    };
    await handler(req, r2);
    return;
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const file = path.join(ROOT, 'public', p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end('nf'); return; }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'text/plain');
  res.end(fs.readFileSync(file));
});
server.listen(4599, () => console.log('up on 4599'));
