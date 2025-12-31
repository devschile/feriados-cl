const fs = require('fs');
const path = require('path');
const fn = require('../functions/holidays');

async function generate(year) {
  const event = { queryStringParameters: { year: String(year) } };
  const res = await fn.handler(event);
  if (res.statusCode !== 200) throw new Error(`handler failed for ${year}: ${res.body}`);
  const body = JSON.parse(res.body);
  const outDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${year}.json`);
  fs.writeFileSync(outPath, JSON.stringify(body, null, 2), 'utf8');
  console.log('Wrote', outPath);
}

async function main() {
  const years = [2026, 2027];
  for (const y of years) {
    await generate(y);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
