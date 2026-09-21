# Plan de Implementación: Script de Sobrecarga y Pruebas de Estrés Concurrente de Pedidos

Crearemos un script de sobrecarga de 1,000 pedidos con **creación paralela/concurrente** y **transiciones simultáneas** (lotes de 50 peticiones concurrentes) a estados **Envío** y **Entregados**. Esto nos permitirá forzar condiciones de carrera extremas en la asignación de folios, sincronización de `producto.carritos`, deducción de existencias físicas y registro de auditoría (`Producto_snaplog` y `Log`), junto con una interfaz interactiva en Dev Tools para monitorear el progreso en tiempo real y descargar el reporte `.txt`.

---

## 📋 Arquitectura y Componentes Propuestos

```mermaid
flowchart TD
    A["Dev Tools UI (/app/dev_tools/sobrecarga)"] -->|POST iniciar / GET estado| B["Endpoint Backend (/app/dev_tools/sobrecarga/ejecutar_sobrecarga)"]
    B -->|1. Creación Paralela Concurrente (50 en simultáneo)| C["Pipeline Pedidos Service (Folio atómico concurrente + Reservas)"]
    B -->|2. Transiciones Concurrentes (50 en simultáneo)| D["InventarioReservaService (Deducción + Snaplogs)"]
    B -->|3. Traslado Concurrente a Pedidos| E["Pedido Pipeline (Entregados)"]
    B -->|4. Auditoría post-prueba| F["Detector de Huérfanos & Conteo Snaplogs"]
    B -->|5. Generar reporte| G["Archivo TXT (logs_correccion/prueba_sobrecarga_TIMESTAMP.txt)"]
```

---

## 🚀 Cambios Propuestos

### 1. Componente Backend (`src/routes/app/dev_tools/sobrecarga/ejecutar_sobrecarga.js`) [NEW]
- **`get(req, res)` / `post(req, res)`**:
  - Manejo de acciones: `iniciar`, `estado`, `descargar_reporte`.
- **`ejecutar_prueba_sobrecarga_en_servidor()`**:
  - **Fase 1: Creación Paralela / Concurrente (50 en paralelo)**:
    - Agrupa la creación de los 1,000 pedidos en bloques de 50 lanzados simultáneamente (`Promise.all`).
    - Pone a prueba la generación atómica concurrente de folios en `FolioConfig` y las colisiones de `producto.carritos`.
    - Selecciona clientes y productos activos aleatorios del catálogo (1 a 5 productos por pedido).
  - **Fase 2: Transiciones Paralelas / Concurrentes (50 en paralelo)**:
    - Agrupa los pedidos en bloques de 50 y cambia su status simultáneamente (`Promise.all`) a `Envío` (`cambiar_status_a_envio`) y a `Entregado` (`cambiar_status_a_entregado`).
    - Fuerza la concurrencia en deducción de inventario físico y creación de `Producto_snaplog`.
  - **Fase 3: Auditoría y Verificación de Consistencia**:
    - Ejecuta `detectar_apartados_huerfanos()` para validar si quedaron reservas huérfanas retenidas.
    - Revisa duplicación o salto de folios.
    - Contabiliza `Producto_snaplog` con `accion: "2"` y registros en `Log`.
  - **Fase 4: Generación de Reporte `.txt`**:
    - Guarda en `logs_correccion/prueba_sobrecarga_[TIMESTAMP].txt` el desglose de folios, clientes, productos involucrados, cantidades, existencias antes/después y el resultado de la auditoría.

---

### 2. Componente Frontend (`src/routes/app/dev_tools/sobrecarga/index.svelte`) [NEW]
- **Vista Dev Tools > Prueba de Sobrecarga**:
  - Tarjetas de resumen métrico (Última prueba, Huérfanos tras prueba, Snaplogs generados, Reportes).
  - Botón principal: **"Iniciar Prueba de Sobrecarga (1,000 Pedidos)"**.
  - Modal interactivo con:
    - Barra de progreso porcentual.
    - Estado de fases (Creación Concurrente -> Transiciones Simultáneas -> Auditoría -> Reporte).
    - Consola de logs en tiempo real con scroll automático.
    - Botón para descargar el reporte `.txt` al concluir la prueba.

---

### 3. Navegación Barra Lateral (`src/routes/_layouts/side_panel.svelte`) [MODIFY]
- Agregar el enlace a **Dev Tools > Prueba de Sobrecarga** (`/app/dev_tools/sobrecarga`).

---

## 🔍 Plan de Verificación

### Pruebas Automatizadas e Integración:
1. Ejecutar el script desde la interfaz con la configuración de 1,000 pedidos en ráfagas de 50 paralelas.
2. Monitorear el progreso en el modal interactivo sin bloqueos del servidor.
3. Verificar la creación concurrente y transiciones simultáneas en paralelo.
4. Confirmar que la auditoría post-prueba reporte 0 apartados huérfanos y folios secuenciales sin duplicados.
5. Descargar el reporte `.txt` generado y validar la coherencia del historial de inventario.
