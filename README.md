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

## Autenticacion con Google

La app ya integra Google Identity Services para iniciar sesion con Google y bloquear el acceso hasta que el usuario se autentique.

Antes de publicar, definí en Netlify la variable de entorno `GOOGLE_CLIENT_ID`. El build genera `google-config.js` automáticamente; ese archivo no se versiona. El Client ID debe pertenecer a un OAuth 2.0 Client ID tipo Web y tener autorizados los orígenes del sitio.

En desarrollo local podés ejecutar el build así:

```powershell
$env:GOOGLE_CLIENT_ID = 'tu-client-id.apps.googleusercontent.com'
node scripts/build.cjs
```

El logout limpia la sesión local, desactiva la selección automática y solicita a Google revocar la sesión del usuario. Esto no reemplaza la validación server-side del token: la app actual es estática y todavía no tiene backend.

## Desarrollo local

```bash
npm run build
npm test
```

Tambien se puede abrir `index.html` directamente, aunque para probar el service worker hace falta servirlo por HTTPS o desde un servidor local.
