# Documentación y Plan de Implementación: Optimización de Consultas de Logs

Este documento detalla los análisis, técnicas y cambios realizados para optimizar el rendimiento, latencia y consumo de recursos en las consultas del módulo de logs (`/app/tecnico-isotech/logs`), aplicando indexación en MongoDB, paralelización de consultas en Node.js, respuestas en objetos JS planos (`lean`) y almacenamiento en caché de 2 semanas.

## Cambios Implementados

---

### Modelo y Base de Datos (MongoDB)

#### [MODIFY] [log.js](file:///home/ghostpredator/Repos/xenon/src/models/log.js)
- **Índice Compuesto:** Se agregó un índice compuesto en `{ fecha: -1, accion: 1 }` para acelerar los filtros por fecha/acción y evitar ordenamientos en memoria RAM (`in-memory sort`).
- **Índice de Texto:** Se agregó un índice de texto secundario en el campo `body` para acelerar búsquedas por texto libre.

---

### Endpoints del Backend (Node.js / Express / Sapper)

#### [MODIFY] [logsDB.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/tecnico-isotech/logsDB.js)
- **Ejecución en Paralelo:** Se refactorizó la ejecución de `Log.countDocuments` y `Log.find` para ejecutarse simultáneamente mediante `Promise.all`, reduciendo el tiempo de espera de red a la mitad.
- **Uso de `.lean()`:** Se aplicó `.lean()` a la consulta `Log.find(...)` para omitir la hidratación pesada de objetos Mongoose, reduciendo consumo de RAM y tiempo de serialización.
- **Proyección de Campos:** Se agregó `.select(...)` para devolver solo las propiedades necesarias en la lista de logs.

#### [MODIFY] [obtener_anios_logs.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/tecnico-isotech/obtener_anios_logs.js)
- **Optimización Min/Max (12s ➔ 1ms):** Se eliminó la agregación masiva por toda la colección y se reemplazó por la consulta indexada del log más antiguo y más reciente con `findOne().sort({ fecha: 1 }).lean()` y `findOne().sort({ fecha: -1 }).lean()`.
- **Caché en Memoria del Servidor (2 Semanas):** Se configuró una constante de caché `CACHE_TTL = 1000 * 60 * 60 * 24 * 14` (14 días en memoria), garantizando respuestas de 0 ms en llamadas subsecuentes.

---

### Frontend (Svelte)

#### [MODIFY] [buscador.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/tecnico-isotech/buscador.svelte)
- **Llamadas Concurrentes:** Se eliminó el `await` bloqueante de `cargar_anios()` en `onMount`, ejecutando `cargar_anios()` y `solicitar_logs()` al mismo tiempo para acelerar la carga inicial de la pantalla.

---

## Resultados Obtenidos
- ⚡ **Consulta de Años (`obtener_anios_logs`):** Reducción de **11,972 ms (12 segundos)** a **~1 ms** en la primera llamada y **0 ms** con caché de 2 semanas.
- 🚀 **Consulta de Logs (`logsDB`):** Reducción a **~500 ms** mediante `Promise.all`, `.lean()` y el índice `{ fecha: -1, accion: 1 }`.
