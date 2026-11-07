// Genera data/<año>.json para todos los años soportados.
// Uso: npm run generate
const fs = require('fs');
const path = require('path');
const { SUPPORTED_YEARS, buildHolidays } = require('../lib/chile-holidays');

const outDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(outDir, { recursive: true });

for (const year of SUPPORTED_YEARS) {
  const outPath = path.join(outDir, `${year}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ year, feriados: buildHolidays(year) }, null, 2) + '\n', 'utf8');
  console.log('Wrote', outPath);
}
