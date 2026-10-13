Hello World

## Configuración: integración con CoreCFDI

CoreCFDI descarga los CFDI del SAT (descarga masiva con la FIEL de la empresa) y los deja
consultables por API. Esta integración no emite ni timbra comprobantes: autentica, carga la FIEL,
pide descargas al SAT y consulta las facturas recibidas.

Variables de entorno del proceso de Node (ejemplo en `.env.example`; el proyecto no carga
archivos `.env`):

| Variable | Descripción |
|---|---|
| `CORECFDI_BASE_URL` | URL base de la API, terminada en `/api/v1`. Debe ser HTTPS, salvo `localhost` o un dominio `.test` en desarrollo. Si no se define, `src/server.js` (archivo local, fuera de git) pone la de desarrollo |
| `CORECFDI_DEVICE_NAME` | Opcional. Nombre con el que este sistema se identifica al iniciar sesión (por defecto `xenon`) |
| `APP_SECRET` | Ya existente: llave con la que se cifran en Mongo los tokens de CoreCFDI |

La empresa (tenant), el email y la contraseña **no** son variables de entorno: las pantallas de
la sección **Core CFDI** del menú los piden antes de mostrar lo demás.
Cada usuario de este sistema inicia su propia sesión de CoreCFDI; se guardan la empresa, el email
y los tokens cifrados, nunca la contraseña. La sesión se renueva sola mientras se use (el refresh
token dura 30 días); cuando ya no se puede renovar, la pantalla vuelve a pedir los datos. La
cuenta de CoreCFDI necesita permiso de escritura para cargar la FIEL y solicitar descargas.

- Código: `src/services/corecfdi/` (servicios), `src/routes/app/facturacion/sat-descargas/` y
  `src/routes/app/facturacion/facturas-recibidas*` (rutas y pantallas).
- **Cuentas por Cobrar** y **Cuentas por Pagar** (`src/services/corecfdi/tesoreria.js`) son solo de
  consulta. Requieren que la empresa tenga contratado el módulo Tesorería en CoreCFDI y que la
  cuenta tenga el permiso `ver tesoreria`.
- Documentación de la API: `Docs/corecfdi/`.
- Pruebas (usan respuestas simuladas; no llaman a CoreCFDI ni al SAT): `npm run test:corecfdi`.
  Requieren Node 20 o superior.
