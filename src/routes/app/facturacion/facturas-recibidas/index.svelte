<script>
  import { onDestroy } from "svelte";
  import { postData, mensajes_app } from "../../../stores";
  import SesionCoreCfdi from "../_SesionCoreCfdi.svelte";
  import BovedaFiscal from "../_BovedaFiscal.svelte";

  // La API permite 60 peticiones por minuto para toda la integración: la búsqueda espera a que se deje de escribir.
  const ESPERA_BUSQUEDA_MS = 500;
  const PESTANAS = [
    { categoria: "gastos", titulo: "Gastos" },
    { categoria: "nomina", titulo: "Nómina" },
    { categoria: "todos", titulo: "Todos" }
  ];

  let sesion_activa = false;
  let categoria = "gastos";
  let buscar = "";
  let fecha_inicio = "";
  let fecha_fin = "";
  let status = "";

  let facturas = [];
  let pagina = 1;
  let ultima_pagina = 1;
  let total = 0;
  let totales = null;
  let conteo_categorias = null;
  let cargando = false;
  let error = "";
  let errores = {};
  let expandidas = {};
  let temporizador_busqueda = null;
  let consulta_actual = 0;
  let boveda_id = null;

  // Nada se consulta hasta que el usuario tiene sesión en CoreCFDI.
  function al_iniciar_sesion() {
    facturas = [];
    totales = null;
    conteo_categorias = null;
    cargar(1);
  }
  onDestroy(() => clearTimeout(temporizador_busqueda));

  async function cargar(page) {
    const consulta = ++consulta_actual;
    cargando = true;
    try {
      const res = await postData("/app/facturacion/facturas-recibidas", {
        filtros: { categoria, buscar, fecha_inicio, fecha_fin, status },
        page
      });
      // Si mientras tanto se lanzó otra consulta, esta respuesta ya no aplica.
      if (consulta !== consulta_actual) return;
      if (res.ok) {
        facturas = res.items || [];
        pagina = res.page;
        ultima_pagina = res.lastPage;
        total = res.total;
        totales = res.totales;
        conteo_categorias = res.conteoCategorias;
        expandidas = {};
        error = "";
        errores = {};
      } else if (res.tipo === "sesion") {
        // La sesión de CoreCFDI venció: se vuelve a pedir el inicio de sesión.
        sesion_activa = false;
      } else {
        error = res.mensaje;
        errores = res.errors || {};
        if (!res.errors) {
          $mensajes_app.push({ tipo: "error", mensaje: res.mensaje });
          $mensajes_app = $mensajes_app;
        }
      }
    } catch (err) {
      if (consulta === consulta_actual) error = "No se pudieron consultar las facturas recibidas.";
    } finally {
      if (consulta === consulta_actual) cargando = false;
    }
  }

  function cambiar_categoria(nueva) {
    categoria = nueva;
    cargar(1);
  }

  function al_buscar() {
    clearTimeout(temporizador_busqueda);
    temporizador_busqueda = setTimeout(() => cargar(1), ESPERA_BUSQUEDA_MS);
  }

  function limpiar_filtros() {
    buscar = "";
    fecha_inicio = "";
    fecha_fin = "";
    status = "";
    cargar(1);
  }

  function alternar_pagos(factura) {
    expandidas[factura.id] = !expandidas[factura.id];
    expandidas = expandidas;
  }

  // fecha y hora vienen en hora de México, sin zona horaria: se muestran tal cual.
  function fecha_legible(fecha, hora) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || "");
    const dia = partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : fecha || "—";
    return hora ? `${dia} ${hora}` : dia;
  }

  function numero(valor) {
    return (Math.round((Number(valor) || 0) * 100) / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function monto(valor, moneda) {
    return moneda ? `${moneda} ${numero(valor)}` : numero(valor);
  }

  function clase_estado(estado) {
    if (estado === "vigente") return "estado_vigente";
    if (estado === "cancelado") return "estado_cancelado";
    return "estado_desconocido";
  }

  $: hay_efos = facturas.some((f) => f.esEfo);
</script>

<svelte:head>
  <title>Facturas Recibidas - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">move_to_inbox</i>
      <div>
        <h1>Facturas Recibidas</h1>
        <p>CFDI de proveedores, gastos y nómina descargados del SAT a través de CoreCFDI</p>
      </div>
    </div>
  </header>

  <SesionCoreCfdi bind:activa={sesion_activa} on:activa={al_iniciar_sesion}>
  <div class="pestanas">
    {#each PESTANAS as pestana}
      <button class="pestana" class:activa={categoria === pestana.categoria} on:click={() => cambiar_categoria(pestana.categoria)}>
        {pestana.titulo}
        {#if conteo_categorias && conteo_categorias[pestana.categoria] !== undefined}
          <span class="contador">{conteo_categorias[pestana.categoria]}</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if totales}
    <div class="tarjetas">
      <div class="tarjeta"><small>Registros</small><strong>{totales.total_registros}</strong></div>
      <div class="tarjeta"><small>Subtotal</small><strong>{numero(totales.suma_subtotal)}</strong></div>
      <div class="tarjeta"><small>IVA (aprox.)</small><strong>{numero(totales.suma_iva)}</strong></div>
      <div class="tarjeta"><small>Total</small><strong>{numero(totales.suma_total)}</strong></div>
      <div class="tarjeta"><small>Vigentes</small><strong>{totales.vigentes_count}</strong></div>
      <div class="tarjeta"><small>Canceladas</small><strong>{totales.canceladas_count}</strong></div>
    </div>
  {/if}

  <div class="card">
    <div class="filtros">
      <div class="campo campo_buscar">
        <label>Buscar</label>
        <input type="text" maxlength="100" placeholder="Folio, UUID, proveedor o RFC" bind:value={buscar} on:input={al_buscar} />
        {#if errores.buscar}<small class="error_campo">{errores.buscar[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Desde</label>
        <input type="date" bind:value={fecha_inicio} on:change={() => cargar(1)} />
        {#if errores.fecha_inicio}<small class="error_campo">{errores.fecha_inicio[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Hasta</label>
        <input type="date" bind:value={fecha_fin} on:change={() => cargar(1)} />
        {#if errores.fecha_fin}<small class="error_campo">{errores.fecha_fin[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Estado</label>
        <select bind:value={status} on:change={() => cargar(1)}>
          <option value="">Todos</option>
          <option value="vigente">Vigente</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <button class="btn btn_secundario" on:click={limpiar_filtros}>Limpiar</button>
    </div>

    {#if error}
      <div class="alerta alerta_error">
        <i class="material-icons">error_outline</i>
        <span>{error}</span>
      </div>
    {/if}

    {#if hay_efos}
      <div class="alerta alerta_error">
        <i class="material-icons">report</i>
        <span>Hay proveedores en la lista 69-B del SAT (EFOS) en esta página. Revise las facturas marcadas antes de deducirlas.</span>
      </div>
    {/if}

    {#if cargando && facturas.length === 0}
      <p class="estado">Consultando facturas recibidas...</p>
    {:else if facturas.length === 0}
      <div class="vacio">
        <i class="material-icons icono_vacio">find_in_page</i>
        <p>No hay facturas recibidas con estos filtros.</p>
      </div>
    {:else}
      <div class="tabla_scroll" class:atenuada={cargando}>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Folio</th>
              <th>UUID</th>
              <th>Proveedor</th>
              <th>RFC</th>
              <th>Tipo</th>
              <th>Pago</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each facturas as factura (factura.id)}
              <tr class:fila_efos={factura.esEfo}>
                <td>{fecha_legible(factura.fecha, factura.hora)}</td>
                <td>{factura.folio || "—"}</td>
                <td class="uuid" title={factura.uuid}>{factura.uuid}</td>
                <td class="proveedor">
                  {factura.proveedor.nombre || "—"}
                  {#if factura.esEfo}
                    <span class="badge badge_efos" title="RFC listado en el artículo 69-B del SAT">EFOS</span>
                  {/if}
                </td>
                <td>{factura.proveedor.rfc || "—"}</td>
                <td title={factura.tipoDescripcion}>{factura.tipo || "—"}</td>
                <td>
                  {factura.metodoPago.clave || "—"}
                  <small>Forma {factura.formaPago.clave || "—"}</small>
                </td>
                <td>
                  {monto(factura.total, factura.moneda)}
                  {#if factura.saldo > 0}<small>Saldo {monto(factura.saldo, factura.moneda)}</small>{/if}
                </td>
                <td><span class={"badge " + clase_estado(factura.estado)}>{factura.estado}</span></td>
                <td class="acciones">
                  <button class="enlace" on:click={() => (boveda_id = factura.id)}>Bóveda Fiscal</button>
                  {#if factura.satUrl}
                    <a href={factura.satUrl} target="_blank" rel="noopener noreferrer">Verificar en SAT</a>
                  {/if}
                  {#if factura.pagos.length > 0}
                    <button class="enlace" on:click={() => alternar_pagos(factura)}>
                      {expandidas[factura.id] ? "Ocultar pagos" : `Pagos (${factura.pagos.length})`}
                    </button>
                  {/if}
                </td>
              </tr>
              {#if expandidas[factura.id]}
                <tr class="fila_pagos">
                  <td colspan="10">
                    <table class="tabla_pagos">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Parcialidad</th>
                          <th>Saldo anterior</th>
                          <th>Monto pagado</th>
                          <th>Nuevo saldo</th>
                          <th>UUID del pago</th>
                          <th>Estado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each factura.pagos as pago}
                          <tr>
                            <td>{fecha_legible(pago.fecha || pago.fechaCfdi)}</td>
                            <td>{pago.parcialidad}</td>
                            <td>{monto(pago.saldoAnterior, factura.moneda)}</td>
                            <td>{monto(pago.monto, factura.moneda)}</td>
                            <td>{monto(pago.nuevoSaldo, factura.moneda)}</td>
                            <td class="uuid" title={pago.uuid}>{pago.uuid || "—"}</td>
                            <td>{pago.estado || "—"}</td>
                            <td>
                              {#if pago.satUrl}
                                <a href={pago.satUrl} target="_blank" rel="noopener noreferrer">Verificar en SAT</a>
                              {/if}
                            </td>
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
        <button class="btn btn_secundario" on:click={() => cargar(pagina - 1)} disabled={pagina <= 1 || cargando}>Anterior</button>
        <span>Página {pagina} de {ultima_pagina} · {total} facturas</span>
        <button class="btn btn_secundario" on:click={() => cargar(pagina + 1)} disabled={pagina >= ultima_pagina || cargando}>Siguiente</button>
      </div>
    {/if}
  </div>
  <!-- Keyed each: al cambiar de factura el panel se vuelve a crear. -->
  {#each boveda_id === null ? [] : [boveda_id] as id (id)}
    <BovedaFiscal {id} origen="recibida" on:cerrar={() => (boveda_id = null)} on:sesion={() => { boveda_id = null; sesion_activa = false; }} />
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
  .pestanas { display: flex; gap: 10px; margin-bottom: 16px; }
  .pestana { display: flex; align-items: center; gap: 8px; background: #e2e8f0; border: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #475569; cursor: pointer; }
  .pestana.activa { background: #1d4ed8; color: #fff; }
  .contador { background: rgba(255, 255, 255, 0.6); color: #1e293b; border-radius: 10px; padding: 1px 8px; font-size: 12px; }
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .tarjeta { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
  .tarjeta small { display: block; color: #64748b; font-size: 12px; }
  .tarjeta strong { font-size: 18px; color: #0f172a; }
  .card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; }
  .filtros { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; margin-bottom: 16px; }
  .campo label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
  .campo input, .campo select { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; box-sizing: border-box; }
  .campo_buscar { flex: 1; min-width: 220px; }
  .campo_buscar input { width: 100%; }
  .campo small.error_campo { display: block; margin-top: 4px; font-size: 12px; color: #b91c1c; }
  .btn { background: #1d4ed8; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn_secundario { background: #e2e8f0; color: #334155; }
  .alerta { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; margin: 12px 0; }
  .alerta_error { background: #fee2e2; color: #991b1b; }
  .icono_vacio { font-size: 48px; color: #94a3b8; }
  .vacio, .estado { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .tabla_scroll { overflow-x: auto; }
  .tabla_scroll.atenuada { opacity: 0.6; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  th, td { padding: 11px 9px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
  th { background: #f8fafc; color: #475569; }
  td small { display: block; color: #64748b; margin-top: 4px; }
  td.uuid { max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
  td.proveedor { max-width: 260px; white-space: normal; }
  tr.fila_efos { background: #fef2f2; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge_efos { background: #b91c1c; color: #fff; margin-left: 6px; }
  .estado_vigente { background: #dcfce7; color: #166534; }
  .estado_cancelado { background: #fee2e2; color: #991b1b; }
  .estado_desconocido { background: #f1f5f9; color: #334155; }
  .acciones a, .enlace { color: #1d4ed8; text-decoration: none; background: none; border: none; padding: 0; font-size: 13px; cursor: pointer; margin-right: 10px; }
  .fila_pagos > td { background: #f8fafc; padding: 12px 20px; }
  .tabla_pagos th { background: #eef2f7; }
  .paginacion { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 16px; font-size: 13px; color: #475569; }
</style>
