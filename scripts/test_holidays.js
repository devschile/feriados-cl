const fn = require('../functions/holidays');

async function run() {
  const event = { queryStringParameters: { year: '2026' } };
  const res = await fn.handler(event);
  console.log('statusCode:', res.statusCode);
  try {
    const body = JSON.parse(res.body);
    console.log(JSON.stringify(body, null, 2));
  } catch (e) {
    console.log('body:', res.body);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
