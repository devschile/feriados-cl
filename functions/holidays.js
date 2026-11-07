// Netlify Function: devuelve feriados de Chile por año.
// GET /.netlify/functions/holidays?year=YYYY  (o /holidays/YYYY, /api/holidays/YYYY)

const { SUPPORTED_YEARS, isSupportedYear, buildHolidays } = require('../lib/chile-holidays');

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
};

function json(statusCode, payload, extraHeaders) {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

function supportedRange() {
  return `${SUPPORTED_YEARS[0]}–${SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1]}`;
}

exports.handler = async function (event) {
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();
    if (method === 'OPTIONS') return { statusCode: 204, headers: BASE_HEADERS, body: '' };
    if (method !== 'GET' && method !== 'HEAD') {
      return json(405, { error: 'Método no permitido' }, { Allow: 'GET, HEAD, OPTIONS' });
    }

    const params = event.queryStringParameters || {};
    let yearParam = params.year || params.anio || params.año || params.ano;

    // Sin query param: intenta extraer el año de la ruta (ej. /holidays/2026)
    if (!yearParam) {
      const p = event.path || event.rawPath || '';
      const m = p.match(/\/(\d{4})(?:\/|$)/);
      if (m) yearParam = m[1];
    }

    let year;
    if (yearParam === undefined || yearParam === null || yearParam === '') {
      year = new Date().getUTCFullYear();
    } else if (/^\d{4}$/.test(String(yearParam))) {
      year = Number(yearParam);
    } else {
      return json(400, { error: 'Parámetro `year` inválido. Ej: /holidays/2026' });
    }

    if (!isSupportedYear(year)) {
      return json(400, {
        error: `Este endpoint solo soporta los años ${supportedRange()}`,
        años_soportados: SUPPORTED_YEARS,
      });
    }

    return json(
      200,
      { year, feriados: buildHolidays(year) },
      { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' }
    );
  } catch (err) {
    // No exponer detalles internos al cliente.
    console.error('holidays handler error:', err);
    return json(500, { error: 'Error interno del servidor' });
  }
};
