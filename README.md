# Feriados API (Netlify Functions)

API REST que devuelve los feriados de Chile para un año dado. Diseñada para desplegar como Netlify Function.

Nota: esta implementación solo soporta los años 2026 y 2027; otras consultas devolverán un error 400.

Endpoints (URLs más amigables)
- `/.netlify/functions/holidays?year=2026` — endpoint directo de la función.
- `/holidays/2026` — ruta limpia (redirige internamente a la función).
- `/api/holidays/2026` — alternativa común para APIs (redirige internamente a la función).

Formato de respuesta

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
    "marzo": [ ... ]
  }
}

Campos por feriado
- `mes`: número de mes (1-12)
- `dia`: día del mes
- `dia_semana`: nombre del día en español
- `descripcion`: texto breve
- `tipo`: `civil` o `religioso`
- `irrenunciable`: boolean

Instalación y pruebas locales

1. Instalar dependencias:

```bash
cd /path/to/feriados-api
npm install
```

2. Ejecutar en modo desarrollo (requiere `netlify-cli`):

```bash
npx netlify dev
```

3. Probar el endpoint:

```bash
# vía función directa
curl "http://localhost:8888/.netlify/functions/holidays?year=2026"

# vía ruta limpia (requiere que Netlify Dev lea netlify.toml)
curl "http://localhost:8888/holidays/2026"
```

- La función calcula los feriados fijos y móviles (Viernes Santo / Sábado Santo) y agrega feriados nacionales comunes (incluido Día Nacional de los Pueblos Indígenas). Está pensada para responder correctamente para 2026 y 2027; puedes solicitar otros años y la función intentará calcularlos.
Notas
- La función calcula los feriados fijos y móviles (Viernes Santo / Sábado Santo) y agrega feriados nacionales comunes (incluido Día Nacional de los Pueblos Indígenas). Está pensada para responder correctamente para 2026 y 2027; puedes solicitar otros años y la función rechazará años distintos.

Dominios personalizados
- En Netlify puedes asignar un dominio propio (por ejemplo `api.tudominio.cl`) desde Site settings → Domain management. Tras añadir el dominio, la URL limpia será `https://api.tudominio.cl/holidays/2026`.
- La función calcula los feriados fijos y móviles (Viernes Santo / Sábado Santo) y agrega feriados nacionales comunes (incluido Día Nacional de los Pueblos Indígenas). Está pensada para responder correctamente para 2026 y 2027; puedes solicitar otros años y la función intentará calcularlos.
