# Finanzas Familiares

Aplicacion web local para planificar ingresos, gastos, metas e inversiones mensuales.

## Probar en Netlify

1. En Netlify, elegi **Add new site** y luego **Import an existing project**.
2. Conecta `Hop20232/Finanzas` desde GitHub.
3. Usa estos valores:
   - Build command: `npm run build`
   - Publish directory: `.`
4. Publica el sitio. La configuracion equivalente queda versionada en `netlify.toml`.

Netlify ejecutara automaticamente `npm run build`, publicara la raiz del repositorio y usara Node 18.

La primera entrega guarda los datos localmente en el navegador y funciona como modo de prueba local. No debe interpretarse como autenticacion real ni como colaboracion entre cuentas: OAuth, Google Sheets, invitaciones verificables y sincronizacion quedan fuera de esta publicacion y documentadas en `docs/PRODUCT_BACKLOG_PWA.md`.

## Desarrollo local

```bash
npm run build
npm test
```

Tambien se puede abrir `index.html` directamente, aunque para probar el service worker hace falta servirlo por HTTPS o desde un servidor local.
