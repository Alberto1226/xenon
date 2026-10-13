# Integración completa con CoreCFDI API v1 — prompt maestro

Implementa en este sistema la integración con la API de CoreCFDI siguiendo, en el orden indicado,
los 7 prompts que acompañan a este archivo. Cada prompt describe un endpoint (petición, respuestas,
reglas y pruebas); este documento define el orden, lo que se comparte entre ellos y cómo resolver
los puntos donde se cruzan.

CoreCFDI **descarga** CFDI del SAT (descarga masiva con la FIEL de la empresa) y los deja
consultables por API. Esta integración no emite ni timbra comprobantes: solo autentica, carga la
FIEL, pide descargas al SAT y consulta las facturas recibidas.

## Antes de empezar

1. Lee los 7 prompts completos antes de escribir código; varios dependen de piezas de otros.
2. Revisa cómo este sistema hace hoy llamadas HTTP, guarda secretos, usa cache/locks, programa
   tareas y escribe pruebas, y sigue esas mismas convenciones (nombres, carpetas, librerías).
   Los nombres `CoreCfdiAuth`, `CoreCfdiSat` y `CoreCfdiFacturas` son orientativos.
3. Si falta algún valor de configuración (`CORECFDI_BASE_URL`, `CORECFDI_TENANT`, `CORECFDI_EMAIL`,
   `CORECFDI_PASSWORD`, `CORECFDI_DEVICE_NAME`), deja las variables declaradas con un valor de
   ejemplo y avisa al final; no inventes credenciales.

## Orden de implementación

| Fase | Prompt | Entrega | Depende de |
|---|---|---|---|
| 1 | `PROMPT_INTEGRACION_LOGIN_API.md` | `CoreCfdiAuth.login()` y almacenamiento seguro de tokens | — |
| 2 | `PROMPT_INTEGRACION_REFRESH_TOKEN_API.md` | `refresh()`, `getAccessToken()`, lock de refresh y **cliente HTTP compartido** | 1 |
| 3 | `PROMPT_INTEGRACION_SAT_FIEL_API.md` | `CoreCfdiSat.configurarFiel()` | 2 |
| 4 | `PROMPT_INTEGRACION_SAT_SOLICITUDES_API.md` | `listarSolicitudes()`, `listarTodas()`, `existeSolicitud()`, `pendientes()` | 2 |
| 5 | `PROMPT_INTEGRACION_SAT_SOLICITAR_DESCARGA_API.md` | `CoreCfdiSat.solicitarDescarga()` | 3, 4 |
| 6 | `PROMPT_INTEGRACION_SAT_VERIFICAR_DESCARGA_API.md` | `CoreCfdiSat.verificarSolicitud(id)` | 4, 5 |
| 7 | `PROMPT_INTEGRACION_FACTURAS_RECIBIDAS_API.md` | `CoreCfdiFacturas.listarRecibidas()` y su pantalla | 2 |

Por qué este orden:

- **Historial (4) va antes de Solicitar (5)**: solicitar necesita `existeSolicitud()` para no
  duplicar periodos ante el SAT, y verificar necesita el historial para recuperarse de un timeout.
- **FIEL (3) va antes de Solicitar (5)**: sin FIEL el SAT no acepta ninguna solicitud.
- **Facturas recibidas (7) solo depende de la autenticación**. Va al final porque es donde se ve
  el resultado del flujo, pero si la empresa ya tiene CFDI importados puede hacerse justo
  después de la fase 2.

Termina cada fase con sus "Pruebas requeridas" pasando antes de empezar la siguiente. No avances
con pruebas en rojo.

## Lo que se construye una sola vez (fase 2) y usan todas las fases

Los prompts de las fases 3 a 7 repiten las mismas reglas de transporte. Impleméntalas una sola vez
en un cliente HTTP compartido y haz que todos los servicios pasen por él:

- Headers en toda petición: `Accept: application/json`, `X-Tenant: {CORECFDI_TENANT}` y
  `Authorization: Bearer {access_token}` obtenido con `getAccessToken()`.
- **401** → `refresh()` una vez y reintentar la petición original una vez; si vuelve a fallar,
  error de autenticación sin bucle. En peticiones multipart, volver a adjuntar los archivos.
- **403** → no reintentar. Puede ser empresa suspendida o que el usuario de la API no tiene
  permiso para esa acción (cargar FIEL y solicitar descargas requieren permiso de escritura):
  mostrar el `message` que devuelve el servidor.
- **429** → esperar `Retry-After` y reintentar una vez. El límite es de 60 peticiones por minuto
  para toda la integración, no por endpoint.
- **422** → exponer `errors` por campo. Ojo: estas respuestas no traen `success`.
- **5xx / red** → reintentos solo donde el prompt de la fase lo permite (ver tabla).
- Log por petición: endpoint, status y duración. Nunca tokens, contraseñas ni contenido de archivos.
- Timeout y reintentos configurables por llamada:

| Llamada | Timeout | Reintentos en 5xx / red |
|---|---|---|
| Login, refresh | por defecto | máx. 2 con backoff |
| `POST /sat/fiel` | 60 s | máx. 1 |
| `GET /sat/descarga-masiva/solicitudes` | 30 s | máx. 2 con backoff |
| `POST /sat/descarga-masiva/solicitar` | 120 s | máx. 2, con 5–10 s de espera; ninguno si el SAT dice que ya existe la solicitud o se agotaron |
| `POST /sat/descarga-masiva/verificar/{id}` | 300 s | ninguno inmediato; consultar el historial minutos después |
| `GET /facturas/recibidas` | 30 s | máx. 2 con backoff |

## Puntos donde los prompts se cruzan

Cuando dos prompts difieran, aplica esto:

1. **Periodo ya solicitado.** Un periodo y tipo cuenta como ya solicitado si existe una solicitud
   en `pendiente`, `terminada` o `descargada`. Usa siempre `existeSolicitud()` de la fase 4; no
   dupliques esa lógica en la fase 5.
2. **Nombres de tipo.** Al solicitar se envía `emitidas` / `recibidas`; el historial y las
   respuestas devuelven `emitido` / `recibido`. Define el mapeo en un solo lugar.
3. **Fechas del periodo.** `fecha_inicio` y `fecha_fin` llegan como `2026-01-01 00:00:00` al
   solicitar y como `2026-01-01T00:00:00.000000Z` en el historial y al verificar. En ambos casos
   son hora de México: normaliza a un mismo formato tomando fecha y hora tal cual, sin convertir
   zona horaria. `created_at` y `updated_at` sí son UTC. Lo mismo aplica a `fecha` y `hora` de
   las facturas.
4. **Verificación.** CoreCFDI ya verifica las solicitudes pendientes cada 10 minutos. Por defecto
   no programes un sondeo propio contra `verificar/{id}`: refresca el estado leyendo el historial
   (cada 5–10 minutos como mínimo) y deja `verificarSolicitud(id)` para el botón "Verificar ahora".
   Si este sistema necesita un sondeo propio, aplica los límites de la fase 6 (una verificación
   cada 10 minutos por solicitud, alto a las 72 horas).
5. **Estado local.** Las fases 5 y 6 piden guardar `id`, `request_id`, periodo, tipo y `status`.
   Usa un único almacén local de solicitudes, que se actualiza con la respuesta de solicitar, de
   verificar y del historial; CoreCFDI es la fuente de verdad si difieren.
6. **Locks.** Hay dos, ambos compartidos entre procesos si hay más de uno: el de `refresh()` por
   tenant (fase 2) y el de `verificarSolicitud` por `id` (fase 6).
7. **Estados desconocidos.** En solicitudes y en facturas, un `status` no listado se muestra tal
   cual sin romper la pantalla.

## Flujo completo que debe funcionar al terminar

1. `login()` → tokens guardados; las siguientes llamadas usan `getAccessToken()`.
2. El usuario carga la FIEL → se muestran RFC y vigencia.
3. El usuario pide un periodo → se valida, se revisa el historial y se crea la solicitud
   (emitidas y recibidas son dos solicitudes con al menos 2 s entre ellas).
4. La solicitud aparece en el historial como `pendiente` y pasa a `descargada` cuando CoreCFDI
   importa los CFDI (sola, o al pulsar "Verificar ahora").
5. Las facturas recibidas del periodo aparecen en el listado, con totales, pestañas por categoría,
   alerta EFOS y liga de verificación en el SAT.

## Qué entregar

- El código de las 7 fases con sus pruebas pasando. Las pruebas deben usar respuestas simuladas
  de la API (las de cada prompt); no deben llamar al SAT ni necesitar una FIEL real.
- Las variables de entorno documentadas donde este sistema documenta su configuración.
- Un resumen final con: qué se implementó por fase, resultado de las pruebas, qué configuración
  falta por llenar y cualquier punto donde la API respondió distinto a lo que dicen los prompts.

No implementes endpoints de CoreCFDI que no estén en estos 7 prompts.
