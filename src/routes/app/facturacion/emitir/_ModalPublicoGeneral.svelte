<script>
  import { postData, mensajes_app } from "./../../../stores";

  export let visible = false;
  export let filtro_mes = null;
  export let filtro_anio = null;
  export let filtro_status = "Todos";
  export let filtro_preparacion = "Todos";
  export let onExito = () => {};

  const fechaHoy = new Date();
  const anioActual = fechaHoy.getFullYear();
  const mesActual = String(fechaHoy.getMonth() + 1).padStart(2, "0");

  const MESES_OPCIONES = [
    { id: "01", nombre: "01 - Enero" },
    { id: "02", nombre: "02 - Febrero" },
    { id: "03", nombre: "03 - Marzo" },
    { id: "04", nombre: "04 - Abril" },
    { id: "05", nombre: "05 - Mayo" },
    { id: "06", nombre: "06 - Junio" },
    { id: "07", nombre: "07 - Julio" },
    { id: "08", nombre: "08 - Agosto" },
    { id: "09", nombre: "09 - Septiembre" },
    { id: "10", nombre: "10 - Octubre" },
    { id: "11", nombre: "11 - Noviembre" },
    { id: "12", nombre: "12 - Diciembre" }
  ];

  const ANIOS_OPCIONES = [anioActual + 1, anioActual, anioActual - 1, anioActual - 2];

  let pedidos = [];
  let cargando_pedidos = false;
  let busqueda_interna = "";
  let cargado_para_visible = false;

  let seleccionados = new Set();
  const metodo_pago = "PUE"; // Regla SAT: Facturas globales son siempre PUE (contado)
  let forma_pago = "01"; // 01: Efectivo por defecto
  let periodicidad = "04"; // 04: Mensual (regla SAT Factura Global)
  let mes_periodo = mesActual;
  let anio_periodo = anioActual;

  let emitiendo = false;
  let resultado = null;
  let error_mensaje = "";

  $: if (visible && !cargado_para_visible) {
    cargado_para_visible = true;
    cargarPedidosGlobal();
  }
  $: if (!visible) {
    cargado_para_visible = false;
  }

  async function cargarPedidosGlobal() {
    cargando_pedidos = true;
    error_mensaje = "";
    resultado = null;
    busqueda_interna = "";
    seleccionados.clear();
    seleccionados = seleccionados;

    if (filtro_mes && filtro_mes !== "Todos") {
      mes_periodo = String(filtro_mes).padStart(2, "0");
    } else {
      mes_periodo = mesActual;
    }
    if (filtro_anio && filtro_anio !== "Todos") {
      anio_periodo = Number(filtro_anio);
    } else {
      anio_periodo = anioActual;
    }

    try {
      const payload = {
        mes: filtro_mes,
        anio: filtro_anio,
        status: filtro_status,
        preparacion: filtro_preparacion,
        todos: true
      };
      const res = await postData("/app/facturacion/pedidos_pendientes", payload);
      if (!res.ok) throw new Error(res.mensaje || "Error al obtener pedidos pendientes del período.");
      pedidos = res.pedidos || [];
      // Por defecto seleccionar todos los pedidos del período
      pedidos.forEach(p => seleccionados.add(p._id));
      seleccionados = seleccionados;
    } catch (err) {
      console.error(err);
      error_mensaje = err.message || "No se pudieron consultar todos los pedidos del mes.";
      avisar("error", error_mensaje);
    } finally {
      cargando_pedidos = false;
    }
  }

  function avisar(tipo, mensaje) {
    $mensajes_app.push({ tipo, mensaje });
    $mensajes_app = $mensajes_app;
  }

  function cerrar() {
    visible = false;
    resultado = null;
    error_mensaje = "";
  }

  function alternar(id) {
    if (seleccionados.has(id)) seleccionados.delete(id);
    else seleccionados.add(id);
    seleccionados = seleccionados;
  }

  function seleccionarTodosVisibles() {
    pedidosFiltrados.forEach(p => seleccionados.add(p._id));
    seleccionados = seleccionados;
  }

  function deseleccionarTodos() {
    seleccionados.clear();
    seleccionados = seleccionados;
  }

  function alternarTodos() {
    if (todosVisiblesSeleccionados) {
      pedidosFiltrados.forEach(p => seleccionados.delete(p._id));
    } else {
      pedidosFiltrados.forEach(p => seleccionados.add(p._id));
    }
    seleccionados = seleccionados;
  }

  function redondear(v) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  }

  function dinero(v) {
    return Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function fechaLegible(f) {
    if (!f) return "—";
    const d = new Date(f);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-MX");
  }

  $: pedidosFiltrados = busqueda_interna.trim()
    ? pedidos.filter(p => {
        const q = busqueda_interna.trim().toLowerCase();
        return String(p.folio).includes(q) || String(p.cliente && p.cliente.nombre || "").toLowerCase().includes(q);
      })
    : pedidos;

  $: todosVisiblesSeleccionados = pedidosFiltrados.length > 0 && pedidosFiltrados.every(p => seleccionados.has(p._id));

  $: listaSeleccionados = pedidos.filter(p => seleccionados.has(p._id));
  $: totalAcumulado = redondear(listaSeleccionados.reduce((s, p) => s + (Number(p.total_pedido) || 0), 0));
  $: subtotalEstimado = redondear(totalAcumulado / 1.16);
  $: ivaEstimado = redondear(totalAcumulado - subtotalEstimado);

  async function confirmarEmision(confirmarProduccion = false) {
    if (listaSeleccionados.length === 0) {
      error_mensaje = "Selecciona al menos una venta para facturar a Público en General.";
      return avisar("error", error_mensaje);
    }

    emitiendo = true;
    error_mensaje = "";
    try {
      const payload = {
        pedidos_ids: listaSeleccionados.map(p => p._id),
        metodo_pago: "PUE",
        forma_pago,
        periodicidad,
        meses: mes_periodo,
        anio: anio_periodo,
        confirmar_emision: true,
        confirmar_produccion: confirmarProduccion
      };

      const res = await postData("/app/facturacion/emitir_publico_general", payload);

      if (!res.ok && res.requiere_confirmacion_produccion) {
        if (confirm("El ambiente configurado en CUCC es PRODUCCIÓN. ¿Autorizas el timbrado fiscal real ante el SAT?")) {
          return await confirmarEmision(true);
        } else {
          emitiendo = false;
          return;
        }
      }

      if (!res.ok) throw new Error(res.mensaje || "Error al emitir factura a Público en General.");

      avisar("exito", `¡Factura a Público en General timbrada con éxito! Folio: ${res.serie}-${res.folio}`);
      resultado = res;
      seleccionados.clear();
      seleccionados = seleccionados;
      if (typeof onExito === "function") onExito(res);
    } catch (err) {
      console.error(err);
      error_mensaje = err.message || "No se pudo emitir la factura a Público en General.";
      avisar("error", error_mensaje);
    } finally {
      emitiendo = false;
    }
  }
</script>

{#if visible}
  <div class="modal-overlay" on:click|self={cerrar}>
    <div class="modal-contenedor">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-titular">
          <div class="icono-modal">
            <i class="material-icons">groups</i>
          </div>
          <div>
            <h3>Facturar Ventas a Público en General</h3>
            <p>Agrupa y timbra los pedidos del período sin factura individual ante el SAT (RFC XAXX010101000)</p>
          </div>
        </div>
        <button class="btn-cerrar" on:click={cerrar} title="Cerrar">&times;</button>
      </div>

      {#if error_mensaje}
        <div class="banner-error">
          <i class="material-icons">error_outline</i>
          <div class="banner-error-texto">
            <strong>Error al timbrar con el PAC / SAT:</strong>
            <div>{error_mensaje}</div>
          </div>
          <button class="btn-cerrar-banner" on:click={() => error_mensaje = ""} title="Cerrar advertencia">
            <i class="material-icons">close</i>
          </button>
        </div>
      {/if}

      {#if !resultado}
        <div class="modal-cuerpo">
          <!-- Métricas de Selección -->
          <div class="metricas-pg-grid">
            <div class="card-stat">
              <span class="lbl-stat">Ventas Seleccionadas</span>
              <span class="val-stat text-azul">
                {#if cargando_pedidos}
                  <i class="material-icons icono-girando" style="font-size:16px;">refresh</i>
                {:else}
                  {seleccionados.size} de {pedidos.length}
                {/if}
              </span>
            </div>
            <div class="card-stat">
              <span class="lbl-stat">Subtotal Estimado</span>
              <span class="val-stat">{dinero(subtotalEstimado)}</span>
            </div>
            <div class="card-stat">
              <span class="lbl-stat">IVA Trasladado (16%)</span>
              <span class="val-stat text-azul">{dinero(ivaEstimado)}</span>
            </div>
            <div class="card-stat total-stat">
              <span class="lbl-stat">Total a Facturar</span>
              <span class="val-stat text-verde">{dinero(totalAcumulado)}</span>
            </div>
          </div>

          <!-- Información Fiscal Receptor -->
          <div class="tarjeta-fiscal-pg">
            <div class="fiscal-header">
              <i class="material-icons" style="font-size: 16px;">verified_user</i>
              <strong>Datos Fiscales del Receptor (Regla Oficial SAT CFDI 4.0):</strong>
            </div>
            <div class="fiscal-datos">
              <div><strong>RFC:</strong> <span class="code-rfc">XAXX010101000</span></div>
              <div><strong>Nombre:</strong> PUBLICO EN GENERAL</div>
              <div><strong>Régimen:</strong> 616 (Sin obligaciones fiscales)</div>
              <div><strong>Uso CFDI:</strong> S01 (Sin efectos fiscales)</div>
            </div>
          </div>

          <!-- Información Global CFDI 4.0 -->
          <div class="tarjeta-periodo-global">
            <div class="periodo-header">
              <i class="material-icons" style="font-size: 16px;">public</i>
              <strong>Información Global SAT (Nodo CFDI 4.0):</strong>
            </div>
            <div class="grid-periodo-sat">
              <div class="campo-opc">
                <label for="pg_periodicidad">Periodicidad</label>
                <select id="pg_periodicidad" bind:value={periodicidad}>
                  <option value="01">01 - Diario</option>
                  <option value="02">02 - Semanal</option>
                  <option value="03">03 - Quincenal</option>
                  <option value="04">04 - Mensual (Recomendado)</option>
                  <option value="05">05 - Bimestral</option>
                </select>
              </div>
              <div class="campo-opc">
                <label for="pg_mes">Mes del Ejercicio</label>
                <select id="pg_mes" bind:value={mes_periodo}>
                  {#each MESES_OPCIONES as m}
                    <option value={m.id}>{m.nombre}</option>
                  {/each}
                </select>
              </div>
              <div class="campo-opc">
                <label for="pg_anio">Año del Ejercicio</label>
                <select id="pg_anio" bind:value={anio_periodo}>
                  {#each ANIOS_OPCIONES as a}
                    <option value={a}>{a}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>

          <!-- Opciones de Pago (Siempre PUE por Regla SAT) -->
          <div class="opciones-pago-grid">
            <div class="campo-opc">
              <label for="pg_metodo_pago">Método de Pago SAT</label>
              <input
                type="text"
                id="pg_metodo_pago"
                value="PUE - Pago en una sola exhibición"
                readonly
                class="input-readonly font-bold"
                title="Por regla del SAT, las facturas a Público en General son siempre PUE"
              />
            </div>
            <div class="campo-opc">
              <label for="pg_forma_pago">Forma de Pago SAT</label>
              <select id="pg_forma_pago" bind:value={forma_pago}>
                <option value="01">01 - Efectivo</option>
                <option value="02">02 - Cheque nominativo</option>
                <option value="03">03 - Transferencia electrónica de fondos</option>
                <option value="04">04 - Tarjeta de crédito</option>
                <option value="28">28 - Tarjeta de débito</option>
                <option value="99">99 - Por definir</option>
              </select>
            </div>
          </div>

          <!-- Listado de Pedidos a Consolidar -->
          <div class="seccion-tabla-ventas">
            <div class="tabla-ventas-header">
              <div class="subtitulo-ventas">
                <i class="material-icons" style="font-size: 16px;">tune</i>
                <strong>Ventas / Pedidos a Consolidar ({seleccionados.size} de {pedidos.length})</strong>
              </div>
              <div class="acciones-sel">
                <button type="button" class="btn-enlace" on:click={seleccionarTodosVisibles} disabled={cargando_pedidos}>
                  Seleccionar Todos {pedidos.length > 0 ? `(${pedidosFiltrados.length})` : ''}
                </button>
                <span class="sep">•</span>
                <button type="button" class="btn-enlace" on:click={deseleccionarTodos} disabled={cargando_pedidos}>
                  Deseleccionar Todos
                </button>
              </div>
            </div>

            <!-- Buscador interno rápido -->
            <div class="barra-busqueda-modal">
              <i class="material-icons icono-busq">search</i>
              <input
                type="text"
                placeholder="Buscar rápido por folio (#) o cliente entre las ventas del período..."
                bind:value={busqueda_interna}
                disabled={cargando_pedidos}
              />
              {#if busqueda_interna}
                <button class="btn-limpiar-busq" on:click={() => busqueda_interna = ""}>&times;</button>
              {/if}
            </div>

            {#if cargando_pedidos}
              <div class="cargando-box">
                <i class="material-icons icono-girando">refresh</i>
                <span>Cargando todos los pedidos pendientes del período ({filtro_mes ? `Mes ${filtro_mes}` : ''} {filtro_anio || ''})...</span>
              </div>
            {:else if pedidos.length === 0}
              <div class="vacio-box">
                <i class="material-icons">inbox</i>
                <span>No hay pedidos pendientes de facturar en el período seleccionado.</span>
              </div>
            {:else}
              <div class="tabla-scroll-pg">
                <table class="tabla-pg">
                  <thead>
                    <tr>
                      <th class="chk-col">
                        <input
                          type="checkbox"
                          checked={todosVisiblesSeleccionados}
                          on:change={alternarTodos}
                          title="Seleccionar / deseleccionar todos los visibles"
                        />
                      </th>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Cliente Original</th>
                      <th>Estatus</th>
                      <th class="der">Total Pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each pedidosFiltrados as p}
                      <tr class:fila-activa={seleccionados.has(p._id)} on:click={() => alternar(p._id)}>
                        <td class="chk-col" on:click|stopPropagation>
                          <input
                            type="checkbox"
                            checked={seleccionados.has(p._id)}
                            on:change={() => alternar(p._id)}
                          />
                        </td>
                        <td class="font-bold">#{p.folio}</td>
                        <td class="text-xs">{fechaLegible(p.fecha)}</td>
                        <td>{p.cliente && p.cliente.nombre ? p.cliente.nombre : "Sin cliente"}</td>
                        <td>
                          <span class="badge-estatus {String(p.status).toLowerCase()}">
                            {p.status || "Enviado"}
                          </span>
                        </td>
                        <td class="der font-mono font-bold">{dinero(p.total_pedido)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <div class="footer-resumen">
            Total a timbrar: <strong>{dinero(totalAcumulado)}</strong> ({seleccionados.size} ventas seleccionadas)
          </div>
          <div class="footer-botones">
            <button type="button" class="btn-cancelar" on:click={cerrar} disabled={emitiendo}>Cancelar</button>
            <button
              type="button"
              class="btn-timbrar"
              on:click={() => confirmarEmision(false)}
              disabled={emitiendo || cargando_pedidos || seleccionados.size === 0}
            >
              {#if emitiendo}
                <i class="material-icons icono-girando">refresh</i>
                <span>Timbrando CFDI ante el SAT...</span>
              {:else}
                <i class="material-icons">verified</i>
                <span>Timbrar Factura a Público en General ({seleccionados.size})</span>
              {/if}
            </button>
          </div>
        </div>
      {:else}
        <!-- Pantalla de Éxito -->
        <div class="cuerpo-exito">
          <div class="icono-exito">
            <i class="material-icons">check_circle</i>
          </div>
          <h3>¡Factura Global Emitida Exitosamente!</h3>
          <p class="sub-exito">Comprobante timbrado y registrado ante el SAT con éxito (PUE - Contado)</p>
          <div class="tarjeta-resumen-exito">
            <div class="fila-exito">
              <span>Folio Fiscal:</span>
              <strong>{resultado.serie}-{resultado.folio}</strong>
            </div>
            <div class="fila-exito">
              <span>UUID SAT:</span>
              <span class="font-mono text-xs">{resultado.uuid}</span>
            </div>
            <div class="fila-exito">
              <span>Método de Pago:</span>
              <strong>PUE (Pago en una sola exhibición)</strong>
            </div>
            <div class="fila-exito">
              <span>Ventas Consolidadas:</span>
              <strong>{resultado.pedidos_afectados} pedidos</strong>
            </div>
            <div class="fila-exito">
              <span>Total Comprobante:</span>
              <strong class="text-verde">{dinero(resultado.total)}</strong>
            </div>
          </div>
          <div class="flex gap-2 justify-center mt-4">
            <a
              href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(resultado.uuid)}&tipo=xml`}
              target="_blank"
              class="btn-secundario"
            >
              <i class="material-icons">code</i> Descargar XML
            </a>
            <a
              href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(resultado.uuid)}&tipo=pdf`}
              target="_blank"
              class="btn-secundario"
            >
              <i class="material-icons">picture_as_pdf</i> Descargar PDF
            </a>
            <button class="btn-primario" on:click={cerrar}>Finalizar</button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1050;
    padding: 16px;
  }
  .modal-contenedor {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden;
  }

  .modal-header {
    background: #0f172a;
    color: #ffffff;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-titular { display: flex; align-items: center; gap: 12px; }
  .icono-modal {
    width: 44px; height: 44px;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .icono-modal i { font-size: 26px; }
  .modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; }
  .modal-header p { margin: 2px 0 0 0; font-size: 12px; color: #94a3b8; }
  .btn-cerrar {
    background: none; border: none; color: #94a3b8; font-size: 26px; cursor: pointer; line-height: 1;
  }
  .btn-cerrar:hover { color: #ffffff; }

  /* Banner de Error Visible dentro del modal */
  .banner-error {
    margin: 14px 24px 0 24px;
    padding: 12px 16px;
    background: #fef2f2;
    border: 1.5px solid #fecaca;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #991b1b;
    animation: fadeIn 0.2s ease;
  }
  .banner-error i {
    font-size: 22px;
    color: #ef4444;
    flex-shrink: 0;
  }
  .banner-error-texto {
    flex: 1;
    font-size: 13px;
    line-height: 1.4;
  }
  .btn-cerrar-banner {
    background: none;
    border: none;
    color: #991b1b;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  .btn-cerrar-banner:hover {
    opacity: 1;
  }
  .btn-cerrar-banner i {
    font-size: 18px;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-cuerpo {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Métricas */
  .metricas-pg-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .card-stat {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .card-stat.total-stat {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
  .lbl-stat { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em; }
  .val-stat { font-size: 17px; font-weight: 800; color: #0f172a; font-family: monospace; }
  .text-azul { color: #0284c7; }
  .text-verde { color: #16a34a; }

  /* Tarjeta Fiscal */
  .tarjeta-fiscal-pg {
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 12px;
  }
  .fiscal-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; color: #0f766e; }
  .fiscal-datos { display: flex; flex-wrap: wrap; gap: 14px; color: #134e4a; }
  .code-rfc { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; }

  /* Información Global SAT */
  .tarjeta-periodo-global {
    background: #fff7ed;
    border: 1px solid #ffedd5;
    border-radius: 10px;
    padding: 12px 16px;
  }
  .periodo-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: #9a3412;
    font-size: 12px;
  }
  .grid-periodo-sat {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 12px;
  }

  /* Opciones de Pago */
  .opciones-pago-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .campo-opc { display: flex; flex-direction: column; gap: 4px; }
  .campo-opc label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
  .campo-opc select, .campo-opc input {
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 13px;
    background: #ffffff;
    outline: none;
    transition: border-color 0.2s;
  }
  .campo-opc select:focus, .campo-opc input:focus {
    border-color: #f97316;
  }
  .input-readonly { background: #f8fafc !important; color: #1e293b; border-color: #e2e8f0; }

  /* Tabla de Selección */
  .seccion-tabla-ventas { display: flex; flex-direction: column; gap: 8px; }
  .tabla-ventas-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .subtitulo-ventas { font-size: 12px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px; }
  .acciones-sel { font-size: 12px; display: flex; align-items: center; gap: 8px; }
  .btn-enlace { background: none; border: none; color: #0284c7; font-weight: 600; cursor: pointer; padding: 0; font-size: 12px; }
  .btn-enlace:hover { text-decoration: underline; }
  .sep { color: #cbd5e1; }

  /* Barra de búsqueda dentro del modal */
  .barra-busqueda-modal {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 6px 12px;
    gap: 8px;
  }
  .barra-busqueda-modal input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    font-size: 12px;
    color: #1e293b;
  }
  .icono-busq { font-size: 18px; color: #94a3b8; }
  .btn-limpiar-busq {
    background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; line-height: 1; padding: 0;
  }

  .cargando-box, .vacio-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 32px 16px;
    color: #64748b;
    font-size: 13px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
  }

  .tabla-scroll-pg {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }
  .tabla-pg { width: 100%; border-collapse: collapse; font-size: 12px; }
  .tabla-pg th {
    background: #f1f5f9; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #475569; text-align: left; position: sticky; top: 0; z-index: 1;
  }
  .tabla-pg td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .chk-col { width: 36px; text-align: center; }
  .tabla-pg tr { cursor: pointer; transition: background 0.15s; }
  .tabla-pg tr:hover { background: #f8fafc; }
  .fila-activa { background: #f0fdf4 !important; }
  .der { text-align: right; }
  .font-mono { font-family: monospace; }
  .font-bold { font-weight: 700; }
  .text-xs { font-size: 11px; }

  .badge-estatus {
    display: inline-flex; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #f1f5f9; color: #475569;
  }
  .badge-estatus.enviado { background: #e0f2fe; color: #0369a1; }
  .badge-estatus.entregado { background: #dcfce7; color: #15803d; }

  /* Footer */
  .modal-footer {
    border-top: 1px solid #e2e8f0;
    padding: 14px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
  }
  .footer-resumen { font-size: 13px; color: #475569; }
  .footer-botones { display: flex; gap: 10px; }
  .btn-cancelar {
    background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer;
  }
  .btn-timbrar {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    border: none;
    color: #ffffff;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(234, 88, 12, 0.35);
    transition: all 0.2s;
  }
  .btn-timbrar:hover:not(:disabled) {
    background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.45);
  }
  .btn-timbrar:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Pantalla de Éxito */
  .cuerpo-exito {
    text-align: center;
    padding: 36px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .icono-exito {
    width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
  }
  .icono-exito i { font-size: 40px; }
  .cuerpo-exito h3 { margin: 0; font-size: 20px; color: #0f172a; }
  .sub-exito { margin: 6px 0 20px 0; font-size: 13px; color: #64748b; }
  .tarjeta-resumen-exito {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; width: 100%; max-width: 450px; display: flex; flex-direction: column; gap: 8px;
  }
  .fila-exito { display: flex; justify-content: space-between; font-size: 13px; }
  .btn-primario {
    background: #0f172a; color: #ffffff; border: none; border-radius: 8px; padding: 9px 20px; font-weight: 700; font-size: 13px; cursor: pointer;
  }
  .btn-secundario {
    display: inline-flex; align-items: center; gap: 6px; background: #ffffff; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; text-decoration: none;
  }
  .flex { display: flex; }
  .gap-2 { gap: 8px; }
  .justify-center { justify-content: center; }
  .mt-4 { margin-top: 16px; }

  .icono-girando {
    animation: girar 1s linear infinite;
    display: inline-block;
  }
  @keyframes girar {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
