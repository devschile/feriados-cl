# Feriados API (Netlify Functions)

API REST que devuelve los feriados de Chile para un año dado. Se despliega como Netlify Function.

**Sitio y API:** https://feriados.devschile.cl — **Años soportados: 2026 a 2033.** Cualquier otro año responde `400`.

## Endpoints

- `https://feriados.devschile.cl/holidays/2026` — ruta limpia (reescrita internamente a la función).
- `https://feriados.devschile.cl/api/holidays/2026` — alternativa común para APIs.
- `https://feriados.devschile.cl/.netlify/functions/holidays?year=2026` — endpoint directo de la función.

Solo se aceptan los métodos `GET`, `HEAD` y `OPTIONS`. CORS abierto (`*`).

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

La lógica vive en `lib/chile-holidays.js` y se comparte entre la función, el generador de JSON y las pruebas.

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
npm install
npm test               # pruebas (node:test)
npm run generate       # regenera data/<año>.json desde lib/chile-holidays.js
npx netlify dev        # servidor local en http://localhost:8888
```

```bash
curl "http://localhost:8888/holidays/2028"
```

`data/*.json` son copias estáticas de la respuesta de cada año. Las pruebas fallan si quedan desactualizadas respecto del cálculo.

### Agregar más años

1. Agregar el día del solsticio del año en `SOLSTICE_DAY` (`lib/chile-holidays.js`).
2. Ejecutar `npm run generate` y `npm test`.
3. Actualizar el rango de años en `index.html` (ver sección SEO).

## SEO

La landing (`index.html`) usa `https://feriados.devschile.cl/` como canonical, `og:url`, `hreflang` y URL de los datos estructurados (JSON-LD: `WebSite`, `WebAPI` y `FAQPage`). `robots.txt` y `sitemap.xml` están en la raíz. Si cambia el dominio, hay que actualizar esos cuatro archivos y el `SITE` de `assets/js/analytics.js`.

Al agregar años, actualiza también el rango en el `title`, la `description`, el JSON-LD y el texto de la landing.

## Dominio

El sitio se publica en Netlify con el dominio `feriados.devschile.cl`. Para usar otro dominio, asígnalo en Site settings → Domain management.

## Licencia

MIT
