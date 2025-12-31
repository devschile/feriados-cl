const fn = require('../functions/holidays');

async function run(path) {
  const event = { path, queryStringParameters: null };
  const res = await fn.handler(event);
  console.log('path', path, 'statusCode', res.statusCode);
  try { console.log(JSON.parse(res.body)); } catch (e) { console.log(res.body); }
}

async function main(){
  await run('/holidays/2026');
  await run('/api/holidays/2026');
  await run('/holidays/2025');
}

main().catch(e=>{ console.error(e); process.exit(1); });
