// Cálculo de feriados legales de Chile.
//
// Reglas implementadas (todas en UTC para evitar corrimientos por zona horaria):
//  - Fijos: 1 ene, 1 may, 21 may, 16 jul (Ley 20.148), 15 ago, 18 y 19 sep,
//    1 nov, 8 dic, 25 dic.
//  - Móviles por Pascua: Viernes Santo y Sábado Santo.
//  - Ley 19.668 — 29 jun (San Pedro y San Pablo) y 12 oct (Encuentro de Dos Mundos):
//    martes, miércoles o jueves -> lunes anterior; viernes -> lunes siguiente.
//  - Ley 20.299 — 31 oct (Iglesias Evangélicas y Protestantes):
//    martes -> viernes anterior; miércoles -> viernes siguiente.
//  - Ley 20.215 — Fiestas Patrias: si el 18 sep cae martes, el 17 es feriado;
//    si cae miércoles, el 20 es feriado.
//  - Ley 20.983 — si el 1 ene cae domingo, el 2 ene es feriado.
//  - Ley 21.357 — Día Nacional de los Pueblos Indígenas: día del solsticio de
//    invierno (hora de Chile continental). Es un dato astronómico, por eso va en
//    una tabla (SOLSTICE_DAY) y no se calcula.
//
// Irrenunciables (Ley 19.973): 1 ene, 1 may, 18 sep, 19 sep y 25 dic.

// Día de junio del solsticio de invierno, en hora de Chile (UTC-4 en junio).
// Fuente: efemérides astronómicas (instante UTC del solsticio convertido a hora local).
const SOLSTICE_DAY = {
  2026: 21,
  2027: 21,
  2028: 20,
  2029: 20,
  2030: 21,
  2031: 21,
  2032: 20,
  2033: 20,
};

const SUPPORTED_YEARS = Object.keys(SOLSTICE_DAY).map(Number);

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function utc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Domingo de Pascua (algoritmo anónimo gregoriano, Meeus/Jones/Butcher).
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

// Ley 19.668: traslado al lunes (ma/mi/ju -> lunes anterior; vi -> lunes siguiente).
function moveToMonday(date) {
  switch (date.getUTCDay()) {
    case 2: return addDays(date, -1);
    case 3: return addDays(date, -2);
    case 4: return addDays(date, -3);
    case 5: return addDays(date, 3);
    default: return date;
  }
}

// Ley 20.299: martes -> viernes anterior; miércoles -> viernes siguiente.
function moveEvangelical(date) {
  switch (date.getUTCDay()) {
    case 2: return addDays(date, -4);
    case 3: return addDays(date, 2);
    default: return date;
  }
}

function entry(date, descripcion, tipo, irrenunciable) {
  return {
    mes: date.getUTCMonth() + 1,
    dia: date.getUTCDate(),
    dia_semana: WEEKDAYS[date.getUTCDay()],
    descripcion,
    tipo,
    irrenunciable: !!irrenunciable,
  };
}

function isSupportedYear(year) {
  return SUPPORTED_YEARS.includes(year);
}

// Devuelve la lista plana de feriados del año, ordenada por fecha.
function buildHolidayList(year) {
  if (!isSupportedYear(year)) {
    throw new RangeError(`Año no soportado: ${year}`);
  }

  const list = [];
  const add = (date, desc, tipo, irr) => list.push(entry(date, desc, tipo, irr));

  const newYear = utc(year, 1, 1);
  add(newYear, 'Año Nuevo', 'civil', true);
  if (newYear.getUTCDay() === 0) add(utc(year, 1, 2), 'Feriado Adicional Año Nuevo', 'civil', false);

  const easter = easterSunday(year);
  add(addDays(easter, -2), 'Viernes Santo', 'religioso', false);
  add(addDays(easter, -1), 'Sábado Santo', 'religioso', false);

  add(utc(year, 5, 1), 'Día del Trabajo', 'civil', true);
  add(utc(year, 5, 21), 'Día de las Glorias Navales', 'civil', false);
  add(utc(year, 6, SOLSTICE_DAY[year]), 'Día Nacional de los Pueblos Indígenas', 'civil', false);
  add(moveToMonday(utc(year, 6, 29)), 'San Pedro y San Pablo', 'religioso', false);
  add(utc(year, 7, 16), 'Día de la Virgen del Carmen', 'religioso', false);
  add(utc(year, 8, 15), 'Asunción de la Virgen', 'religioso', false);

  const sep18 = utc(year, 9, 18);
  if (sep18.getUTCDay() === 2) add(utc(year, 9, 17), 'Feriado Adicional Fiestas Patrias', 'civil', false);
  add(sep18, 'Independencia Nacional', 'civil', true);
  add(utc(year, 9, 19), 'Día de las Glorias del Ejército', 'civil', true);
  if (sep18.getUTCDay() === 3) add(utc(year, 9, 20), 'Feriado Adicional Fiestas Patrias', 'civil', false);

  add(moveToMonday(utc(year, 10, 12)), 'Encuentro de Dos Mundos', 'civil', false);
  add(moveEvangelical(utc(year, 10, 31)), 'Día de las Iglesias Evangélicas y Protestantes', 'religioso', false);
  add(utc(year, 11, 1), 'Día de Todos los Santos', 'religioso', false);
  add(utc(year, 12, 8), 'Inmaculada Concepción', 'religioso', false);
  add(utc(year, 12, 25), 'Navidad', 'religioso', true);

  list.sort((a, b) => a.mes - b.mes || a.dia - b.dia);
  return list;
}

// Misma lista agrupada por nombre de mes en español (formato de la API).
function buildHolidays(year) {
  const grouped = {};
  for (const h of buildHolidayList(year)) {
    const name = MONTHS[h.mes - 1];
    (grouped[name] = grouped[name] || []).push(h);
  }
  return grouped;
}

module.exports = {
  SUPPORTED_YEARS,
  SOLSTICE_DAY,
  isSupportedYear,
  buildHolidays,
  buildHolidayList,
  // Exportados para pruebas
  easterSunday,
  moveToMonday,
  moveEvangelical,
};
