<script>
  // Pantalla compartida de "Cuentas por cobrar" (tipo = "cobrar") y "Cuentas por pagar" (tipo = "pagar").
  // CoreCFDI manda todas las facturas pendientes en una sola respuesta: los filtros, los totales y la
  // paginación se resuelven aquí, sin volver a llamar al servidor.
  import { onDestroy } from "svelte";
  import { postData, mensajes_app } from "../../stores";
  import SesionCoreCfdi from "./_SesionCoreCfdi.svelte";
  import BovedaFiscal from "./_BovedaFiscal.svelte";
  import { RANGOS_ANTIGUEDAD, filtrarCuentas, resumirCuentas, ordenarCuentas, monedasDe, paginar } from "../../../services/corecfdi/tesoreriaVista.js";

  export let tipo = "cobrar";

  const ESPERA_BUSQUEDA_MS = 400;
  const POR_PAGINA = 25;
  const es_cobrar = tipo === "cobrar";
  const TEXTOS = es_cobrar
    ? { titulo: "Cuentas por cobrar", subtitulo: "Facturas a crédito emitidas pendientes de cobro, según los CFDI descargados del SAT", icono: "request_quote", contraparte: "Cliente", liquidado: "Recuperado", facturado: "Facturado a crédito" }
    : { titulo: "Cuentas por pagar", subtitulo: "Facturas a crédito de proveedores pendientes de pago, según los CFDI descargados del SAT", icono: "account_balance_wallet", contraparte: "Proveedor", liquidado: "Pagado", facturado: "Compras a crédito" };

  let sesion_activa = false;
  let cargando = false;
  let error = "";
  let empresa = { rfc: "", nombre: "", rfcSinConfigurar: false };
  let facturas = [];
  let acumulados = null;
  let consultado_en = null;

  // Filtros locales
  let texto_buscar = "";
  let buscar = "";
  let estatus = "";
  let rango = "";
  let moneda = "";
  let campo_fecha = "fecha";
  let fecha_inicio = "";
  let fecha_fin = "";
  let pagina = 1;
  let expandidas = {};
  let boveda_id = null;
  let temporizador_busqueda = null;

  onDestroy(() => clearTimeout(temporizador_busqueda));

  async function cargar(actualizar = false) {
    cargando = true;
    try {
      const res = await postData("/app/facturacion/tesoreria", { tipo, actualizar });
      if (res.ok) {
        empresa = res.empresa;
        facturas = ordenarCuentas(res.facturas || []);
        acumulados = res.acumulados;
        consultado_en = res.consultadoEn;
        expandidas = {};
        error = "";
      } else if (res.tipo === "sesion") {
        // La sesión de CoreCFDI venció: se vuelve a pedir el inicio de sesión.
        sesion_activa = false;
      } else {
        error = res.mensaje;
      }
    } catch (err) {
      error = "No se pudieron consultar las " + TEXTOS.titulo.toLowerCase() + ".";
    } finally {
      cargando = false;
    }
  }

  function al_iniciar_sesion() {
    facturas = [];
    acumulados = null;
    cargar();
  }

  // La lista completa ya está en memoria: la búsqueda es local, con una pausa para no filtrar en cada tecla.
  function al_buscar() {
    clearTimeout(temporizador_busqueda);
    temporizador_busqueda = setTimeout(() => {
      buscar = texto_buscar;
    }, ESPERA_BUSQUEDA_MS);
  }

  function elegir_rango(clave) {
    rango = rango === clave ? "" : clave;
  }

  function limpiar_filtros() {
    texto_buscar = "";
    buscar = "";
    estatus = "";
    rango = "";
    moneda = "";
    campo_fecha = "fecha";
    fecha_inicio = "";
    fecha_fin = "";
  }

  function alternar_pagos(factura) {
    expandidas[factura.id] = !expandidas[factura.id];
    expandidas = expandidas;
  }

  // Las fechas llegan como YYYY-MM-DD en hora de México: se muestran tal cual, sin zona horaria.
  function fecha_legible(fecha) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || "");
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : fecha || "—";
  }

  function numero(valor) {
    return (Math.round((Number(valor) || 0) * 100) / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function monto(valor, codigo) {
    return codigo ? `${codigo} ${numero(valor)}` : numero(valor);
  }

  function plazo(factura) {
    if (factura.diasVencidos > 0) return `${factura.diasVencidos} día(s) vencida`;
    if (factura.estatus === "vencido") return "Vencida";
    return `Vence en ${factura.diasPorVencer} día(s)`;
  }

  function clase_estatus(valor) {
    if (valor === "vencido") return "estatus_vencido";
    if (valor === "al_corriente") return "estatus_al_corriente";
    if (valor === "liquidado") return "estatus_liquidado";
    return "estatus_desconocido";
  }

  function titulo_estatus(valor) {
    if (valor === "vencido") return "Vencido";
    if (valor === "al_corriente") return "Al corriente";
    if (valor === "liquidado") return "Liquidado";
    return valor || "—";
  }

  function hora_legible(marca) {
    return marca ? new Date(marca).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
  }

  $: monedas = monedasDe(facturas);
  $: varias_monedas = monedas.length > 1;
  $: filtros = { buscar, estatus, rango, moneda, campoFecha: campo_fecha, fechaInicio: fecha_inicio, fechaFin: fecha_fin };
  $: hay_filtros = !!(buscar || estatus || rango || moneda || fecha_inicio || fecha_fin);
  $: visibles = filtrarCuentas(facturas, filtros);
  // La antigüedad se calcula sin el filtro de rango, para poder cambiar de rango con un clic.
  $: resumen = resumirCuentas(filtrarCuentas(facturas, { ...filtros, rango: "" }));
  $: resumen_visible = resumirCuentas(visibles);
  // Al cambiar cualquier filtro se regresa a la primera página.
  $: filtros, (pagina = 1);
  $: tabla = paginar(visibles, pagina, POR_PAGINA);
</script>

<svelte:head>
  <title>{TEXTOS.titulo} - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">{TEXTOS.icono}</i>
      <div>
        <h1>{TEXTOS.titulo}</h1>
        <p>{TEXTOS.subtitulo}</p>
      </div>
    </div>
  </header>

  <SesionCoreCfdi bind:activa={sesion_activa} on:activa={al_iniciar_sesion}>
    <div class="alerta alerta_info">
      <i class="material-icons">info</i>
      <span>Los saldos se calculan con los CFDI descargados del SAT. Un pago aparece hasta que su complemento de pago (REP) se descarga.</span>
    </div>

    {#if empresa.rfcSinConfigurar}
      <div class="alerta alerta_aviso">
        <i class="material-icons">warning</i>
        <span>La empresa no tiene configurado su RFC o su FIEL en CoreCFDI (RFC genérico {empresa.rfc}). Las listas pueden no ser confiables.</span>
      </div>
    {/if}

    {#if error}
      <div class="alerta alerta_error">
        <i class="material-icons">error_outline</i>
        <span>{error}</span>
      </div>
    {/if}

    <div class="barra_acciones">
      <span class="nota">
        {#if empresa.nombre}{empresa.nombre} · {/if}
        {#if consultado_en}Consultado a las {hora_legible(consultado_en)}{/if}
      </span>
      <button class="btn btn_secundario" on:click={() => cargar(true)} disabled={cargando}>
        {cargando ? "Consultando..." : "Actualizar"}
      </button>
    </div>

    {#if cargando && !acumulados}
      <p class="estado">Consultando {TEXTOS.titulo.toLowerCase()}...</p>
    {:else if acumulados}
      {#if resumen_visible.length === 0}
        <div class="tarjetas">
          <div class="tarjeta"><small>Pendiente</small><strong>{numero(0)}</strong></div>
          <div class="tarjeta"><small>Vencido</small><strong>{numero(0)}</strong></div>
          <div class="tarjeta"><small>Facturas vencidas</small><strong>0</strong></div>
        </div>
      {/if}
      {#each resumen_visible as grupo}
        <div class="tarjetas">
          <div class="tarjeta"><small>Pendiente {grupo.moneda}</small><strong>{numero(grupo.pendiente)}</strong><em>{grupo.conteo} factura(s)</em></div>
          <div class="tarjeta tarjeta_vencido"><small>Vencido {grupo.moneda}</small><strong>{numero(grupo.vencido)}</strong></div>
          <div class="tarjeta"><small>Facturas vencidas</small><strong>{grupo.conteoVencidos}</strong></div>
          {#if !varias_monedas}
            <div class="tarjeta">
              <small>{TEXTOS.liquidado}</small>
              <strong>{acumulados.pctLiquidado}%</strong>
              <em>{numero(acumulados.totalLiquidado)} de {numero(acumulados.totalFacturado)}</em>
            </div>
          {/if}
        </div>
      {/each}
      {#if varias_monedas}
        <p class="nota">Hay facturas en más de una moneda: los totales se muestran por moneda y el porcentaje {TEXTOS.liquidado.toLowerCase()} no se muestra porque CoreCFDI lo calcula mezclando monedas.</p>
      {:else}
        <p class="nota">El porcentaje {TEXTOS.liquidado.toLowerCase()} es sobre todo lo facturado a crédito, incluidas las facturas ya liquidadas que no aparecen en la lista{hay_filtros ? "; no cambia con los filtros" : ""}.</p>
      {/if}
      {#if !es_cobrar && acumulados.pueCount !== null}
        <p class="nota">Gastos de contado (PUE) recibidos: {acumulados.pueCount} factura(s) por {numero(acumulados.pueTotal)}{varias_monedas ? " (mezcla de monedas)" : ""}. No forman parte de las cuentas por pagar.</p>
      {/if}

      <div class="card">
        <h2>Antigüedad de saldos</h2>
        {#if resumen.length === 0}
          <p class="nota">No hay saldos pendientes.</p>
        {/if}
        {#each resumen as grupo}
          {#if varias_monedas}<h3>{grupo.moneda}</h3>{/if}
          <div class="rangos">
            {#each grupo.estratificacion as r}
              <button class="rango" class:activo={rango === r.clave} class:rango_corriente={r.clave === "al_corriente"} on:click={() => elegir_rango(r.clave)}>
                <small>{r.titulo}</small>
                <strong>{monto(r.total, grupo.moneda)}</strong>
                <em>{r.pct}% · {r.count} factura(s)</em>
                <span class="barra"><span style={"width:" + Math.min(r.pct, 100) + "%"}></span></span>
              </button>
            {/each}
          </div>
        {/each}
        <p class="nota">Haga clic en un rango para filtrar la tabla; otro clic quita el filtro.</p>
      </div>

      <div class="card">
        <div class="filtros">
          <div class="campo campo_buscar">
            <label for="cuentas_buscar">Buscar</label>
            <input id="cuentas_buscar" type="text" placeholder={"Folio, UUID, " + TEXTOS.contraparte.toLowerCase() + " o RFC"} bind:value={texto_buscar} on:input={al_buscar} />
          </div>
          <div class="campo">
            <label for="cuentas_estatus">Estatus</label>
            <select id="cuentas_estatus" bind:value={estatus}>
              <option value="">Todos</option>
              <option value="al_corriente">Al corriente</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div class="campo">
            <label for="cuentas_rango">Antigüedad</label>
            <select id="cuentas_rango" bind:value={rango}>
              <option value="">Todas</option>
              {#each RANGOS_ANTIGUEDAD as r}
                <option value={r.clave}>{r.titulo}</option>
              {/each}
            </select>
          </div>
          {#if varias_monedas}
            <div class="campo">
              <label for="cuentas_moneda">Moneda</label>
              <select id="cuentas_moneda" bind:value={moneda}>
                <option value="">Todas</option>
                {#each monedas as codigo}
                  <option value={codigo}>{codigo || "Sin moneda"}</option>
                {/each}
              </select>
            </div>
          {/if}
          <div class="campo">
            <label for="cuentas_campo_fecha">Fecha de</label>
            <select id="cuentas_campo_fecha" bind:value={campo_fecha}>
              <option value="fecha">Emisión</option>
              <option value="fechaVencimiento">Vencimiento</option>
            </select>
          </div>
          <div class="campo">
            <label for="cuentas_desde">Desde</label>
            <input id="cuentas_desde" type="date" bind:value={fecha_inicio} />
          </div>
          <div class="campo">
            <label for="cuentas_hasta">Hasta</label>
            <input id="cuentas_hasta" type="date" bind:value={fecha_fin} />
          </div>
          <button class="btn btn_secundario" on:click={limpiar_filtros} disabled={!hay_filtros}>Limpiar</button>
        </div>

        {#if tabla.total === 0}
          <div class="vacio">
            <i class="material-icons icono_vacio">task_alt</i>
            <p>{hay_filtros ? "No hay facturas pendientes con estos filtros." : "No hay facturas pendientes."}</p>
          </div>
        {:else}
          <div class="tabla_scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Folio</th>
                  <th>{TEXTOS.contraparte}</th>
                  <th>RFC</th>
                  <th class="derecha">Total</th>
                  <th class="derecha">Abonado</th>
                  <th class="derecha">Saldo</th>
                  <th>Vencimiento</th>
                  <th>Plazo</th>
                  <th>Estatus</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each tabla.items as factura (factura.id)}
                  <tr class:fila_vencida={factura.estatus === "vencido"}>
                    <td>{fecha_legible(factura.fecha)}</td>
                    <td title={factura.uuid || ""}>{factura.folio || "—"}</td>
                    <td class="contraparte">{factura.contraparte || "—"}</td>
                    <td>{factura.rfc || "—"}</td>
                    <td class="derecha">{monto(factura.importe, factura.moneda)}</td>
                    <td class="derecha">{numero(factura.abonos)}<small>{factura.pctLiquidado}%</small></td>
                    <td class="derecha"><strong>{monto(factura.saldo, factura.moneda)}</strong></td>
                    <td>{fecha_legible(factura.fechaVencimiento)}<small>{factura.diasCredito} días de crédito</small></td>
                    <td>{plazo(factura)}</td>
                    <td><span class={"badge " + clase_estatus(factura.estatus)}>{titulo_estatus(factura.estatus)}</span></td>
                    <td class="acciones">
                      <button class="enlace" on:click={() => (boveda_id = factura.id)}>Bóveda Fiscal</button>
                      {#if factura.pagos.length > 0}
                        <button class="enlace" on:click={() => alternar_pagos(factura)}>
                          {expandidas[factura.id] ? "Ocultar abonos" : `Abonos (${factura.pagos.length})`}
                        </button>
                      {/if}
                    </td>
                  </tr>
                  {#if expandidas[factura.id]}
                    <tr class="fila_pagos">
                      <td colspan="11">
                        <table class="tabla_pagos">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Documento</th>
                              <th>Folio</th>
                              <th>UUID</th>
                              <th>Parcialidad</th>
                              <th class="derecha">Saldo anterior</th>
                              <th class="derecha">Abono</th>
                              <th class="derecha">Nuevo saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {#each factura.pagos as pago}
                              <tr>
                                <td>{fecha_legible(pago.fecha)}</td>
                                <td>{pago.tipoDocumento || pago.tipoCfdi || "—"}</td>
                                <td>{pago.folio || "—"}</td>
                                <td class="uuid" title={pago.uuid || ""}>{pago.uuid || "—"}</td>
                                <td>{pago.parcialidad === null ? "—" : pago.parcialidad}</td>
                                <td class="derecha">{monto(pago.saldoAnterior, factura.moneda)}</td>
                                <td class="derecha">{monto(pago.monto, factura.moneda)}</td>
                                <td class="derecha">{monto(pago.nuevoSaldo, factura.moneda)}</td>
                              </tr>
                            {/each}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>
          <div class="paginacion">
            <button class="btn btn_secundario" on:click={() => (pagina = tabla.pagina - 1)} disabled={tabla.pagina <= 1}>Anterior</button>
            <span>Página {tabla.pagina} de {tabla.totalPaginas} · {tabla.total} factura(s)</span>
            <button class="btn btn_secundario" on:click={() => (pagina = tabla.pagina + 1)} disabled={tabla.pagina >= tabla.totalPaginas}>Siguiente</button>
          </div>
        {/if}
      </div>
    {/if}
  <!-- Keyed each: al cambiar de factura el panel se vuelve a crear. -->
  {#each boveda_id === null ? [] : [boveda_id] as id (id)}
    <BovedaFiscal {id} origen={es_cobrar ? "emitida" : "recibida"} on:cerrar={() => (boveda_id = null)} on:sesion={() => { boveda_id = null; sesion_activa = false; }} />
  {/each}
  </SesionCoreCfdi>
</div>

<style>
  .contenedor { padding: 24px; max-width: 1400px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .encabezado { display: flex; align-items: center; background: #1e293b; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
  .titulo { display: flex; align-items: center; gap: 16px; }
  .icono { font-size: 36px; color: #38bdf8; }
  h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .encabezado p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  h2 { margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #1e293b; }
  h3 { margin: 12px 0 8px 0; font-size: 13px; font-weight: 700; color: #475569; }
  .barra_acciones { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .nota { font-size: 12px; color: #64748b; margin: 6px 0 12px 0; }
  .estado { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 10px; }
  .tarjeta { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
  .tarjeta small { display: block; color: #64748b; font-size: 12px; }
  .tarjeta strong { display: block; font-size: 20px; color: #0f172a; }
  .tarjeta em { font-style: normal; font-size: 12px; color: #64748b; }
  .tarjeta_vencido strong { color: #b91c1c; }
  .card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
  .rangos { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
  .rango { text-align: left; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; padding: 12px; cursor: pointer; font-family: inherit; }
  .rango.activo { border-color: #1d4ed8; background: #eff6ff; }
  .rango small { display: block; font-size: 12px; font-weight: 600; color: #475569; }
  .rango strong { display: block; font-size: 15px; color: #0f172a; margin: 4px 0; }
  .rango em { font-style: normal; font-size: 12px; color: #64748b; }
  .barra { display: block; height: 5px; background: #e2e8f0; border-radius: 3px; margin-top: 8px; overflow: hidden; }
  .barra span { display: block; height: 100%; background: #dc2626; }
  .rango_corriente .barra span { background: #16a34a; }
  .filtros { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; margin-bottom: 16px; }
  .campo label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
  .campo input, .campo select { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; box-sizing: border-box; }
  .campo_buscar { flex: 1; min-width: 220px; }
  .campo_buscar input { width: 100%; }
  .btn { background: #1d4ed8; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn_secundario { background: #e2e8f0; color: #334155; }
  .alerta { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; margin: 0 0 12px 0; }
  .alerta_error { background: #fee2e2; color: #991b1b; }
  .alerta_aviso { background: #fef3c7; color: #92400e; }
  .alerta_info { background: #e0f2fe; color: #075985; }
  .icono_vacio { font-size: 48px; color: #94a3b8; }
  .vacio { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .tabla_scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  th, td { padding: 11px 9px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
  th { background: #f8fafc; color: #475569; }
  .derecha { text-align: right; }
  td small { display: block; color: #64748b; margin-top: 4px; }
  td.contraparte { max-width: 260px; white-space: normal; }
  td.uuid { max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
  tr.fila_vencida { background: #fef2f2; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .estatus_vencido { background: #fee2e2; color: #991b1b; }
  .estatus_al_corriente { background: #dcfce7; color: #166534; }
  .estatus_liquidado { background: #dbeafe; color: #1e40af; }
  .estatus_desconocido { background: #f1f5f9; color: #334155; }
  .enlace { color: #1d4ed8; background: none; border: none; padding: 0; font-size: 13px; cursor: pointer; }
  .acciones { white-space: nowrap; }
  .acciones .enlace + .enlace { margin-left: 10px; }
  .fila_pagos > td { background: #f8fafc; padding: 12px 20px; }
  .tabla_pagos th { background: #eef2f7; }
  .paginacion { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 16px; font-size: 13px; color: #475569; }
</style>
