# Finanzas — brief de la primera entrega

## Producto y objetivo

Finanzas evoluciona hacia una PWA para planificación financiera personal y familiar. Una persona o pareja podrá cargar ingresos, gastos, metas e inversiones mensuales en ARS, conservar un historial confiable y consultar comparativas y dashboards.

La primera entrega estabiliza el uso local. Google Sheets, autenticación real y colaboración quedan fuera hasta configurar credenciales, dominios y una prueba con cuentas reales.

## Usuarios

- Persona que organiza sus finanzas personales.
- Pareja o familia que planifica un presupuesto mensual compartido.

## Problema actual

La aplicación actual permite planificar, pero tiene riesgos de pérdida y mezcla de datos: el guardado puede informar éxito tras un fallo, la importación puede escribir antes de validar, las cotizaciones cambian el historial y hay errores de navegación y renderizado. El acceso local tampoco debe presentarse como autenticación real.

## Resultado de la primera entrega

Una PWA compilable y preparada para Netlify que conserva el flujo actual de planificación mensual y ofrece:

- Espacios locales aislados.
- Guardado explícito y con errores visibles.
- Importación y exportación JSON seguras.
- Historial de cotizaciones estable.
- Cálculos financieros separados de la interfaz.
- Navegación, comparativas y dashboards recuperables.
- Base PWA y configuración de despliegue.
- Pruebas automatizadas de los recorridos críticos.

## Fuera de alcance de esta entrega

- Login o sesión real de Google.
- Creación, lectura o escritura de Google Sheets.
- Compartir datos entre cuentas o dispositivos.
- Backend de Netlify, secretos OAuth y almacenamiento operativo.
- Recomendaciones financieras personalizadas.

## Decisiones

- La fuente de datos de esta entrega será local y versionada.
- Se migrará gradualmente a módulos ES y TypeScript con Vite, preservando el diseño actual.
- El almacenamiento se encapsulará detrás de un contrato para permitir un adaptador futuro de Google Sheets.
- La falta de cotización debe producir un error visible; nunca se convertirá silenciosamente con tasa 1.
- Un 4xx esperado se trata como una respuesta correcta; los fallos inesperados y de persistencia deben informarse y conservar la integridad de los datos.

## Restricciones pendientes

Para la fase Google se necesitan un proyecto de Google Cloud, Client ID, dominios y callback definitivos, APIs de Drive/Sheets/Picker habilitadas, configuración de Netlify y cuentas de prueba. No se subirán secretos al repositorio.

## Criterio de terminado

La entrega estará terminada cuando compile, sus pruebas estén verdes, los espacios locales estén aislados, la importación inválida no altere datos, las cotizaciones históricas no cambien al editar una tasa actual y todos los recorridos críticos estén verificados.
