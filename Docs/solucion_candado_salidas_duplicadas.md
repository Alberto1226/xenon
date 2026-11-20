# Solución Definitiva: Candado Atómico de Concurrencia para "Envío"

## 1. Diagnóstico del Problema

En [`pedido_pipeline_service.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/_servicios/pedido_pipeline_service.js), la función `cambiar_status_a_envio` presenta una condición de carrera crítica:

```
[Cliente / Claudia]
   │
   ├─► Clic 1 (0.00s) ──► Lee status ('Empaque') ──► Comienza bucle de 50 productos (25 seg)
   │                                                     │
   └─► Clic 2 (0.83s) ──► Lee status ('Empaque') ──┐     │
                                                    ▼     ▼
                                   ¡Ambos descuentan en paralelo!
                                   ¡Salidas duplicadas generadas!
```

El servidor no bloquea el documento al inicio: lee el carrito con `findById` y **no guarda el estatus `Envío` sino hasta 25-45 segundos después**, cuando ya terminó de descontar todas las partidas en Hostinger.

---

## 2. La Solución: Bloqueo Atómico con `findOneAndUpdate`

En MongoDB (incluso en instancias **Standalone** como Hostinger VPS sin réplicas), **cualquier operación que modifique un único documento es 100% atómica a nivel de motor (WiredTiger lock)**.

Si dos peticiones llegan con 800 ms (o incluso con 1 ms) de diferencia, **solo una** logrará hacer el `findOneAndUpdate`. La segunda rebotará de inmediato sin tocar un solo producto ni descontar inventario.

---

## 3. Código a Implementar en el Backend

### Archivo: [`src/routes/app/pedidos/_servicios/pedido_pipeline_service.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/_servicios/pedido_pipeline_service.js)

Reemplazar la función `cambiar_status_a_envio` (alrededor de la línea 150) por la siguiente implementación protegida:

```javascript
export async function cambiar_status_a_envio(carrito_id, opciones, usuario, req) {
    let candadoAdquirido = false;
    try {
        if (!carrito_id) return { ok: false, mensaje: "Identificador de pedido inválido." };

        // 1. ADQUISICIÓN ATÓMICA DEL CANDADO
        // Solo tendrá éxito si el estatus NO es Envío y procesando_envio NO está activo
        const carrito = await Carrito.findOneAndUpdate(
            {
                _id: carrito_id,
                status: { $nin: ['Envío', 'Envio'] },
                $or: [
                    { procesando_envio: { $ne: true } },
                    { procesando_envio: { $exists: false } }
                ]
            },
            {
                $set: {
                    procesando_envio: true,
                    fecha_inicio_envio: new Date(),
                    usuario_envio: { id: usuario && usuario._id, nombre: usuario && usuario.nombre }
                }
            },
            { new: true }
        );

        // Si findOneAndUpdate devolvió null, otra solicitud ya lo está procesando o ya se envió
        if (!carrito) {
            const actual = await Carrito.findById(carrito_id);
            if (!actual) return { ok: false, mensaje: "El pedido no existe." };
            if (actual.status === 'Envío' || actual.status === 'Envio') {
                return { ok: true, mensaje: "El pedido ya fue enviado previamente." };
            }
            if (actual.procesando_envio === true) {
                return {
                    ok: false,
                    mensaje: "El pedido ya está en proceso de envío desde otro dispositivo o pestaña. Espere a que termine."
                };
            }
            return { ok: false, mensaje: "El pedido no se encuentra en un estado válido para envío." };
        }

        candadoAdquirido = true;

        // 2. DEDUCCIÓN FÍSICA DE INVENTARIO Y SNAPLOGS
        const res_descuento = await InventarioReservaService.descontar_fisico_inventario(carrito, req);
        if (!res_descuento.ok) {
            throw new Error("El descuento o la auditoría quedaron incompletos: " + JSON.stringify(res_descuento.errores));
        }

        // 3. CAMBIO DEFINITIVO DE ESTATUS Y LIBERACIÓN DEL CANDADO
        carrito.status = "Envío";
        carrito.procesando_envio = false;
        carrito.procesando = false;
        await carrito.save();

        try {
            await accesos.logActividad("pedidos/cambiar_status_a_envio", usuario, { exito: true, folio: carrito.folio, id: carrito._id }, req);
        } catch (error) {
            console.error("Error al registrar actividad del envío:", error);
        }

        return { ok: true, mensaje: "Status cambiado a Envío e inventario afectado correctamente" };

    } catch (err) {
        console.error("Error en cambiar_status_a_envio:", err);

        // Si ocurrió un error pero el candado había sido adquirido, liberar el flag para no dejarlo congelado
        if (candadoAdquirido) {
            try {
                await Carrito.updateOne(
                    { _id: carrito_id, status: { $nin: ['Envío', 'Envio'] } },
                    { $set: { procesando_envio: false } }
                );
            } catch (cleanupErr) {
                console.error("Error liberando candado de envio:", cleanupErr);
            }
        }

        return {
            ok: false,
            mensaje: "No se pudo completar el envío. Puede haber productos ya descontados; revise el inventario antes de reintentar. " + err.message
        };
    }
}
```

---

## 4. Código a Reforzar en el Frontend

### Archivo: [`src/routes/app/pedidos/_listas/_Cambio_status.svelte`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/_listas/_Cambio_status.svelte)

Para que el navegador de Claudia (o cualquier otro usuario) bloquee visualmente el botón **en el milisegundo 0**:

```javascript
    async function cambiar_status_a_envio() {
        if (procesando === true) return;
        
        // Bloquear de inmediato toda interacción en el cliente
        procesando = true;
        mensaje_envio = "Procesando envío e inventario…";

        try {
            const respuesta = await postData("/app/pedidos/cambiar_status_a_envio", datos);
            if (respuesta.ok) {
                // Notificar éxito y actualizar lista
            } else {
                alert(respuesta.mensaje || "Error procesando el pedido.");
            }
        } catch (e) {
            alert("Error de red al procesar el envío: " + e.message);
        } finally {
            procesando = false;
        }
    }
```

---

## 5. Garantías de esta Solución

| Riesgo | Comportamiento Anterior | Comportamiento con la Corrección |
| :--- | :--- | :--- |
| **Doble clic en el botón** | Disparaba dos peticiones que entraban a descontar. | La primera petición adquiere el candado; la segunda recibe: *"El pedido ya está en proceso de envío"*. |
| **Dos pestañas abiertas simultáneamente** | Ambas leían `status: 'Empaque'` y descontaban. | La primera cambia `procesando_envio: true` atómicamente; la segunda es rechazada en la base de datos. |
| **Latencia alta en Hostinger VPS** | Hacía más vulnerable el sistema porque el bucle tardaba 40s. | Sin importar si tarda 1 segundo o 2 minutos, el candado atómico permanece activo durante toda la ejecución. |
| **Compatibilidad con Standalone** | Sin réplicas no hay transacciones `session.startTransaction()`. | `findOneAndUpdate` es nativo de documento único en MongoDB y **no requiere réplicas ni clústeres**. |
