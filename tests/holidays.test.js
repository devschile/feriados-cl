const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lib = require('../lib/chile-holidays');
const { handler } = require('../functions/holidays');

const iso = (d) => d.toISOString().slice(0, 10);
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

// Lista "mm-dd" de un año a partir de la API plana.
function days(year) {
  return lib.buildHolidayList(year).map((h) => `${String(h.mes).padStart(2, '0')}-${String(h.dia).padStart(2, '0')}`);
}

test('Pascua: fechas conocidas', () => {
  assert.equal(iso(lib.easterSunday(2023)), '2023-04-09');
  assert.equal(iso(lib.easterSunday(2024)), '2024-03-31');
  assert.equal(iso(lib.easterSunday(2025)), '2025-04-20');
  assert.equal(iso(lib.easterSunday(2026)), '2026-04-05');
  assert.equal(iso(lib.easterSunday(2027)), '2027-03-28');
  assert.equal(iso(lib.easterSunday(2028)), '2028-04-16');
});

test('Ley 19.668: traslado al lunes (casos históricos conocidos)', () => {
  assert.equal(iso(lib.moveToMonday(utc(2022, 10, 12))), '2022-10-10'); // miércoles
  assert.equal(iso(lib.moveToMonday(utc(2023, 10, 12))), '2023-10-09'); // jueves
  assert.equal(iso(lib.moveToMonday(utc(2021, 10, 12))), '2021-10-11'); // martes
  assert.equal(iso(lib.moveToMonday(utc(2018, 10, 12))), '2018-10-15'); // viernes
  assert.equal(iso(lib.moveToMonday(utc(2025, 10, 12))), '2025-10-12'); // domingo
  assert.equal(iso(lib.moveToMonday(utc(2024, 10, 12))), '2024-10-12'); // sábado
  assert.equal(iso(lib.moveToMonday(utc(2026, 10, 12))), '2026-10-12'); // lunes
});

test('Ley 20.299: Iglesias Evangélicas', () => {
  assert.equal(iso(lib.moveEvangelical(utc(2023, 10, 31))), '2023-10-27'); // martes
  assert.equal(iso(lib.moveEvangelical(utc(2018, 10, 31))), '2018-11-02'); // miércoles
  assert.equal(iso(lib.moveEvangelical(utc(2025, 10, 31))), '2025-10-31'); // viernes
});

test('2026 completo', () => {
  assert.deepEqual(days(2026), [
    '01-01', '04-03', '04-04', '05-01', '05-21', '06-21', '06-29', '07-16',
    '08-15', '09-18', '09-19', '10-12', '10-31', '11-01', '12-08', '12-25',
  ]);
});

test('2027 completo (29 jun y 12 oct caen martes -> lunes anterior)', () => {
  assert.deepEqual(days(2027), [
    '01-01', '03-26', '03-27', '05-01', '05-21', '06-21', '06-28', '07-16',
    '08-15', '09-18', '09-19', '10-11', '10-31', '11-01', '12-08', '12-25',
  ]);
});

test('Fiestas Patrias: 17 sep (18 martes) en 2029 y 20 sep (18 miércoles) en 2030', () => {
  assert.ok(days(2029).includes('09-17'));
  assert.ok(days(2030).includes('09-20'));
  assert.ok(!days(2029).includes('09-20'));
  assert.ok(!days(2030).includes('09-17'));
  for (const y of [2026, 2027, 2028, 2031, 2032, 2033]) {
    assert.ok(!days(y).includes('09-17') && !days(y).includes('09-20'), `año ${y}`);
  }
});

test('Pueblos Indígenas: día del solsticio por año', () => {
  const june = (y) => lib.buildHolidayList(y).find((h) => h.descripcion.startsWith('Día Nacional de los Pueblos'));
  const expected = { 2026: 21, 2027: 21, 2028: 20, 2029: 20, 2030: 21, 2031: 21, 2032: 20, 2033: 20 };
  for (const [y, d] of Object.entries(expected)) assert.equal(june(Number(y)).dia, d, `año ${y}`);
});

test('Invariantes para todos los años soportados', () => {
  assert.deepEqual(lib.SUPPORTED_YEARS, [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
  for (const y of lib.SUPPORTED_YEARS) {
    const list = lib.buildHolidayList(y);
    const keys = list.map((h) => `${h.mes}-${h.dia}`);
    assert.equal(new Set(keys).size, keys.length, `fechas duplicadas en ${y}`);
    // Mínimo 15 feriados, sin tocar el rango razonable.
    assert.ok(list.length >= 15 && list.length <= 18, `cantidad inesperada en ${y}: ${list.length}`);
    // 29 jun, 12 oct y 31 oct nunca caen en martes-viernes tras el traslado, salvo 31 oct viernes.
    for (const h of list) {
      if (['San Pedro y San Pablo', 'Encuentro de Dos Mundos'].includes(h.descripcion)) {
        assert.ok(['lunes', 'sábado', 'domingo'].includes(h.dia_semana), `${h.descripcion} ${y}: ${h.dia_semana}`);
      }
    }
    // Irrenunciables: exactamente 5.
    assert.equal(list.filter((h) => h.irrenunciable).length, 5, `irrenunciables en ${y}`);
  }
});

test('Año fuera de rango lanza error en la librería', () => {
  assert.throws(() => lib.buildHolidayList(2025), RangeError);
  assert.throws(() => lib.buildHolidayList(2034), RangeError);
});

test('handler: respuestas', async () => {
  let r = await handler({ queryStringParameters: { year: '2028' } });
  assert.equal(r.statusCode, 200);
  assert.equal(JSON.parse(r.body).year, 2028);
  assert.equal(r.headers['Access-Control-Allow-Origin'], '*');

  r = await handler({ path: '/holidays/2033', queryStringParameters: null });
  assert.equal(r.statusCode, 200);

  r = await handler({ path: '/api/holidays/2026' });
  assert.equal(r.statusCode, 200);

  for (const bad of ['2025', '2034']) {
    r = await handler({ queryStringParameters: { year: bad } });
    assert.equal(r.statusCode, 400, bad);
    assert.ok(JSON.parse(r.body).error);
  }

  for (const bad of ['abc', '20 26', '2026abc', '-2026', '2026.5', '<script>']) {
    r = await handler({ queryStringParameters: { year: bad } });
    assert.equal(r.statusCode, 400, bad);
  }

  r = await handler({ httpMethod: 'POST', queryStringParameters: { year: '2026' } });
  assert.equal(r.statusCode, 405);

  r = await handler({ httpMethod: 'OPTIONS' });
  assert.equal(r.statusCode, 204);
});

test('data/*.json está sincronizado con el cálculo (ejecutar `npm run generate` si falla)', () => {
  for (const y of lib.SUPPORTED_YEARS) {
    const file = path.join(__dirname, '..', 'data', `${y}.json`);
    const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(onDisk, { year: y, feriados: lib.buildHolidays(y) }, `data/${y}.json desactualizado`);
  }
});
