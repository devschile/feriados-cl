const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

function withServer(fn) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', async () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      try { await fn(base); resolve(); } catch (e) { reject(e); } finally { server.close(); }
    });
  });
}

test('server: landing, estáticos y salud', () => withServer(async (base) => {
  let r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.match(await r.text(), /Feriados de Chile en JSON/);

  r = await fetch(`${base}/healthz`);
  assert.equal(r.status, 200);

  for (const p of ['/robots.txt', '/sitemap.xml', '/assets/js/analytics.js', '/data/2028.json', '/LICENSE']) {
    r = await fetch(`${base}${p}`);
    assert.equal(r.status, 200, p);
  }
}));

test('server: rutas de la API', () => withServer(async (base) => {
  for (const p of ['/holidays/2027', '/api/holidays/2027', '/holidays/2027/', '/.netlify/functions/holidays?year=2027']) {
    const r = await fetch(`${base}${p}`);
    assert.equal(r.status, 200, p);
    assert.equal((await r.json()).year, 2027);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
  }
  let r = await fetch(`${base}/holidays/2034`);
  assert.equal(r.status, 400);
  r = await fetch(`${base}/.netlify/functions/holidays?year=abc`);
  assert.equal(r.status, 400);
  r = await fetch(`${base}/holidays/2027`, { method: 'POST' });
  assert.equal(r.status, 405);
  r = await fetch(`${base}/holidays/2027`, { method: 'HEAD' });
  assert.equal(r.status, 200);
}));

test('server: no expone archivos fuera de la lista blanca', () => withServer(async (base) => {
  for (const p of ['/server.js', '/lib/chile-holidays.js', '/functions/holidays.js', '/package.json',
    '/Dockerfile', '/.git/config', '/tests/holidays.test.js', '/assets/../server.js',
    '/%2e%2e/server.js', '/assets/js/../../server.js', '/data/../package.json']) {
    const r = await fetch(`${base}${p}`);
    assert.equal(r.status, 404, p);
  }
  const r = await fetch(`${base}/zzz`);
  assert.equal(r.status, 404);
}));
