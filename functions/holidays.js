// Netlify Function: devuelve feriados de Chile por año
// Responde a GET /?year=YYYY

function easterSunday(year) {
  // Anonymous Gregorian algorithm (Meeus/Jones)
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function weekdaySpanish(date) {
  const names = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ];
  return names[date.getUTCDay()];
}

function formatHoliday(date, descripcion, tipo, irrenunciable) {
  return {
    mes: date.getUTCMonth() + 1,
    dia: date.getUTCDate(),
    dia_semana: weekdaySpanish(date),
    descripcion,
    tipo,
    irrenunciable: !!irrenunciable,
  };
}

function buildHolidays(year) {
  const holidays = [];

  // Fixed-date holidays
  holidays.push(formatHoliday(new Date(Date.UTC(year, 0, 1)), 'Año Nuevo', 'civil', true));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 4, 1)), 'Día del Trabajo', 'civil', true));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 4, 21)), 'Día de las Glorias Navales', 'civil', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 5, 21)), 'Día Nacional de los Pueblos Indígenas', 'civil', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 5, 29)), 'San Pedro y San Pablo', 'religioso', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 6, 16)), 'Día de la Virgen del Carmen', 'religioso', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 7, 15)), 'Asunción de la Virgen', 'religioso', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 8, 17)), 'Feriado Adicional Fiestas Patrias', 'civil', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 8, 18)), 'Independencia Nacional', 'civil', true));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 8, 19)), 'Día de las Glorias del Ejército', 'civil', true));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 9, 11)), 'Encuentro de Dos Mundos', 'civil', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 9, 31)), 'Día de las Iglesias Evangélicas y Protestantes', 'religioso', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 10, 1)), 'Día de Todos los Santos', 'religioso', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 11, 8)), 'Inmaculada Concepción', 'religioso', false));
  holidays.push(formatHoliday(new Date(Date.UTC(year, 11, 25)), 'Navidad', 'religioso', true));

  // Movable: Easter-related (Good Friday, Holy Saturday)
  const easter = easterSunday(year); // Easter Sunday UTC
  const goodFriday = new Date(easter);
  goodFriday.setUTCDate(easter.getUTCDate() - 2);
  const holySaturday = new Date(easter);
  holySaturday.setUTCDate(easter.getUTCDate() - 1);

  holidays.push(formatHoliday(goodFriday, 'Viernes Santo', 'religioso', false));
  holidays.push(formatHoliday(holySaturday, 'Sábado Santo', 'religioso', false));

  // Order holidays by date
  holidays.sort((a, b) => {
    if (a.mes !== b.mes) return a.mes - b.mes;
    return a.dia - b.dia;
  });

  // Group by month name in Spanish
  const monthNames = {
    1: 'enero',
    2: 'febrero',
    3: 'marzo',
    4: 'abril',
    5: 'mayo',
    6: 'junio',
    7: 'julio',
    8: 'agosto',
    9: 'septiembre',
    10: 'octubre',
    11: 'noviembre',
    12: 'diciembre',
  };

  const grouped = {};
  for (const h of holidays) {
    const name = monthNames[h.mes] || String(h.mes);
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(h);
  }

  return grouped;
}

exports.handler = async function (event) {
  try {
    const params = event.queryStringParameters || {};
    let yearParam = params.year || params.anio || params.año || params.ano;

    // If no query param, try to extract year from the request path (e.g. /holidays/2026)
    if (!yearParam) {
      const p = (event.path || event.rawPath || '');
      const m = p.match(/\/(\d{4})(?:\/|$)/);
      if (m) yearParam = m[1];
    }

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Parámetro `year` inválido. Ej: /?year=2026' }),
      };
    }

    // Restrict API to only support 2026 and 2027
    const allowed = [2026, 2027];
    if (!allowed.includes(year)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Este endpoint solo soporta los años: ${allowed.join(', ')}` }),
      };
    }

    const feriados = buildHolidays(year);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ year, feriados }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
