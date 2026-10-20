<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { postData, mensajes_app } from "../../../stores";

  export let cuentas_empresa = [];
  const dispatch = createEventDispatcher();

  let cargando = false;
  let guardando = false;
  let buscar = "";
  let solo_con_saldo = true;
  let clientes = [];
  let metricas = { total_saldo: 0, total_clientes: 0 };

  // Modal registrar depósito
  let modal_deposito_visible = false;
  let cliente_deposito = null;
  let texto_buscar_cliente = "";
  let lista_busqueda_clientes = [];
  let buscando_clientes = false;
  let temporizador_busqueda;
  let deposito_monto = "";
  let deposito_fecha = formatearFechaInput(new Date());
  let deposito_forma_pago = "03";
  let deposito_cuenta_destino = "";
  let deposito_referencia = "";
  let deposito_nota = "";

  // Modal historial / Kárdex
  let modal_historial_visible = false;
  let cliente_historial = null;
  let historial_movimientos = [];
  let cargando_historial = false;

  const FORMAS_PAGO_COMUNES = [
    { clave: "03", texto: "03 - Transferencia electrónica de fondos" },
    { clave: "01", texto: "01 - Efectivo" },
    { clave: "02", texto: "02 - Cheque nominativo" },
    { clave: "04", texto: "04 - Tarjeta de crédito" },
    { clave: "28", texto: "28 - Tarjeta de débito" }
  ];

  function avisar(tipo, mensaje) {
    mensajes_app.set({ visible: true, mensaje: mensaje, tipo: tipo });
  }

  function dinero(val) {
    const n = Number(val) || 0;
    return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatearFechaInput(d) {
    if (!d) d = new Date();
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    const horas = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return anio + "-" + mes + "-" + dia + "T" + horas + ":" + mins;
  }

  function formatearFechaHora(fechaStr) {
    if (!fechaStr) return "-";
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  export async function cargar_clientes() {
    cargando = true;
    try {
      const res = await postData("/app/facturacion/saldos/listar", {
        buscar: buscar,
        solo_con_saldo: solo_con_saldo
      });
      if (res && res.ok) {
        clientes = res.clientes || [];
        metricas = res.metricas || { total_saldo: 0, total_clientes: 0 };
      } else {
        avisar("error", (res && res.mensaje) || "No se pudieron consultar los saldos a favor.");
      }
    } catch (e) {
      console.error(e);
      avisar("error", "Error de comunicación al consultar saldos.");
    } finally {
      cargando = false;
    }
  }

  async function consultar_clientes_para_modal(q) {
    buscando_clientes = true;
    try {
      const res = await postData("/app/facturacion/saldos/buscar_clientes", { buscar: q });
      if (res && res.ok) {
        lista_busqueda_clientes = res.clientes || [];
      } else {
        lista_busqueda_clientes = [];
      }
    } catch (e) {
      console.error(e);
      lista_busqueda_clientes = [];
    } finally {
      buscando_clientes = false;
    }
  }

  function al_tipear_buscar_cliente() {
    clearTimeout(temporizador_busqueda);
    temporizador_busqueda = setTimeout(function() {
      consultar_clientes_para_modal(texto_buscar_cliente);
    }, 300);
  }

  function abrir_modal_deposito(c) {
    cliente_deposito = c || null;
    texto_buscar_cliente = "";
    lista_busqueda_clientes = [];
    deposito_monto = "";
    deposito_fecha = formatearFechaInput(new Date());
    deposito_forma_pago = "03";
    deposito_cuenta_destino = (cuentas_empresa && cuentas_empresa.length > 0) ? cuentas_empresa[0]._id : "";
    deposito_referencia = "";
    deposito_nota = "";
    modal_deposito_visible = true;

    if (!cliente_deposito) {
      consultar_clientes_para_modal("");
    }
  }

  function cerrar_modal_deposito() {
    modal_deposito_visible = false;
    cliente_deposito = null;
    texto_buscar_cliente = "";
    lista_busqueda_clientes = [];
  }

  async function guardar_deposito() {
    if (!cliente_deposito || !cliente_deposito._id) {
      return avisar("error", "Selecciona un cliente para abonar.");
    }
    const montoNum = Math.round(((Number(deposito_monto) || 0) + Number.EPSILON) * 100) / 100;
    if (!(montoNum > 0)) {
      return avisar("error", "El monto abonado debe ser mayor a cero.");
    }

    guardando = true;
    try {
      const res = await postData("/app/facturacion/saldos/registrar_deposito", {
        cliente_id: cliente_deposito._id,
        monto: montoNum,
        fecha: deposito_fecha,
        forma_pago: deposito_forma_pago,
        cuenta_destino_id: deposito_cuenta_destino,
        referencia: deposito_referencia,
        nota: deposito_nota
      });

      if (res && res.ok) {
        avisar("exito", res.mensaje || "Abono registrado exitosamente.");
        cerrar_modal_deposito();
        await cargar_clientes();
      } else {
        avisar("error", (res && res.mensaje) || "No se pudo registrar el abono.");
      }
    } catch (e) {
      console.error(e);
      avisar("error", "Error al procesar el abono.");
    } finally {
      guardando = false;
    }
  }

  async function ver_historial(c) {
    cliente_historial = c;
    modal_historial_visible = true;
    cargando_historial = true;
    historial_movimientos = [];
    try {
      const res = await postData("/app/facturacion/saldos/historial", {
        cliente_id: c._id
      });
      if (res && res.ok) {
        if (res.cliente) {
          cliente_historial = res.cliente;
        }
        historial_movimientos = res.movimientos || [];
      } else {
        avisar("error", (res && res.mensaje) || "No se pudo consultar el historial del cliente.");
      }
    } catch (e) {
      console.error(e);
      avisar("error", "Error al cargar historial.");
    } finally {
      cargando_historial = false;
    }
  }

  function cerrar_historial() {
    modal_historial_visible = false;
    cliente_historial = null;
    historial_movimientos = [];
  }

  function ir_a_abonar_facturas(c) {
    dispatch("usar_saldo_para_cobro", { cliente: c });
  }

  onMount(() => {
    cargar_clientes();
  });
</script>

<div class="contenedor-saldos">
  <!-- Cabecera y Métricas -->
  <div class="header-saldos">
    <div>
      <h2 class="titulo-seccion">Abonos a Capital y Saldos a Favor</h2>
      <p class="subtitulo-seccion">
        Administración de depósitos anticipados de clientes, balances disponibles e historial de aplicaciones a facturas.
      </p>
    </div>
    <div class="acciones-header">
      <button class="btn btn-primario" on:click={() => abrir_modal_deposito(null)}>
        <i class="material-icons">add_circle</i>
        <span>Registrar Nuevo Abono</span>
      </button>
    </div>
  </div>

  <!-- Tarjetas KPI -->
  <div class="grid-kpis">
    <div class="tarjeta-kpi">
      <div class="kpi-icono kpi-azul">
        <i class="material-icons">account_balance_wallet</i>
      </div>
      <div class="kpi-info">
        <span class="kpi-etiqueta">Saldo Total Acumulado</span>
        <span class="kpi-valor">{dinero(metricas.total_saldo)}</span>
        <span class="kpi-sub">Fondo disponible para liquidar facturas</span>
      </div>
    </div>

    <div class="tarjeta-kpi">
      <div class="kpi-icono kpi-verde">
        <i class="material-icons">people_alt</i>
      </div>
      <div class="kpi-info">
        <span class="kpi-etiqueta">Clientes con Saldo a Favor</span>
        <span class="kpi-valor">{metricas.total_clientes}</span>
        <span class="kpi-sub">Cuentas con saldo activo mayor a $0</span>
      </div>
    </div>
  </div>

  <!-- Barra de Filtros -->
  <div class="barra-filtros">
    <div class="buscador-box">
      <i class="material-icons">search</i>
      <input
        type="text"
        placeholder="Buscar por cliente o RFC..."
        bind:value={buscar}
        on:keydown={(e) => { if (e.key === 'Enter') cargar_clientes(); }}
      />
      {#if buscar}
        <button class="btn-clear" on:click={() => { buscar = ""; cargar_clientes(); }}>
          <i class="material-icons">close</i>
        </button>
      {/if}
    </div>

    <label class="filtro-toggle">
      <input type="checkbox" bind:checked={solo_con_saldo} on:change={cargar_clientes} />
      <span>Solo clientes con saldo disponible</span>
    </label>

    <button class="btn btn-secundario" on:click={cargar_clientes} disabled={cargando}>
      <i class="material-icons">refresh</i>
      <span>{cargando ? "Actualizando..." : "Actualizar"}</span>
    </button>
  </div>

  <!-- Tabla de Clientes con Balance -->
  <div class="tarjeta-tabla">
    <table class="tabla-saldos">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>RFC</th>
          <th style="text-align: right;">Saldo a Favor Disponible</th>
          <th style="text-align: center;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#if cargando}
          <tr>
            <td colspan="4" style="text-align: center; padding: 40px; color: #64748b;">
              <i class="material-icons spin">sync</i>
              <p>Consultando balances de clientes...</p>
            </td>
          </tr>
        {:else if clientes.length === 0}
          <tr>
            <td colspan="4" style="text-align: center; padding: 40px; color: #64748b;">
              <i class="material-icons" style="font-size: 40px; opacity: 0.5;">savings</i>
              <p>No se encontraron clientes con saldo a favor registrado.</p>
              <button class="btn btn-primario" style="margin-top: 10px;" on:click={() => abrir_modal_deposito(null)}>
                <i class="material-icons">add</i>
                <span>Registrar Primer Abono</span>
              </button>
            </td>
          </tr>
        {:else}
          {#each clientes as c}
            <tr>
              <td>
                <div class="cliente-nombre">
                  <strong>{c.nombre}</strong>
                  {#if c.razon_social && c.razon_social !== c.nombre}
                    <small>{c.razon_social}</small>
                  {/if}
                </div>
              </td>
              <td>
                <span class="badge-rfc">{c.rfc || "SIN RFC"}</span>
              </td>
              <td style="text-align: right;">
                <span class="badge-saldo" class:con-saldo={c.saldo_a_favor > 0}>
                  {dinero(c.saldo_a_favor)}
                </span>
              </td>
              <td style="text-align: center;">
                <div class="acciones-fila">
                  <button
                    class="btn-accion btn-historial"
                    title="Ver historial y kárdex de movimientos"
                    on:click={() => ver_historial(c)}
                  >
                    <i class="material-icons">history</i>
                    <span>Kárdex</span>
                  </button>

                  <button
                    class="btn-accion btn-abonar-deposito"
                    title="Registrar nuevo abono para este cliente"
                    on:click={() => abrir_modal_deposito(c)}
                  >
                    <i class="material-icons">add</i>
                    <span>Abonar</span>
                  </button>

                  {#if c.saldo_a_favor > 0}
                    <button
                      class="btn-accion btn-aplicar-rep"
                      title="Usar este saldo para abonar a facturas PPD con REP"
                      on:click={() => ir_a_abonar_facturas(c)}
                    >
                      <i class="material-icons">receipt_long</i>
                      <span>Abonar Facturas</span>
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<!-- Modal: Registrar Depósito / Abono -->
{#if modal_deposito_visible}
  <div class="modal-backdrop" on:click|self={cerrar_modal_deposito}>
    <div class="modal-caja">
      <div class="modal-cabecera">
        <h3>
          <i class="material-icons">payments</i>
          <span>Registrar Abono a Capital / Saldo a Favor</span>
        </h3>
        <button class="btn-cerrar" on:click={cerrar_modal_deposito}>
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-cuerpo">
        <!-- Cliente -->
        <div class="campo">
          <label>Cliente Beneficiario *</label>
          {#if cliente_deposito}
            <div class="cliente-fijado">
              <div class="cliente-fijado-info">
                <i class="material-icons icono-ok">check_circle</i>
                <div>
                  <strong>{cliente_deposito.nombre}</strong>
                  <span>RFC: {cliente_deposito.rfc || "SIN RFC"} | Saldo a favor actual: <strong>{dinero(cliente_deposito.saldo_a_favor)}</strong></span>
                </div>
              </div>
              <button type="button" class="btn-cambiar-cliente" on:click={() => { cliente_deposito = null; consultar_clientes_para_modal(""); }}>
                Cambiar
              </button>
            </div>
          {:else}
            <!-- Buscador interactivo de clientes -->
            <div class="buscador-box buscador-modal">
              <i class="material-icons">search</i>
              <input
                type="text"
                placeholder="Escribe el nombre o RFC del cliente para buscar..."
                bind:value={texto_buscar_cliente}
                on:input={al_tipear_buscar_cliente}
                autofocus
              />
              {#if buscando_clientes}
                <i class="material-icons spin" style="font-size: 18px; color: #2563eb;">sync</i>
              {/if}
            </div>

            <!-- Lista de opciones de clientes -->
            <div class="lista-seleccion-clientes">
              {#if buscando_clientes && lista_busqueda_clientes.length === 0}
                <div class="item-vacio">Buscando clientes...</div>
              {:else if lista_busqueda_clientes.length === 0}
                <div class="item-vacio">No se encontraron clientes activos con ese criterio.</div>
              {:else}
                {#each lista_busqueda_clientes as cl}
                  <div class="item-cliente-opcion" on:click={() => { cliente_deposito = cl; }}>
                    <div class="item-cliente-textos">
                      <strong>{cl.nombre}</strong>
                      <small>RFC: {cl.rfc || "SIN RFC"} {cl.razon_social && cl.razon_social !== cl.nombre ? ' • ' + cl.razon_social : ''}</small>
                    </div>
                    <div class="item-cliente-saldo">
                      <span>Saldo: {dinero(cl.saldo_a_favor)}</span>
                      <i class="material-icons">chevron_right</i>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        </div>

        <div class="grid-doble">
          <!-- Monto -->
          <div class="campo">
            <label>Monto a Abonar ($ MXN) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ej. 50000.00"
              bind:value={deposito_monto}
              class="input-form input-monto"
            />
          </div>

          <!-- Fecha -->
          <div class="campo">
            <label>Fecha y Hora del Depósito *</label>
            <input type="datetime-local" bind:value={deposito_fecha} class="input-form" />
          </div>
        </div>

        <div class="grid-doble">
          <!-- Forma de Pago -->
          <div class="campo">
            <label>Forma de Pago *</label>
            <select bind:value={deposito_forma_pago} class="input-form">
              {#each FORMAS_PAGO_COMUNES as fp}
                <option value={fp.clave}>{fp.texto}</option>
              {/each}
            </select>
          </div>

          <!-- Cuenta Receptora Empresa -->
          <div class="campo">
            <label>Cuenta Bancaria Receptora (Empresa)</label>
            <select bind:value={deposito_cuenta_destino} class="input-form">
              <option value="">-- No especificada / Efectivo --</option>
              {#each cuentas_empresa as cta}
                <option value={cta._id}>{cta.banco} - {cta.numero_cuenta}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Referencia -->
        <div class="campo">
          <label>Referencia Bancaria / Nº Autorización</label>
          <input
            type="text"
            placeholder="Ej. SPEI 9482716, Folio de transferencia..."
            bind:value={deposito_referencia}
            class="input-form"
          />
        </div>

        <!-- Notas -->
        <div class="campo">
          <label>Notas u Observaciones</label>
          <textarea
            rows="2"
            placeholder="Detalles sobre el origen del abono, instrucciones del cliente..."
            bind:value={deposito_nota}
            class="input-form"
          ></textarea>
        </div>
      </div>

      <div class="modal-pie">
        <button class="btn btn-secundario" on:click={cerrar_modal_deposito} disabled={guardando}>
          Cancelar
        </button>
        <button class="btn btn-primario" on:click={guardar_deposito} disabled={guardando || !cliente_deposito}>
          <i class="material-icons">save</i>
          <span>{guardando ? "Registrando..." : "Guardar Abono"}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Kárdex / Historial del Cliente -->
{#if modal_historial_visible}
  <div class="modal-backdrop" on:click|self={cerrar_historial}>
    <div class="modal-caja modal-caja-grande">
      <div class="modal-cabecera">
        <div>
          <h3>
            <i class="material-icons">history_edu</i>
            <span>Kárdex de Movimientos - {cliente_historial ? cliente_historial.nombre : ""}</span>
          </h3>
          <span class="modal-sub">
            RFC: {cliente_historial ? (cliente_historial.rfc || "SIN RFC") : ""} | Balance a favor:
            <strong style="color: #059669;">{cliente_historial ? dinero(cliente_historial.saldo_a_favor) : "$0.00"}</strong>
          </span>
        </div>
        <button class="btn-cerrar" on:click={cerrar_historial}>
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-cuerpo" style="max-height: 60vh; overflow-y: auto;">
        {#if cargando_historial}
          <div style="text-align: center; padding: 40px; color: #64748b;">
            <i class="material-icons spin">sync</i>
            <p>Cargando historial de movimientos...</p>
          </div>
        {:else if historial_movimientos.length === 0}
          <div style="text-align: center; padding: 40px; color: #64748b;">
            <i class="material-icons" style="font-size: 36px; opacity: 0.5;">receipt</i>
            <p>Este cliente aún no tiene movimientos de saldo a favor registrados.</p>
          </div>
        {:else}
          <table class="tabla-kardex">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo de Movimiento</th>
                <th style="text-align: right;">Importe</th>
                <th style="text-align: right;">Saldo Resultante</th>
                <th>Detalles / Facturas / Referencia</th>
              </tr>
            </thead>
            <tbody>
              {#each historial_movimientos as m}
                <tr>
                  <td>{formatearFechaHora(m.fecha)}</td>
                  <td>
                    {#if m.tipo === 'deposito' || m.tipo === 'abono_excedente'}
                      <span class="badge-mov badge-deposito">
                        <i class="material-icons">arrow_downward</i>
                        <span>Depósito</span>
                      </span>
                    {:else if m.tipo === 'aplicacion'}
                      <span class="badge-mov badge-aplicacion">
                        <i class="material-icons">arrow_upward</i>
                        <span>Aplicación REP</span>
                      </span>
                    {:else}
                      <span class="badge-mov badge-reversa">
                        <i class="material-icons">undo</i>
                        <span>Reversión</span>
                      </span>
                    {/if}
                  </td>
                  <td style="text-align: right;">
                    <strong class={m.importe >= 0 ? "texto-verde" : "texto-rojo"}>
                      {m.importe >= 0 ? "+" : ""}{dinero(m.importe)}
                    </strong>
                  </td>
                  <td style="text-align: right;">
                    <span class="saldo-kardex">{dinero(m.saldo_nuevo)}</span>
                  </td>
                  <td>
                    <div class="detalles-mov">
                      {#if m.nota}
                        <div>{m.nota}</div>
                      {/if}
                      {#if m.referencia}
                        <small>Ref: {m.referencia}</small>
                      {/if}
                      {#if m.cuenta_destino}
                        <small>Banco: {m.cuenta_destino.banco} ({m.cuenta_destino.numero_cuenta})</small>
                      {/if}
                      {#if m.pago}
                        <div class="tag-pago">
                          <span>REP #{m.pago.folio}</span>
                          {#if m.pago.serie && m.pago.folio_rep}
                            <span>[{m.pago.serie}{m.pago.folio_rep}]</span>
                          {/if}
                          {#if m.facturas && m.facturas.length > 0}
                            <span style="color: #64748b;">({m.facturas.map(f => f.serie + f.folio).join(', ')})</span>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <div class="modal-pie">
        <button class="btn btn-secundario" on:click={cerrar_historial}>
          Cerrar
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .contenedor-saldos {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 10px 0;
  }

  .header-saldos {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 15px;
  }

  .titulo-seccion {
    font-size: 1.35rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .subtitulo-seccion {
    font-size: 0.9rem;
    color: #64748b;
    margin: 4px 0 0 0;
  }

  /* Grid KPIs */
  .grid-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 18px;
  }

  .tarjeta-kpi {
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 18px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
    border: 1px solid #e2e8f0;
  }

  .kpi-icono {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .kpi-icono i {
    font-size: 28px;
  }

  .kpi-azul {
    background: #eff6ff;
    color: #2563eb;
  }

  .kpi-verde {
    background: #ecfdf5;
    color: #059669;
  }

  .kpi-info {
    display: flex;
    flex-direction: column;
  }

  .kpi-etiqueta {
    font-size: 0.8rem;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #64748b;
  }

  .kpi-valor {
    font-size: 1.6rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin: 4px 0 2px 0;
  }

  .kpi-sub {
    font-size: 0.78rem;
    color: #94a3b8;
  }

  /* Barra Filtros */
  .barra-filtros {
    display: flex;
    align-items: center;
    gap: 15px;
    background: #ffffff;
    padding: 14px 18px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }

  .buscador-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 6px 12px;
    flex: 1;
    min-width: 260px;
  }

  .buscador-box input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 0.9rem;
    width: 100%;
    color: #1e293b;
  }

  .buscador-modal {
    background: #ffffff;
    border-color: #94a3b8;
    margin-bottom: 8px;
  }

  .btn-clear {
    background: none;
    border: none;
    cursor: pointer;
    color: #94a3b8;
    padding: 0;
    display: flex;
  }

  .filtro-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    color: #475569;
    cursor: pointer;
    user-select: none;
  }

  /* Botones Generales */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }

  .btn-primario {
    background: #2563eb;
    color: #ffffff;
  }

  .btn-primario:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .btn-secundario {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #cbd5e1;
  }

  .btn-secundario:hover:not(:disabled) {
    background: #e2e8f0;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Tabla */
  .tarjeta-tabla {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .tabla-saldos, .tabla-kardex {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .tabla-saldos th, .tabla-kardex th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }

  .tabla-saldos td, .tabla-kardex td {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .tabla-saldos tr:hover, .tabla-kardex tr:hover {
    background: #f8fafc;
  }

  .cliente-nombre {
    display: flex;
    flex-direction: column;
  }

  .cliente-nombre strong {
    color: #0f172a;
  }

  .cliente-nombre small {
    color: #64748b;
    font-size: 0.8rem;
  }

  .badge-rfc {
    display: inline-block;
    padding: 3px 8px;
    background: #f1f5f9;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.82rem;
    color: #475569;
  }

  .badge-saldo {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.95rem;
    background: #f1f5f9;
    color: #64748b;
  }

  .badge-saldo.con-saldo {
    background: #dcfce7;
    color: #15803d;
  }

  .acciones-fila {
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
  }

  .btn-accion {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: background 0.15s;
  }

  .btn-accion i {
    font-size: 16px;
  }

  .btn-historial {
    background: #f1f5f9;
    color: #334155;
  }

  .btn-historial:hover {
    background: #e2e8f0;
  }

  .btn-abonar-deposito {
    background: #eff6ff;
    color: #2563eb;
  }

  .btn-abonar-deposito:hover {
    background: #dbeafe;
  }

  .btn-aplicar-rep {
    background: #059669;
    color: #ffffff;
  }

  .btn-aplicar-rep:hover {
    background: #047857;
  }

  /* Modales */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  .modal-caja {
    background: #ffffff;
    border-radius: 14px;
    width: 100%;
    max-width: 580px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-caja-grande {
    max-width: 820px;
  }

  .modal-cabecera {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .modal-cabecera h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .modal-sub {
    font-size: 0.82rem;
    color: #64748b;
    margin-top: 2px;
    display: block;
  }

  .btn-cerrar {
    background: none;
    border: none;
    cursor: pointer;
    color: #94a3b8;
    padding: 4px;
    border-radius: 6px;
    display: flex;
  }

  .btn-cerrar:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .modal-cuerpo {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal-pie {
    padding: 14px 20px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .grid-doble {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .campo {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .campo label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
  }

  .input-form {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.9rem;
    outline: none;
    color: #0f172a;
    background: #ffffff;
    box-sizing: border-box;
    width: 100%;
  }

  .input-form:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }

  .input-monto {
    font-size: 1.05rem;
    font-weight: 700;
    color: #059669;
  }

  /* Cliente fijado en modal */
  .cliente-fijado {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 10px 14px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .cliente-fijado-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .icono-ok {
    color: #16a34a;
    font-size: 24px;
  }

  .cliente-fijado-info strong {
    color: #14532d;
    font-size: 0.95rem;
    display: block;
  }

  .cliente-fijado-info span {
    font-size: 0.8rem;
    color: #166534;
  }

  .btn-cambiar-cliente {
    background: #ffffff;
    border: 1px solid #86efac;
    color: #15803d;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-cambiar-cliente:hover {
    background: #dcfce7;
  }

  /* Lista desplegable de selección de clientes */
  .lista-seleccion-clientes {
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }

  .item-cliente-opcion {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: background 0.12s;
  }

  .item-cliente-opcion:last-child {
    border-bottom: none;
  }

  .item-cliente-opcion:hover {
    background: #eff6ff;
  }

  .item-cliente-textos {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .item-cliente-textos strong {
    color: #0f172a;
    font-size: 0.88rem;
  }

  .item-cliente-textos small {
    color: #64748b;
    font-size: 0.78rem;
  }

  .item-cliente-saldo {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #059669;
    font-weight: 600;
    font-size: 0.82rem;
  }

  .item-vacio {
    padding: 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 0.85rem;
  }

  /* Kárdex Badges */
  .badge-mov {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .badge-mov i {
    font-size: 14px;
  }

  .badge-deposito {
    background: #dcfce7;
    color: #15803d;
  }

  .badge-aplicacion {
    background: #fee2e2;
    color: #b91c1c;
  }

  .badge-reversa {
    background: #fef3c7;
    color: #b45309;
  }

  .texto-verde {
    color: #15803d;
  }

  .texto-rojo {
    color: #b91c1c;
  }

  .saldo-kardex {
    font-weight: 700;
    color: #0f172a;
  }

  .detalles-mov {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.82rem;
    color: #475569;
  }

  .tag-pago {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 3px;
    width: fit-content;
  }

  .spin {
    animation: rotar 1s linear infinite;
  }

  @keyframes rotar {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
