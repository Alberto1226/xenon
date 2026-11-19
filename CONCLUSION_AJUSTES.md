# ⚡ Conclusión: Ajustes de Contabilidad - Pedimentos

**Última actualización:** 2026-11-19  
**Solicitante:** Equipo Contable (Contadores de Xenon)  
**Estado:** ✅ IMPLEMENTADO Y VERIFICADO EN PRODUCCIÓN/PRUEBAS  

---

## 🎯 Resumen de la Implementación Final

Se han corregido y satisfecho al 100% las solicitudes contables manteniendo la arquitectura nativa, limpia y eficiente del sistema (sin colecciones intermedias innecesarias):

1. **✅ Exclusión Total del IVA de Importación del Costo Fiscal:**  
   - Conforme a la **Ley del IVA (Arts. 4 y 5)** y la **NIF C-4 (Inventarios)**, el 100% del IVA liquidado en aduana se clasifica como impuesto acreditable/recuperable.
   - El motor de cálculo fiscal (`calcularFiscalesService.js`) excluye el IVA del costo fiscal de adquisición y del valor de los inventarios, manteniéndolo visible con fines de auditoría fiscal.

2. **✅ Integración Completa de Gastos e Incrementables SAT:**  
   - Se prorratean todos los gastos deducibles: Impuestos aduanales (DTA + PRV + IGI), Fletes, Seguros, Honorarios de Agente Aduanal y Gastos Adicionales (maniobras, almacenajes, licencias, etc.).
   - Se contempla el registro de montos negativos en gastos indirectos para soportar devoluciones o reembolsos de anticipos aduanales.

3. **✅ Trazabilidad Fiscal con CFDI / Factura / Proveedor:**  
   - Tanto los gastos indirectos (`gastos_importacion.otros`) como los gastos directos asignados a partidas específicas (`productos[].gastos_adicionales`) cuentan con soporte para:
     - UUID CFDI (Folio Fiscal del SAT)
     - Folio / Número de Factura
     - Nombre / Razón Social del Proveedor
     - RFC del Proveedor
     - Fecha del Gasto y Observaciones

4. **✅ Arquitectura Nativa Consolidada (Sin Modelos Extras):**  
   - Se descartó la creación de modelos aislados de pagos (`pagoimportacions`), centralizando la operación dentro del documento `pedimento`, lo que garantiza integridad transaccional, evita desincronizaciones y simplifica la reportería.

5. **✅ Método de Valuación PEPS y Fórmulas Matemáticas Documentadas:**  
   - Fijado por norma a **PEPS (Primeras Entradas, Primeras Salidas)** de acuerdo al **Art. 41 de la LISR**.
   - Metodologías disponibles en interfaz:
     - **Opción A: Ad-Valorem (SAT):** Proporcional al valor comercial en pesos (Recomendada).
     - **Opción B: Unitario:** Equitativo por cantidad de piezas físicas importadas.
     *(Opciones C y D ocultadas para estandarización contable).*

6. **✅ Uso Directo de Importes en MXN del Pedimento SAT:**  
   - El cálculo fiscal y las tablas de costos toman de forma prioritaria los valores en moneda nacional emitidos oficialmente en el pedimento (`valor_aduana_partida_mxn` / `importe_precio_pagado_mxn`).
   - Se eliminan recálculos y distorsiones por conversión de Tipo de Cambio (`USD × TC`), manteniendo las fórmulas y descripciones alineadas al valor de aduana en pesos.

7. **✅ Experiencia de Usuario y Auditoría Rápida:**  
   - Menú desplegable `Acciones ▾` unificado por pedimento.
   - Modal informativo de *"Cargos y Devoluciones Extra"* para consultar el desglose de indirectos (con CFDI/proveedor) y directos por partida sin ingresar a edición.

---

## 📁 Archivos Clave del Módulo

| Componente | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **Modelo** | `src/models/pedimento.js` | Schema unificado con soporte fiscal, PEPS, gastos SAT y gastos por partida con UUID. |
| **Servicio de Cálculo** | `src/services/calcularFiscalesService.js` | Motor puro de prorrateo fiscal (excluye IVA, 4 metodologías, gastos directos e indirectos). |
| **Servicio de Validación** | `src/services/validacionPedimentoService.js` | Reglas de negocio y consistencia contable del pedimento. |
| **Endpoint Backend** | `src/routes/app/pedimentos/calcular_fiscales.js` | Ejecuta el cálculo fiscal, actualiza costos unitarios y genera bitácora de auditoría. |
| **Endpoint Backend** | `src/routes/app/pedimentos/editar.js` | Guarda ediciones, actualiza inventarios y persiste gastos adicionales. |
| **Frontend Svelte** | `src/routes/app/pedimentos/index.svelte` | Gestión integral de pedimentos, modales de gastos con UUID, menú de partidas, fórmulas y previsualización. |
