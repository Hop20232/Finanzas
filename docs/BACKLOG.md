# Backlog de la primera entrega

Este backlog describe la primera entrega local. El backlog maestro de producto y colaboracion esta en [PRODUCT_BACKLOG_PWA.md](PRODUCT_BACKLOG_PWA.md).

## P0 — Fundaciones y correcciones críticas

| ID | Historia | Criterio de aceptación |
| --- | --- | --- |
| FIN-001 | Inicializar Vite y TypeScript | `npm run build` genera `dist` sin errores. |
| FIN-002 | Modelar espacios y persistencia local aislada | Cambiar entre dos espacios no arrastra datos; un error de persistencia se informa como error. |
| FIN-003 | Corregir navegación y dashboard | Todas las pantallas son navegables; un dashboard vacío puede volver a mostrar gráficos al guardar datos. |
| FIN-004 | Importar y exportar de forma segura | Un JSON inválido no modifica datos; uno válido se puede exportar e importar. |
| FIN-005 | Congelar cotización aplicada al gasto | Cambiar la cotización actual no modifica importes históricos. |

## P1 — Calidad y operación local

| ID | Historia | Criterio de aceptación |
| --- | --- | --- |
| FIN-006 | Separar cálculos de interfaz | Reglas monetarias y límites se prueban como funciones puras. |
| FIN-007 | Diferenciar mes vacío y copia de mes | Crear un mes vacío no conserva importes; copiar conserva solo datos elegidos. |
| FIN-008 | Base PWA y Netlify | Manifest, service worker para recursos públicos y rutas SPA configuradas sin cachear datos financieros. |
| FIN-009 | Pruebas de aceptación | Más del 90% de los casos en alcance aprobados y 100% de los críticos. |

## P2 — Preparación para Google Sheets

| ID | Historia | Criterio de aceptación |
| --- | --- | --- |
| FIN-010 | Contrato de almacenamiento | La interfaz no depende directamente de `localStorage`; un repositorio Sheets puede añadirse sin reescribir cálculos. |
| FIN-011 | Contrato de autenticación y sincronización | Endpoints y operaciones idempotentes documentados, sin secretos en el repositorio. |

## Casos de uso críticos

1. Crear, guardar y recargar un espacio.
2. Cambiar de espacio sin mezclar datos.
3. Informar un fallo de persistencia sin anunciar éxito.
4. Importar un archivo inválido sin modificar datos.
5. Exportar e importar un archivo válido.
6. Navegar hacia y desde dashboard.
7. Mantener estable una cotización histórica.
