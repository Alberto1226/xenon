# Balanza de ingresos y egresos contra CoreCFDI API v1

Implementa en este sistema la consulta de la balanza anual de ingresos y egresos que CoreCFDI
calcula a partir de los CFDI descargados del SAT. Hazlo como un servicio reutilizable
(ej. `CoreCfdiReportes.balanza(year)`).

Requisito previo: el servicio de autenticación y el cliente HTTP compartido ya implementados
(`CoreCfdiAuth.getAccessToken()`), que envían los headers, renuevan el token y manejan 401/429.

CoreCFDI no lleva contabilidad ni registra cobros o pagos: solo lee los CFDI. Esta integración es
**de consulta** y el resultado es una balanza de lo **facturado**, no de flujo de efectivo ni una
balanza de comprobación contable.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Para qué sirve

- Ver, mes a mes, cuánto facturó la empresa (ingresos) y cuánto le facturaron (egresos) en un año.
- Mostrar los acumulados del año, el balance neto y el margen.
- Mostrar los 5 clientes y los 5 proveedores con mayor importe en el año.

## Cómo calcula CoreCFDI la balanza

Entender esto es necesario para explicar los números en pantalla:

- Solo entran CFDI **vigentes**; los cancelados no cuentan.
- **Ingresos** = CFDI de ingreso (tipo `I`) donde la empresa es **emisor**. Las notas de crédito
  emitidas no se restan.
- **Egresos** = CFDI de tipo `I` y también `E` (notas de crédito) donde la empresa es **receptor**.
  Las notas de crédito recibidas **se suman** al egreso, no se restan.
- Se suma el **importe total** de cada CFDI (el mismo `importe` que muestran las demás consultas).
- El mes y el año salen de la **fecha de emisión** del CFDI, sin importar cuándo se cobró o pagó.
- `balanza` de cada mes = `ingresos` − `egresos`.
- `margen` = `balance_neto` ÷ `ingresos` × 100; es 0 si no hay ingresos.
- Top clientes: por importe de CFDI de ingreso emitidos. Top proveedores: por importe de CFDI de
  ingreso recibidos (aquí no entran las notas de crédito, así que su suma puede no coincidir con
  los egresos).
- **Los importes de monedas distintas se suman sin convertir** y la respuesta no indica la moneda.
- Solo se consideran los CFDI ya descargados en CoreCFDI. Si falta descargar un periodo del SAT,
  ese mes aparece incompleto o en 0.

## Petición

`GET {CORECFDI_BASE_URL}/reportes/balanza?year=2026`

Headers:

- `Accept: application/json` ← obligatorio
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}` ← obligatorio

Parámetros de query:

| Parámetro | Descripción |
|---|---|
| `year` | Opcional. Entero entre 2000 y 2100. Si se omite, el servidor usa el año más reciente que tenga CFDI |

Es el único parámetro. No hay filtro por mes, rango de fechas, moneda ni cliente; no envíes
`month`, `mes`, `fecha_inicio` ni `fecha_fin`. La respuesta siempre trae los 12 meses del año y no
está paginada.

El usuario de la API necesita el permiso `ver reportes`.

## Respuesta 200

```json
{
  "success": true,
  "message": "Balanza de ingresos y egresos 2026 obtenida con éxito",
  "data": {
    "mensualidades": [
      { "numero": 1, "nombre": "Enero",   "ingresos": 120000.00, "egresos": 80000.00, "balanza": 40000.00 },
      { "numero": 2, "nombre": "Febrero", "ingresos": 95000.50,  "egresos": 110000.00, "balanza": -14999.50 },
      { "numero": 3, "nombre": "Marzo",   "ingresos": 0,         "egresos": 0,        "balanza": 0 }
    ],
    "acumulados": {
      "ingresos": 215000.50,
      "egresos": 190000.00,
      "balance_neto": 25000.50,
      "margen": 11.628112
    },
    "topClientes": [
      { "nombre": "CLIENTE EJEMPLO SA DE CV", "rfc": "CEJ010203AB1", "total": 98000.00 }
    ],
    "topProveedores": [
      { "nombre": "PROVEEDOR EJEMPLO SA DE CV", "rfc": "PEJ040506CD2", "total": 64000.00 }
    ],
    "years": [2026, 2025],
    "yearSeleccionado": 2026
  }
}
```

(El ejemplo recorta `mensualidades` a 3 elementos; la respuesta real trae siempre 12.)

### Campos

| Campo | Descripción |
|---|---|
| `mensualidades` | Siempre 12 elementos, de enero a diciembre, en orden. Los meses sin CFDI llegan en 0 |
| `mensualidades[].numero` | Mes del 1 al 12. **Usar este** como clave, no el nombre |
| `mensualidades[].nombre` | Nombre del mes en español (`"Enero"`…) |
| `mensualidades[].ingresos` | Facturado por la empresa en el mes |
| `mensualidades[].egresos` | Facturado a la empresa en el mes |
| `mensualidades[].balanza` | `ingresos` − `egresos`; puede ser negativo |
| `acumulados.ingresos`, `acumulados.egresos` | Suma de los 12 meses |
| `acumulados.balance_neto` | `ingresos` − `egresos` del año; puede ser negativo |
| `acumulados.margen` | Porcentaje (no fracción), **sin redondear** y puede ser negativo. Redondear al mostrar |
| `topClientes`, `topProveedores` | Hasta 5 elementos, de mayor a menor `total`. Arreglo vacío si no hay |
| `top*.nombre` | `"Cliente Indefinido"` / `"Proveedor Indefinido"` si falta |
| `top*.rfc` | `"N/A"` si falta |
| `top*.total` | Importe del año con ese cliente o proveedor |
| `years` | Años que tienen CFDI en CoreCFDI, del más reciente al más antiguo. Si no hay ninguno, trae solo el año actual |
| `yearSeleccionado` | Año al que corresponde la respuesta |

### Casos a tener en cuenta

- **Año sin CFDI**: responde 200 con todo en 0 y los tops vacíos, no un error. `yearSeleccionado`
  es el año pedido aunque no esté en `years`.
- **Empresa sin RFC ni FIEL configurados**: también responde 200 con todo en 0. La respuesta no
  trae datos de la empresa, así que no se puede distinguir de un año sin movimiento.
- Los importes llegan como número y pueden traer más de dos decimales por la suma: redondear a 2
  solo al mostrar.

## Errores

- 401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
- 403: no reintentar; mostrar el `message` del servidor. Causas: el usuario de la API no tiene el
  permiso `ver reportes`, o la empresa está suspendida.
- 404: tenant no encontrado → revisar `CORECFDI_TENANT`, no reintentar.
- 422: `year` no es un entero entre 2000 y 2100. La respuesta trae `message` y `errors.year`, **sin**
  `success`. No reintentar.
- 429: demasiadas peticiones (60/min para toda la integración). Respetar `Retry-After`.
- 5xx o error de red → error claro; reintentar máximo 2 veces con backoff (es una consulta).

## Qué debe hacer la implementación

1. `balanza(year)`: obtener el token, llamar al endpoint enviando `year` solo si se indicó, y
   devolver `{ mensualidades, acumulados, topClientes, topProveedores, years, yearSeleccionado }`.
2. Validar `year` en el cliente (entero entre 2000 y 2100) antes de llamar, para no provocar el 422.
3. Normalizar `"Cliente Indefinido"`, `"Proveedor Indefinido"` y `"N/A"` a vacío/nulo en el modelo.
4. Selector de año alimentado con `years`. En la primera carga llamar **sin** `year` y seleccionar
   `yearSeleccionado`; al cambiar de año, volver a consultar con ese `year`.
5. Cache de la respuesta por 5 minutos por tenant y año, con un botón "Actualizar" que la invalide.
6. Pantalla "Balanza de ingresos y egresos" con:
   - Tarjetas: ingresos del año, egresos del año, balance neto y margen (%, 1 o 2 decimales).
     Resaltar el balance y el margen cuando sean negativos.
   - Gráfica de barras por mes con ingresos y egresos, y la balanza como línea o tercera serie.
   - Tabla de los 12 meses con ingresos, egresos y balanza, y una fila de totales tomada de
     `acumulados` (no recalcularla).
   - Listas "Principales clientes" y "Principales proveedores" con nombre, RFC y total.
   - Estado vacío cuando ingresos y egresos del año son 0: "No hay CFDI descargados para este año".
   - Aviso fijo: "Importes calculados con los CFDI vigentes descargados del SAT, por fecha de
     emisión. No considera cobros ni pagos, y suma monedas distintas sin convertir."
7. Montos: formatear con separador de miles y 2 decimales. No mostrar un código de moneda como si
   fuera dato del servidor; la respuesta no lo trae.
8. No derivar de esta balanza utilidad fiscal, impuestos ni saldos por cobrar o pagar.
9. Timeout de 60 s. Registrar en log endpoint, status y duración, sin tokens.

## Pruebas requeridas

Con respuestas simuladas de la API (las de este prompt):

- Consulta sin `year` → no se envía el parámetro y se selecciona `yearSeleccionado` en el selector.
- Consulta con `year` → se envía y la pantalla muestra los 12 meses, acumulados y tops.
- Cambio de año en el selector → nueva consulta con ese `year`.
- Mes con `balanza` negativa y año con `balance_neto` y `margen` negativos → se muestran resaltados
  sin romper.
- `margen` con muchos decimales → se muestra redondeado.
- Año con todo en 0 y tops vacíos → estado vacío, sin errores ni divisiones entre 0.
- `topClientes` con menos de 5 elementos → se muestran los que haya.
- `nombre = "Cliente Indefinido"` y `rfc = "N/A"` → se muestran como vacío sin romper.
- `year` fuera de rango o no numérico → se rechaza en el cliente y no se llama al servidor.
- 422 del servidor → se muestra el mensaje de `errors.year` y no se reintenta.
- 403 por falta de permiso → se muestra el `message` del servidor y no se reintenta.
- Token expirado → se renueva y la consulta funciona.
- Segunda consulta del mismo año dentro de 5 minutos → sale de cache; "Actualizar" vuelve a llamar
  al servidor.
- No se envían `month`, `mes`, `fecha_inicio` ni `fecha_fin` al servidor.
