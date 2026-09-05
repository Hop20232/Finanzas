# Backlog maestro - Finanzas PWA

Fecha: 2026-09-05

## Objetivo

Convertir Finanzas en una PWA colaborativa en Netlify, con Google Sheets como fuente principal de datos financieros, login real con Google, permisos efectivos por archivo, guardado confirmado y colaboracion online confiable antes de incorporar modo offline.

## Politica de tokens y coordinacion

- Supervisor de producto: un pase de integracion por fase; lee solo fuentes, decisiones y resultados necesarios.
- Product Owner: participa al definir o cambiar alcance, actores, permisos y criterios de aceptacion.
- Arquitectura: participa en decisiones irreversibles: almacenamiento operativo, OAuth, modelo Sheets, sincronizacion y PWA/offline.
- Seguridad: obligatoria en seguridad inmediata, OAuth, permisos, importacion, PWA/offline y publicacion.
- QA: obligatorio en todas las fases; mantiene matriz de casos y gate de aceptacion.
- Ingenieria: implementa solo con tickets claros, ownership de archivos y pruebas esperadas.
- UX/UI: participa en onboarding, seleccion de espacios, estados de sincronizacion, permisos, conflictos y offline.
- SRE/KPIs/admin no-code: participa desde backend y publicacion para variables, monitoreo, runbooks, tablero y acciones operativas.

Reglas:

- No repetir analisis ya aceptado salvo que cambie una decision.
- Priorizar busquedas acotadas y evidencia con ruta cuando afecte una decision.
- Los agentes delegados entregan salidas compactas: P0/P1, criterios, archivos tocados y gaps.
- No declarar produccion hasta aprobar todos los escenarios criticos y al menos 90% de los casos de uso planificados.

## Alcance MVP colaborativo

Incluye:

- Login real con Google y bloqueo efectivo de acceso sin sesion.
- Crear un Google Sheet compatible como espacio financiero.
- Conectar un Sheet existente compatible usando Google Picker.
- Verificar permisos reales de Drive/Sheets: editor, lector y sin acceso.
- Aislar estado por cuenta Google y `spreadsheetId`.
- Persistir cambios por entidad con `operationId`, version base e idempotencia.
- Resolver conflictos con respuesta controlada, sin sobrescribir silenciosamente.
- Migrar JSON de forma validada, explicita y sin escrituras parciales.
- Guardar cotizaciones historicas aplicadas por registro o snapshot mensual.

Fuera del MVP:

- Offline completo.
- Importador generico de planillas arbitrarias.
- Edicion libre concurrente desde Google Sheets como flujo soportado.
- Compartir permisos desde la app si requiere scopes mas amplios o mayor friccion OAuth.
- Asesoramiento financiero personalizado o cartera real de inversiones.

## Fase 0 - Seguridad inmediata

### P0-SEC-001 Verificar y rotar posible secreto OAuth

Revisar si la credencial expuesta en el historial fue un secreto real. Si lo fue, rotarla en Google Cloud y tratar el historial como comprometido.

Criterios:

- Se identifica si la credencial era secreta, client id publico o valor invalido.
- Todo secreto real queda rotado.
- No quedan secretos privados en frontend ni archivos versionados.
- Un chequeo de secretos falla si detecta `GOOGLE_CLIENT_SECRET`, refresh tokens, claves de cifrado o tokens privados en frontend/build.

### P0-SEC-002 Definir configuracion de entornos

Fijar dominios y callbacks OAuth para desarrollo, staging y produccion.

Criterios:

- Produccion tiene dominio estable y callback exacto.
- Deploy previews no reciben credenciales productivas por defecto.
- Variables privadas no usan prefijo `VITE_`.

### P0-SEC-003 Modelo minimo de amenazas

Documentar activos, flujos y controles para datos financieros, identidad Google, tokens, sesiones, `spreadsheetId`, importacion JSON, service worker y offline futuro.

Criterios:

- Activos y flujos criticos quedan listados.
- Cada riesgo P0/P1 tiene mitigacion y prueba negativa.
- Produccion queda bloqueada mientras exista un P0/P1 abierto.

## Fase 1 - Estabilizacion local

### P1-APP-001 Restaurar bloqueo real de acceso

Criterios:

- Sin sesion no se ven datos financieros ni espacios.
- Logout limpia memoria sensible y descarta solicitudes pendientes.
- Cambiar de cuenta invalida contexto anterior.

### P1-APP-002 Corregir navegacion de dashboard

Criterios:

- Todas las tabs se pueden abrir sin excepciones.
- Dashboard vacio y con datos renderiza correctamente.

### P1-APP-003 Importacion JSON validada antes de escribir

Criterios:

- JSON invalido no cambia estado ni almacenamiento.
- JSON malicioso no inyecta HTML, atributos ni handlers.
- Importacion valida muestra resumen previo y destino explicito.

### P1-APP-004 Aislamiento fuerte entre espacios

Criterios:

- Un espacio nuevo no conserva meses ni categorias de otro.
- Exportar e importar operan solo sobre el espacio activo confirmado.
- Respuestas tardias de un espacio anterior se descartan.

### P1-APP-005 Guardado con confirmacion real

Criterios:

- Fallos de almacenamiento no muestran exito.
- El formulario se captura antes de guardar o exportar.
- La UI distingue guardado local de remoto.

### P1-APP-006 Cotizaciones historicas inmutables

Criterios:

- Cambiar la cotizacion actual no altera meses guardados.
- Si falta tasa, la UI exige completarla o marca el dato como estimado.

## Fase 2 - Base tecnica

### P1-TECH-001 Crear base Vite y TypeScript

Criterios:

- `npm run build` genera `dist`.
- No depende de Chart.js desde CDN.
- La UI principal conserva sus flujos actuales.

### P1-TECH-002 Separar dominio financiero del DOM

Criterios:

- Calculos principales tienen tests unitarios.
- Persistencia y UI consumen el mismo modelo validado.
- No hay calculos criticos leyendo directamente del DOM.

### P1-TECH-003 Validadores de esquema

Criterios:

- Inputs externos se validan antes de uso.
- Errores son trazables y mostrables al usuario.
- Casos maliciosos quedan cubiertos en pruebas.

## Fase 3 - Backend OAuth y sesiones

### P1-AUTH-001 Netlify Functions de autenticacion

Criterios:

- OAuth usa flujo server-side.
- Se valida `state`/CSRF.
- ID token se valida por audiencia, emisor, expiracion y `sub`.
- Sesion usa cookie HttpOnly, Secure y SameSite apropiado.
- Logout invalida sesion del servidor.
- Callback con `state`, `aud`, `iss` o `exp` invalido devuelve 400/401 y no crea sesion.
- La cookie no es legible por JavaScript.

### P1-AUTH-002 Tokens cifrados y store operativo

Criterios:

- Los refresh tokens se guardan cifrados.
- La clave de cifrado esta separada por entorno y admite rotacion planificada.
- El store soporta primitivas atomicas necesarias.
- Tokens, sesiones y secretos nunca se guardan en Sheets ni en IndexedDB.

## Fase 4 - Workspaces Google Sheets

### P1-SHEETS-001 Crear espacio compatible

Criterios:

- El archivo queda en Drive del usuario.
- Se inicializan pestanas y encabezados esperados.
- Se registra `schemaVersion` y `workspaceId`.

### P1-SHEETS-002 Conectar Sheet existente

Criterios:

- Sheet compatible se conecta sin escribir datos destructivos.
- Sheet vacio ofrece inicializacion.
- Sheet incompatible devuelve error recuperable.
- Usuario sin permiso recibe 403 controlado.
- Una URL o invitacion solo identifica el archivo; no concede acceso.
- Cada llamada vuelve a validar permiso efectivo, no solo el estado de UI.

### P1-SHEETS-003 Modo lectura

Criterios:

- Acciones mutables quedan deshabilitadas.
- La UI muestra permiso efectivo.
- No se intenta escribir desde modo lectura.

## Fase 5 - Colaboracion online

### P1-SYNC-001 API de operaciones por entidad

Criterios:

- Reintentar una operacion ya aplicada no duplica datos.
- Version divergente devuelve 409.
- 5xx tras escritura se recupera consultando `operationId`.

### P1-SYNC-002 Control de conflictos

Criterios:

- Dos usuarios editando la misma entidad no se pisan silenciosamente.
- Conflictos se registran como evento tecnico sin datos sensibles.
- La UI explica la accion recuperable.

### P1-SYNC-003 Manejo de cuotas y errores

Criterios:

- 400 informa payload invalido sin mutar datos.
- 401 pide reconexion.
- 403 muestra permiso insuficiente.
- 404 distingue archivo no encontrado o no autorizado sin filtrar datos.
- 413 bloquea importaciones excesivas.
- 422 no escribe ni migra parcialmente.
- 429 usa backoff.

## Fase 6 - Migracion

### P1-MIG-001 Importador JSON versionado

Criterios:

- La importacion repetida no duplica.
- Tasas historicas no disponibles se marcan como estimadas.
- El usuario elige destino antes de escribir.

## Fase 7 - PWA instalable

### P2-PWA-001 Manifest e iconos

Criterios:

- La app es instalable en navegadores objetivo.
- Rutas funcionan en dominio raiz de Netlify.

### P2-PWA-002 Service worker seguro

Criterios:

- `/api/*` y datos privados usan `Cache-Control: no-store`.
- Actualizacion de service worker no deja app rota.
- Rutas profundas resuelven correctamente.

## Fase 8 - Offline optativo

### P2-OFF-001 IndexedDB por cuenta y espacio

Criterios:

- Revocar permisos detiene subidas pendientes.
- Logout puede borrar datos locales segun politica.
- Conflictos bloquean sincronizacion hasta resolver.

## Matriz QA inicial

| Area | Escenarios criticos |
| --- | --- |
| Auth | login, cancelacion, token vencido, logout, cambio de cuenta |
| Permisos | editor, lector, sin acceso, permiso revocado |
| Espacios | crear, conectar, cambiar, evitar contaminacion, descartar respuestas tardias |
| Persistencia | crear, editar, borrar, reintentar, respuesta perdida, fallo de storage |
| Conflictos | dos usuarios editan misma entidad, version divergente, re-aplicar |
| Importacion | valido, invalido, malicioso, repetido, destino incorrecto |
| Cotizaciones | tasa faltante, tasa estimada, cambio posterior no altera historico |
| Seguridad UI | XSS en nombres, categorias, conceptos e IDs |
| Errores API | 400, 401, 403, 404, 409, 422, 429, 5xx |
| PWA | instalacion, update, rutas profundas, cache seguro |
| Offline | cola local, reconexion, permiso revocado, conflicto pendiente |

Gate:

- Todos los escenarios criticos deben aprobar.
- Al menos 90% de casos de uso planificados deben estar verdes.
- Ningun P0/P1 de seguridad abierto antes de publicar.
- Un caso de uso cuenta como cubierto solo si todos sus escenarios obligatorios fueron ejecutados y aprobados.

Casos MVP para medir cobertura:

1. Login Google real.
2. Logout y limpieza de sesion.
3. Crear Sheet por espacio.
4. Conectar Sheet existente por Picker.
5. Validar permisos Drive: editor, lector y sin acceso.
6. Aislar cuenta, espacio, cache, borradores y UI.
7. Guardar cambios financieros con confirmacion remota.
8. Coordinar concurrencia y conflictos.
9. Reintentar operaciones idempotentes.
10. Migrar JSON legado de forma segura.

## KPIs operativos

- Activacion: usuarios que completan login y crean/conectan primer espacio.
- Colaboracion: espacios con mas de una cuenta con acceso efectivo.
- Confiabilidad: porcentaje de guardados confirmados vs pendientes/fallidos.
- Calidad de sincronizacion: tasa de conflictos 409 y operaciones idempotentes repetidas.
- Salud OAuth/Google: errores 401/403/429 por dia.
- Performance: p95 de `/api/session`, `/api/workspaces` y `/api/operations`.
- Migracion: importaciones iniciadas, completadas, fallidas y repetidas evitadas.

No registrar importes, conceptos financieros ni nombres de categorias en analitica salvo aprobacion explicita.

## Decisiones pendientes

1. Confirmar si el posible secreto OAuth fue real y rotarlo si aplica.
2. Elegir almacenamiento operativo: Postgres serverless, Redis/Upstash, Netlify-compatible DB o Blobs solo si sus garantias alcanzan.
3. Confirmar si compartir permisos desde la app queda fuera del MVP.
4. Definir dominio productivo y staging.
5. Confirmar si modo lectura entra en MVP o V1.
6. Confirmar si la app sera privada/familiar o publica.
7. Confirmar que edicion directa en Sheets no es flujo soportado en MVP.
