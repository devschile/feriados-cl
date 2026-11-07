'use strict';
// Servidor HTTP sin dependencias para Coolify/Docker.
// Sirve la landing estática y expone la misma función que antes corría en Netlify,
// con las mismas rutas: /holidays/:year, /api/holidays/:year y
// /.netlify/functions/holidays?year=YYYY (esta última por compatibilidad).

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handler } = require('./functions/holidays');

const ROOT = __dirname;
const MAX_URL_LENGTH = 2048;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Lista blanca de archivos públicos: nada fuera de esta lista se sirve desde disco.
function buildStaticMap() {
  const map = new Map();
  const add = (urlPath, file) => {
    const abs = path.join(ROOT, file);
    if (fs.existsSync(abs)) map.set(urlPath, abs);
  };
  add('/', 'index.html');
  add('/index.html', 'index.html');
  add('/robots.txt', 'robots.txt');
  add('/sitemap.xml', 'sitemap.xml');
  add('/LICENSE', 'LICENSE');
  for (const dir of ['assets/js', 'data']) {
    const absDir = path.join(ROOT, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const name of fs.readdirSync(absDir)) {
      if (/^[\w.-]+\.(js|json)$/.test(name)) add(`/${dir}/${name}`, `${dir}/${name}`);
    }
  }
  return map;
}

const HOLIDAYS_ROUTE = /^\/(?:api\/)?holidays\/(\d{4})\/?$/;

function send(res, method, status, headers, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(method === 'HEAD' ? undefined : body);
}

function createServer() {
  const statics = buildStaticMap();

  return http.createServer(async (req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    try {
      if ((req.url || '').length > MAX_URL_LENGTH) {
        return send(res, method, 414, { 'Content-Type': 'text/plain; charset=utf-8' }, 'URI demasiado larga');
      }
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;

      if (pathname === '/healthz') {
        return send(res, method, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, 'ok');
      }

      // API
      const m = pathname.match(HOLIDAYS_ROUTE);
      if (m || pathname === '/.netlify/functions/holidays') {
        const query = m ? { year: m[1] } : Object.fromEntries(url.searchParams);
        const r = await handler({ httpMethod: method, path: pathname, queryStringParameters: query });
        return send(res, method, r.statusCode, r.headers, r.body);
      }

      // Estáticos
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        return send(res, method, 405, { Allow: 'GET, HEAD, OPTIONS', 'Content-Type': 'text/plain; charset=utf-8' }, 'Método no permitido');
      }
      if (method === 'OPTIONS') {
        return send(res, method, 204, { Allow: 'GET, HEAD, OPTIONS' }, '');
      }
      const file = statics.get(pathname);
      if (!file) {
        return send(res, method, 404, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify({ error: 'No encontrado' }));
      }
      const body = fs.readFileSync(file);
      const isAsset = pathname.startsWith('/assets/') || pathname.startsWith('/data/');
      return send(res, method, 200, {
        'Content-Type': TYPES[path.extname(file)] || 'text/plain; charset=utf-8',
        'Cache-Control': isAsset ? 'public, max-age=3600' : 'public, max-age=300',
      }, body);
    } catch (err) {
      console.error('server error:', err);
      if (!res.headersSent) {
        return send(res, method, 500, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify({ error: 'Error interno del servidor' }));
      }
      res.end();
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(port, '0.0.0.0', () => console.log(`feriados-cl escuchando en :${port}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

module.exports = { createServer };
