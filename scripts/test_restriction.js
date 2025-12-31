const fn = require('../functions/holidays');

async function test(year) {
  const event = { queryStringParameters: { year: String(year) } };
  const res = await fn.handler(event);
  console.log('year', year, 'statusCode', res.statusCode);
  try {
    console.log(JSON.parse(res.body));
  } catch (e) {
    console.log(res.body);
  }
}

async function main() {
  await test(2026); // should be 200
  await test(2025); // should be 400
}

main().catch(err => { console.error(err); process.exit(1); });
