# finanzas-familiares

Aplicación vanilla JS modular para planificación financiera familiar con almacenamiento local + export/import de `gastos.json` y migración de esquema versionada.

## Estructura

- `index.html`: shell mínimo + carga de `estilos.css` y `app.js` (ES modules).
- `estilos.css`: estilos globales.
- `app.js`: bootstrap, estado global y eventos principales.
- `finanzas-db.js`: capa de datos (`localStorage`, import/export archivo y persistencia).
- `finanzas-helpers.js`: helpers, normalización, migraciones (`db_version`), cálculos y balance tipo Tricount.
- `finanzas-ui.js`: renderizado y eventos de UI (formulario, tablas, dashboards Chart.js).
- `gastos.json`: ejemplo de base de datos portable.

## Modelo de datos (v2)

```json
{
  "db_version": 2,
  "config": { "personas": ["Persona A", "Persona B"], "moneda": "EUR" },
  "gastos": [
    {
      "id": "string",
      "fecha": "YYYY-MM-DD",
      "categoria": "string",
      "descripcion": "string",
      "monto": 0,
      "tipo": "compartido|personal",
      "pagador": "Persona A|Persona B",
      "beneficiarios": ["Persona A", "Persona B"],
      "created_at": "ISO8601"
    }
  ]
}
```

## Migraciones automáticas

La función `migrateDb()` aplica una estrategia extensible por versión:

1. **v0 -> v1**: garantiza `id`, `descripcion`, `categoria`.
2. **v1 -> v2**: normaliza gastos y agrega semántica de reparto:
   - `pagador`
   - `tipo`
   - `beneficiarios`

Si falta información en una base vieja:

- se infiere `pagador` desde `persona` o por defecto primera persona;
- en gastos compartidos se asigna a ambas personas;
- en gastos personales se asigna al dueño (`para` o `pagador`).

Todo esto se persiste de vuelta en `localStorage` y en exportaciones.

## Uso

1. Abrir `index.html` en un navegador moderno.
2. Cargar gastos desde formulario.
3. Exportar con **Exportar gastos.json**.
4. Importar con **Importar gastos.json**.

## Balance estilo Tricount

Para un mes (`YYYY-MM`):

- Se calcula cuánto **pagó** cada persona.
- Se calcula cuánto **consumió** cada persona (split por beneficiarios).
- Neto = `pagado - consumido`.
- Se generan movimientos mínimos de liquidación `deudor -> acreedor`.

## Notas de evolución

- El proyecto queda preparado para futuras versiones (`db_version` incremental).
- Se puede extender a más de dos personas manteniendo el mismo esquema.
