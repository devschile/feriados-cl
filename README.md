# Feriados API

API REST que devuelve los feriados de Chile para un año dado. Es un servidor Node sin dependencias que sirve la landing y la API, desplegado con Docker en el Coolify de devsChile.

**Sitio y API:** https://feriados.devschile.cl — **Años soportados: 2026 a 2033.** Cualquier otro año responde `400`.

## Endpoints

- `https://feriados.devschile.cl/holidays/2026` — ruta limpia (reescrita internamente a la función).
- `https://feriados.devschile.cl/api/holidays/2026` — alternativa común para APIs.
- `https://feriados.devschile.cl/.netlify/functions/holidays?year=2026` — ruta heredada de cuando el sitio estaba en Netlify, se mantiene por compatibilidad.

Solo se aceptan los métodos `GET`, `HEAD` y `OPTIONS`. CORS abierto (`*`). `GET /healthz` responde `ok` para el healthcheck.

## Formato de respuesta

```json
{
  "year": 2026,
  "feriados": {
    "enero": [
      {
        "mes": 1,
        "dia": 1,
        "dia_semana": "jueves",
        "descripcion": "Año Nuevo",
        "tipo": "civil",
        "irrenunciable": true
      }
    ],
    "abril": [ ... ]
  }
}
```

Campos por feriado:

- `mes`: número de mes (1-12)
- `dia`: día del mes
- `dia_semana`: nombre del día en español
- `descripcion`: texto breve
- `tipo`: `civil` o `religioso`
- `irrenunciable`: boolean (Ley 19.973: 1 ene, 1 may, 18 sep, 19 sep y 25 dic)

## Cómo se calculan los feriados

La lógica vive en `lib/chile-holidays.js` y se comparte entre la función (`functions/holidays.js`), el generador de JSON y las pruebas.

| Feriado | Regla |
| --- | --- |
| Fijos | 1 ene, 1 may, 21 may, 16 jul, 15 ago, 18 y 19 sep, 1 nov, 8 dic, 25 dic |
| Viernes y Sábado Santo | Calculados desde el Domingo de Pascua |
| San Pedro y San Pablo (29 jun) y Encuentro de Dos Mundos (12 oct) | Ley 19.668: martes, miércoles o jueves → lunes anterior; viernes → lunes siguiente |
| Iglesias Evangélicas y Protestantes (31 oct) | Ley 20.299: martes → viernes anterior; miércoles → viernes siguiente |
| Fiestas Patrias adicionales | Ley 20.215: si el 18 sep es martes, feriado el 17; si es miércoles, feriado el 20 |
| Año Nuevo adicional | Ley 20.983: si el 1 ene es domingo, feriado el 2 ene (no ocurre entre 2026 y 2033) |
| Pueblos Indígenas | Ley 21.357: día del solsticio de invierno en hora de Chile. Es un dato astronómico y está en una tabla (`SOLSTICE_DAY`) |

Los feriados regionales y los que se decreten por ley especial (por ejemplo, jornadas electorales) no están incluidos. Si se promulga una ley nueva, hay que actualizar `lib/chile-holidays.js` y regenerar los datos.

## Desarrollo

```bash
npm test               # pruebas (node:test)
npm run generate       # regenera data/<año>.json desde lib/chile-holidays.js
npm start              # servidor local en http://localhost:3000 (variable PORT para cambiarlo)
```

```bash
curl "http://localhost:3000/holidays/2028"
```

`data/*.json` son copias estáticas de la respuesta de cada año. Las pruebas fallan si quedan desactualizadas respecto del cálculo.

### Agregar más años

1. Agregar el día del solsticio del año en `SOLSTICE_DAY` (`lib/chile-holidays.js`).
2. Ejecutar `npm run generate` y `npm test`.
3. Actualizar el rango de años en `index.html` (ver sección SEO).

## SEO

La landing (`index.html`) usa `https://feriados.devschile.cl/` como canonical, `og:url`, `hreflang` y URL de los datos estructurados (JSON-LD: `WebSite`, `WebAPI` y `FAQPage`). `robots.txt` y `sitemap.xml` están en la raíz. Si cambia el dominio, hay que actualizar esos cuatro archivos y el `SITE` de `assets/js/analytics.js`.

Al agregar años, actualiza también el rango en el `title`, la `description`, el JSON-LD y el texto de la landing.

## Despliegue

El sitio corre en el Coolify de devsChile (`coolify.devschile.cl`) como aplicación con build pack **Dockerfile**:

- Repositorio `devschile/feriados-cl`, rama `main`, puerto `3000`.
- Cada push a `main` despliega automáticamente.
- El healthcheck del contenedor usa `/healthz`.
- No requiere variables de entorno ni secretos. Solo `PORT` (opcional, por defecto `3000`).
- El dominio `feriados.devschile.cl` está en Cloudflare y apunta al servidor de Coolify.
- El servidor solo sirve una lista blanca de archivos (landing, `robots.txt`, `sitemap.xml`, `assets/js/` y `data/`). El resto del repositorio no es accesible por HTTP.

## Licencia

MIT
