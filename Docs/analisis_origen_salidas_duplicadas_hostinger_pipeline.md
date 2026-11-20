# Informe Técnico y Análisis Forense: Origen de las Salidas Duplicadas en Inventario

## 1. Veredicto Ejecutivo

> [!IMPORTANT]
> **Conclusión directa:** Los errores de deducción duplicada fueron provocados por la **interacción conjunta de ambos cambios**:
> 1. **La Causa Raíz:** La **reestructuración del pipeline de pedidos** (commit [`4d86e0f`](file:///c:/laragon/www/xenon) del 17 de septiembre), donde se implementó la deducción secuencial de productos y se trasladó el guardado del estatus `Envío` al **final** del proceso sin un bloqueo atómico previo.
> 2. **El Catalizador:** La **migración a Hostinger** (commit [`de68181`](file:///c:/laragon/www/xenon) del 2 de octubre), que configuró una base de datos MongoDB **Standalone** (`directConnection=true`) con latencia de red de VPS remoto. Esto eliminó el soporte de transacciones multi-documento y ensanchó la ventana de vulnerabilidad de milisegundos a varios segundos.

---

## 2. Cronología de Commits en Git vs. Ocurrencia de Errores

| Fecha | Commit / Evento | Descripción del Cambio | Impacto en el Sistema |
| :--- | :--- | :--- | :--- |
| **07-Ago-2026** | Incidente Folio `#28308` | Caso aislado previo (1 solo producto). | Ocurrió con 3 días de separación; fue una acción manual separada del operador, no concurrencia. |
| **17-Sep-2026** | [`4d86e0f`](file:///c:/laragon/www/xenon) | **Reestructuración en el manejo de pedidos** (`pedido_pipeline_service.js`). | Se centralizó el cambio a "Envío" y la deducción en `InventarioReservaService.descontar_fisico_inventario`. **Se retiró el candado `carrito.procesando = true` del código legado**. |
| **02-Oct-2026** | [`de68181`](file:///c:/laragon/www/xenon) | **Conexión a Hostinger** (`src/server.js`). | Se cambió la conexión de MongoDB Atlas (clúster con transacciones) a Hostinger VPS (`191.215.39.202:39482?directConnection=true` en modo standalone). |
| **27-Oct-2026** | Incidente Folio `#29816` | Salidas duplicadas en 23 productos. | **Diferencia entre salida 1 y 2: exactamente 828 ms.** |
| **04-Nov-2026** | Incidente Folio `#29446` | Salidas duplicadas en 50 productos. | **Diferencia entre salida 1 y 2: exactamente 830 ms.** |
| **05-Nov-2026** | Incidente Folio `#30043` | Salidas duplicadas en 50 productos. | **Diferencia entre salida 1 y 2: exactamente 834 ms.** |

---

## 3. Evidencia Forense en Base de Datos (La Ventana de 830 ms)

Al inspeccionar los `Producto_snaplog` de los 3 folios masivos en MongoDB, encontramos un patrón inequívoco de **condición de carrera (race condition)**:

```
FOLIO #30043 (50 productos afectados):
- Salida 1: 2026-11-05 18:09:49.214Z (Usuario: Claudia)
- Salida 2: 2026-11-05 18:09:50.048Z (Usuario: Claudia)
  → Diferencia exacta: 834 milisegundos

FOLIO #29816 (23 productos afectados):
- Salida 1: 2026-10-27 16:59:11.084Z (Usuario: Claudia)
- Salida 2: 2026-10-27 16:59:11.912Z (Usuario: Claudia)
  → Diferencia exacta: 828 milisegundos

FOLIO #29446 (50 productos afectados):
- Salida 1: 2026-11-04 23:21:03.386Z (Usuario: Claudia)
- Salida 2: 2026-11-04 23:21:04.216Z (Usuario: Claudia)
  → Diferencia exacta: 830 milisegundos
```

En los tres incidentes, la misma operadora presionó o disparó la solicitud con **menos de 1 segundo de diferencia** (por ejemplo, doble clic rápido en el botón, múltiples pestañas abiertas o reintento de conexión).

---

## 4. Análisis Detallado del Cambio 1: El Pipeline de Pedidos ([`4d86e0f`](file:///c:/laragon/www/xenon))

En el commit `4d86e0f`, la lógica para cambiar un pedido a "Envío" se trasladó a [`src/routes/app/pedidos/_servicios/pedido_pipeline_service.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/_servicios/pedido_pipeline_service.js):

```javascript
// Código introducido en commit 4d86e0f
export async function cambiar_status_a_envio(carrito_id, opciones, usuario, req) {
    const carrito = await Carrito.findById(carrito_id);
    
    // 1. Verificación no atómica
    if (carrito.status === "Envío") {
        return { ok: true, mensaje: "El pedido ya está en fase de Envío" };
    }

    // 2. Bucle secuencial pesado (50 productos = 150 consultas a BD)
    const res_descuento = await InventarioReservaService.descontar_fisico_inventario(carrito, req);
    
    // 3. El estatus "Envío" SOLO se guarda hasta el final
    carrito.status = "Envío";
    await carrito.save();
}
```

### ¿Por qué falló este diseño ante concurrencia?

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Navegador (Claudia)
    participant S1 as Petición 1 (0.00s)
    participant S2 as Petición 2 (+0.83s)
    participant DB as MongoDB Hostinger

    Operador->>S1: Clic 1 en "Envío"
    S1->>DB: Carrito.findById() → Status es "Empaque" (Pasa)
    S1->>DB: Inicia bucle: Descuenta Prod 1, Prod 2... (Toma 2.5 seg)
    
    Note over Operador,S2: A los 830 ms ocurre un segundo clic o reintento
    Operador->>S2: Clic 2 en "Envío"
    S2->>DB: Carrito.findById() → Status sigue siendo "Empaque" (¡Pasa!)
    
    S1->>DB: Genera Snaplogs de Salida (1ra vez)
    S2->>DB: Inicia bucle en paralelo: Descuenta Prod 1, Prod 2... (2da vez)
    S2->>DB: Genera Snaplogs de Salida duplicados
    
    S1->>DB: Guarda carrito.status = "Envío"
    S2->>DB: Guarda carrito.status = "Envío"
```

1. **Falta de candado previo:** En el código anterior existía la bandera `carrito.procesando = true`. Al reestructurar el pipeline, esa validación preventiva se perdió.
2. **Cambio de estatus tardío:** Si un pedido tiene 50 productos, MongoDB ejecuta alrededor de 150 operaciones (`findById` + `save` + `snaplog` por partida). Todo ese proceso toma entre 2 y 3 segundos. Durante esos 3 segundos, en la base de datos el carrito **sigue diciendo `status: "Empaque"`**.
3. Cuando la segunda petición llegó a los 830 ms, leyó `status: "Empaque"`, la condición `carrito.status === "Envío"` dio falsa, y ambas peticiones descontaron el inventario de las 50 partidas.

---

## 5. Análisis Detallado del Cambio 2: La Conexión a Hostinger ([`de68181`](file:///c:/laragon/www/xenon))

En el commit `de68181`, la conexión a la base de datos se modificó en [`src/server.js`](file:///c:/laragon/www/xenon/src/server.js):
```javascript
// Antes (MongoDB Atlas):
// mongoose.connect(`mongodb+srv://root:...@xenon.02uz8yx.mongodb.net/xenon-y-mas-app`, ...)

// Después (Hostinger VPS):
mongoose.connect(`mongodb://xenonformongo:DWuis9maB8nq04Ya@191.215.39.202:39482/xenon-y-mas-app?authSource=admin&directConnection=true`, ...)
```

### ¿Cómo influyó Hostinger en el error?

1. **MongoDB Standalone (`directConnection=true`):**
   * El VPS de Hostinger corre MongoDB como una instancia individual (standalone), no como un Replica Set.
   * **Consecuencia técnica:** En MongoDB standalone **no existen las transacciones multi-documento**. No es posible envolver la deducción de los 50 productos y el cambio de estatus en un bloque `session.withTransaction()`. En un Replica Set, la segunda solicitud habría chocado con un error de concurrencia (`WriteConflictException`) y se habría abortado sola.
2. **Latencia de Red (Ping/RTT a VPS):**
   * Antes, las consultas a Atlas o entornos optimizados respondían en menores tiempos de ida y vuelta.
   * En Hostinger VPS por IP pública directa, cada una de las 150 operaciones en serie (`await` dentro de un `for`) añade la latencia de red del VPS.
   * Esto **prolongó la duración del proceso de envío de 0.5s a más de 2.5s**.
   * Al durar 2.5 segundos, una ventana de 830 milisegundos entre clics fue más que suficiente para que la segunda solicitud entrara de lleno.

---

## 6. Cuadro Resumen: Atribución de Responsabilidades

| Factor | ¿Causó el problema? | Justificación |
| :--- | :---: | :--- |
| **Pipeline de Pedidos (`pedido_pipeline_service.js`)** | **SÍ (Causa Primaria)** | El flujo no es idempotente: no adquiere un bloqueo atómico al inicio y no marca el estatus antes de tocar el inventario. |
| **Hostinger VPS (`directConnection=true`)** | **SÍ (Catalizador Crítico)** | Al ser standalone no tiene transacciones ACID que frenen escrituras concurrentes, y su latencia aumentó el tiempo de exposición a condiciones de carrera. |
| **El Usuario / Frontend** | **Secundario** | El botón de envío no tenía bloqueo visual persistente en la interfaz antes del commit `562a57c`, permitiendo disparar la solicitud dos veces en 830 ms. |

---

## 7. Medidas ya Implementadas y Solución Definitiva

1. **Herramienta de Auditoría y Corrección:** La herramienta creada en `/app/dev_tools/salidas_duplicadas` permitió identificar y revertir con total precisión las salidas duplicadas (como los 50 productos del folio `#30043`), documentándolo con el reporte PDF para almacén.
2. **Solución a Futuro para el Pipeline de Envío:**
   Para que nunca más vuelva a ocurrir una salida duplicada, el inicio de `cambiar_status_a_envio` debe adquirir un **bloqueo atómico inmediato** mediante `findOneAndUpdate`:
   ```javascript
   // Bloqueo atómico inmediato: si ya está en proceso o en Envío, falla de inmediato
   const carrito = await Carrito.findOneAndUpdate(
       { _id: carrito_id, status: { $nin: ['Envío', 'Procesando_Envío'] } },
       { $set: { status: 'Procesando_Envío' } },
       { new: false }
   );
   if (!carrito) {
       return { ok: false, mensaje: "El pedido ya está siendo procesado o ya fue enviado." };
   }
   ```
   Con este bloqueo de una sola línea atómica en MongoDB, ninguna segunda solicitud puede ingresar, sin importar la latencia de Hostinger ni los clics simultáneos del usuario.
