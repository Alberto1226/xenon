<script>
  import { onMount } from "svelte";
  import { postData, mensajes_app } from "../../../stores";
  import Paginacion from "../../componentes/paginacion/index.svelte";

  const MOTIVOS_CANCELACION = [
    { clave: "02", descripcion: "02 - Comprobante emitido con errores sin relación" },
    { clave: "01", descripcion: "01 - Comprobante emitido con errores con relación (requiere sustitución)" },
    { clave: "03", descripcion: "03 - No se llevó a cabo la operación" },
    { clave: "04", descripcion: "04 - Operación nominativa relacionada en una factura global" }
  ];

  const MESES = [
    { id: 1, nombre: "Enero" },
    { id: 2, nombre: "Febrero" },
    { id: 3, nombre: "Marzo" },
    { id: 4, nombre: "Abril" },
    { id: 5, nombre: "Mayo" },
    { id: 6, nombre: "Junio" },
    { id: 7, nombre: "Julio" },
    { id: 8, nombre: "Agosto" },
    { id: 9, nombre: "Septiembre" },
    { id: 10, nombre: "Octubre" },
    { id: 11, nombre: "Noviembre" },
    { id: 12, nombre: "Diciembre" }
  ];

  const fechaHoy = new Date();
  const anioActual = fechaHoy.getFullYear();
  const mesActual = fechaHoy.getMonth() + 1; // 1-12

  const ANIOS = [];
  for (let a = anioActual + 1; a >= 2023; a--) {
    ANIOS.push(a);
  }

  let facturas = [];
  let cargando = false;
  let cancelando = false;

  // Paginación
  let pagina_actual = 1;
  let total_paginas = 1;
  let ha_cambiado_pagina_actual = false;
  let por_pagina = 15;
  let total_registros = 0;
  let resumen = { total_monto: 0, vigentes: 0, canceladas: 0 };

  // Filtros
  let buscar = "";
  let filtro_folio = "";
  let filtro_uuid = "";
  let filtro_receptor = "";
  let filtro_mes = mesActual; // Por defecto: mes en curso
  let filtro_anio = anioActual; // Por defecto: año en curso
  let filtro_status = "Todos";
  let filtro_metodo_pago = "Todos"; // Todos, PUE, PPD
  let temporizador_buscar;

  // Modal Cancelación
  let modal_cancelar_abierto = false;
  let factura_a_cancelar = null;
  let motivo_cancelacion = "02";
  let uuid_sustitucion = "";

  $: if (ha_cambiado_pagina_actual) {
    ha_cambiado_pagina_actual = false;
    cargar_facturas();
  }

  onMount(() => {
    cargar_facturas();
  });

  function avisar(tipo, mensaje) {
    $mensajes_app.push({ tipo, mensaje });
    $mensajes_app = $mensajes_app;
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      avisar("exito", "Copiado al portapapeles.");
    } catch (e) {
      avisar("info", texto);
    }
  }

  function al_escribir_buscar() {
    clearTimeout(temporizador_buscar);
    temporizador_buscar = setTimeout(() => {
      pagina_actual = 1;
      cargar_facturas();
    }, 350);
  }

  function aplicar_filtros() {
    pagina_actual = 1;
    cargar_facturas();
  }

  function limpiar_filtros() {
    buscar = "";
    filtro_folio = "";
    filtro_uuid = "";
    filtro_receptor = "";
    filtro_mes = mesActual;
    filtro_anio = anioActual;
    filtro_status = "Todos";
    filtro_metodo_pago = "Todos";
    pagina_actual = 1;
    cargar_facturas();
  }

  function ver_todas_las_facturas() {
    buscar = "";
    filtro_folio = "";
    filtro_uuid = "";
    filtro_receptor = "";
    filtro_mes = "Todos";
    filtro_anio = "Todos";
    filtro_status = "Todos";
    filtro_metodo_pago = "Todos";
    pagina_actual = 1;
    cargar_facturas();
  }

  async function cargar_facturas() {
    cargando = true;
    try {
      const payload = {
        pagina: pagina_actual,
        por_pagina,
        buscar: buscar.trim(),
        folio: filtro_folio.trim(),
        uuid: filtro_uuid.trim(),
        receptor: filtro_receptor.trim(),
        mes: filtro_mes,
        anio: filtro_anio,
        metodo_pago: filtro_metodo_pago,
        status: filtro_status
      };
      const respuesta = await postData("/app/facturacion/facturas-emitidas", payload);
      if (!respuesta.ok) throw new Error(respuesta.mensaje || "No se pudieron consultar las facturas.");
      facturas = respuesta.facturas || [];
      total_registros = respuesta.total || 0;
      total_paginas = respuesta.total_paginas || 1;
      pagina_actual = respuesta.pagina_actual || 1;
      if (respuesta.resumen) resumen = respuesta.resumen;
    } catch (err) {
      avisar("error", err.message || "Error al cargar facturas emitidas.");
    } finally {
      cargando = false;
    }
  }

  function fecha_legible(fecha) {
    if (!fecha) return "-";
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString("es-MX");
  }

  function dinero(monto) {
    return Number(monto || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  // --- Modal Cancelación ---
  function abrir_modal_cancelar(factura) {
    factura_a_cancelar = factura;
    motivo_cancelacion = "02";
    uuid_sustitucion = "";
    modal_cancelar_abierto = true;
  }

  function cerrar_modal_cancelar() {
    modal_cancelar_abierto = false;
    factura_a_cancelar = null;
    uuid_sustitucion = "";
    cancelando = false;
  }

  async function confirmar_cancelacion() {
    if (!factura_a_cancelar) return;
    if (motivo_cancelacion === "01") {
      const cleanUuid = uuid_sustitucion.trim();
      if (!/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(cleanUuid)) {
        return avisar("error", "Ingresa un UUID de sustitución válido de 36 caracteres.");
      }
    }

    cancelando = true;
    try {
      const payload = {
        factura_id: factura_a_cancelar._id,
        uuid: factura_a_cancelar.uuid,
        motivo: motivo_cancelacion,
        uuid_sustitucion: motivo_cancelacion === "01" ? uuid_sustitucion.trim() : ""
      };
      const res = await postData("/app/facturacion/cancelar-factura", payload);
      if (!res.ok) throw new Error(res.mensaje || "No se pudo cancelar la factura.");
      avisar("exito", res.mensaje || "Factura cancelada correctamente.");
      cerrar_modal_cancelar();
      await cargar_facturas();
    } catch (err) {
      avisar("error", err.message || "Error al cancelar la factura.");
    } finally {
      cancelando = false;
    }
  }
</script>

<svelte:head>
  <title>Facturas Emitidas - Xenon</title>
</svelte:head>

<div class="contenedor">
  <!-- Encabezado -->
  <header class="encabezado">
    <div class="titulo-area">
      <div class="icono-badge">
        <i class="material-icons">receipt_long</i>
      </div>
      <div>
        <h1>Facturas Emitidas</h1>
        <p>Consulta, búsqueda avanzada y cancelación de comprobantes fiscales (CFDI 4.0) ante el SAT / PAC</p>
      </div>
    </div>
    <div class="header-acciones">
      <button class="btn-secundario btn-sm" on:click={cargar_facturas} disabled={cargando}>
        <i class="material-icons">refresh</i>
        Actualizar
      </button>
    </div>
  </header>

  <!-- Métricas Rápidas -->
  <div class="metricas-grid">
    <div class="metrica-card">
      <span class="metrica-label">Facturas Encontradas</span>
      <span class="metrica-valor">{total_registros}</span>
      <span class="metrica-subtexto">
        {#if filtro_mes !== "Todos" && filtro_anio !== "Todos"}
          {(MESES.find(m => m.id === Number(filtro_mes)) || {}).nombre || "Mes"} {filtro_anio}
        {:else if filtro_anio !== "Todos"}
          Año {filtro_anio}
        {:else}
          Histórico general
        {/if}
      </span>
    </div>
    <div class="metrica-card">
      <span class="metrica-label">Vigentes</span>
      <span class="metrica-valor text-verde">{resumen.vigentes}</span>
    </div>
    <div class="metrica-card">
      <span class="metrica-label">Canceladas</span>
      <span class="metrica-valor text-rojo">{resumen.canceladas}</span>
    </div>
    <div class="metrica-card">
      <span class="metrica-label">Monto Total Facturado</span>
      <span class="metrica-valor text-azul">{dinero(resumen.total_monto)}</span>
    </div>
  </div>

  <!-- Barra de Búsqueda y Filtros -->
  <div class="card card-filtros-principal mb-4">
    <!-- Encabezado con Icono Naranja (Replica exacta de la referencia de CUCC / Xenon) -->
    <div class="filtros-header">
      <div class="icono-filtro-naranja">
        <i class="material-icons">filter_alt</i>
      </div>
      <h2 class="titulo-filtros">FILTROS DE BÚSQUEDA</h2>
    </div>

    <!-- Selectores Principales: AÑO y MES destacados (sin días) + MÉTODO DE PAGO y ESTADO -->
    <div class="grid-filtros-periodo">
      <!-- Selector AÑO -->
      <div class="campo-periodo">
        <label for="select-filtro-anio">AÑO</label>
        <div class="select-wrapper">
          <select id="select-filtro-anio" bind:value={filtro_anio} on:change={aplicar_filtros}>
            <option value="Todos">Todos los años</option>
            {#each ANIOS as a}
              <option value={a}>{a}</option>
            {/each}
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>

      <!-- Selector MES (Destacado con borde suave) -->
      <div class="campo-periodo">
        <label for="select-filtro-mes">MES</label>
        <div class="select-wrapper select-destacado">
          <select id="select-filtro-mes" bind:value={filtro_mes} on:change={aplicar_filtros}>
            <option value="Todos">Todos los meses</option>
            {#each MESES as m}
              <option value={m.id}>{m.nombre}</option>
            {/each}
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>

      <!-- Selector MÉTODO DE PAGO -->
      <div class="campo-periodo">
        <label for="select-filtro-metodo">MÉTODO DE PAGO</label>
        <div class="select-wrapper">
          <select id="select-filtro-metodo" bind:value={filtro_metodo_pago} on:change={aplicar_filtros}>
            <option value="Todos">Todos los métodos</option>
            <option value="PUE">PUE - Una sola exhibición</option>
            <option value="PPD">PPD - Parcialidades / diferido</option>
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>

      <!-- Selector ESTADO -->
      <div class="campo-periodo">
        <label for="select-filtro-status">ESTADO</label>
        <div class="select-wrapper">
          <select id="select-filtro-status" bind:value={filtro_status} on:change={aplicar_filtros}>
            <option value="Todos">Todos los estados</option>
            <option value="Vigente">Vigentes</option>
            <option value="Cancelada">Canceladas</option>
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>
    </div>

    <!-- Fila Inferior: Buscador Rápido y Botones de Período -->
    <div class="fila-busqueda-avanzada">
      <div class="buscador-caja flex-1">
        <i class="material-icons icono-buscar">search</i>
        <input
          type="text"
          class="input-buscar"
          placeholder="Buscar rápido por folio (ej. F-10), UUID, cliente o RFC..."
          bind:value={buscar}
          on:input={al_escribir_buscar}
        />
        {#if buscar}
          <button class="btn-limpiar-busqueda" on:click={() => { buscar = ""; aplicar_filtros(); }}>
            <i class="material-icons">close</i>
          </button>
        {/if}
      </div>

      <button class="btn-secundario btn-sm" on:click={limpiar_filtros} title="Restablecer filtros al mes en curso">
        <i class="material-icons">replay</i>
        Mes en Curso
      </button>

      {#if filtro_mes !== "Todos" || filtro_anio !== "Todos" || filtro_status !== "Todos" || filtro_metodo_pago !== "Todos" || buscar}
        <button class="btn-secundario btn-sm" on:click={ver_todas_las_facturas} title="Consultar todo el historial sin filtro de período">
          <i class="material-icons">all_inclusive</i>
          Ver Todo el Historial
        </button>
      {/if}
    </div>
  </div>

  <!-- Tabla de Facturas Emitidas -->
  <div class="card">
    {#if cargando}
      <div class="caja-vacia">
        <i class="material-icons icono-girando">sync</i>
        <p>Consultando facturas emitidas...</p>
      </div>
    {:else if facturas.length === 0}
      <div class="caja-vacia">
        <i class="material-icons icono-vacio">find_in_page</i>
        <p>No se encontraron facturas emitidas con los criterios indicados.</p>
        <button class="btn-secundario btn-sm mt-2" on:click={ver_todas_las_facturas}>Ver todas las facturas (sin filtro de período)</button>
      </div>
    {:else}
      <div class="tabla-scroll">
        <table class="tabla-facturas">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Serie / Folio</th>
              <th>Receptor (Cliente)</th>
              <th>UUID Fiscal</th>
              <th class="der">Total</th>
              <th>Método / Pago</th>
              <th>Estado</th>
              <th>Comprobante</th>
              <th class="der">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each facturas as factura (factura._id || factura.uuid)}
              <tr class:cancelada={factura.status === "Cancelada"}>
                <td>{fecha_legible(factura.fecha_emision)}</td>
                <td>
                  <span class="folio-texto font-bold">{factura.serie}-{factura.folio}</span>
                  {#if factura.folio_pedido}
                    <small class="badge-pedido">Ped. #{factura.folio_pedido}</small>
                  {/if}
                </td>
                <td>
                  <span class="cliente-nombre font-bold">{factura.receptor.nombre}</span>
                  <small class="cliente-rfc">{factura.receptor.rfc}</small>
                </td>
                <td class="celda-uuid">
                  <span class="uuid-chip" title={factura.uuid} on:click={() => copiarTexto(factura.uuid)}>
                    {factura.uuid}
                    <i class="material-icons icono-copiar">content_copy</i>
                  </span>
                </td>
                <td class="der font-mono font-bold">
                  {dinero(factura.total)}
                </td>
                <td>
                  <span class="chip-metodo" class:ppd={factura.metodo_pago === "PPD"}>
                    {factura.metodo_pago || "PUE"}
                  </span>
                  {#if factura.metodo_pago === "PPD" && factura.saldo_pendiente > 0}
                    <small class="saldo-restante">Saldo: {dinero(factura.saldo_pendiente)}</small>
                  {/if}
                </td>
                <td>
                  {#if factura.status === "Vigente"}
                    <span class="badge-estado vigente">
                      <i class="material-icons">check_circle</i>
                      Vigente
                    </span>
                  {:else}
                    <span
                      class="badge-estado cancelado"
                      title={`Cancelada el ${fecha_legible(factura.fecha_cancelacion)}. Motivo: ${factura.motivo_cancelacion || "SAT"}`}
                    >
                      <i class="material-icons">cancel</i>
                      Cancelada
                    </span>
                  {/if}
                </td>
                <td>
                  <div class="descargas">
                    <a
                      class="btn-archivo pdf"
                      title="Descargar PDF oficial"
                      href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(factura.uuid)}&tipo=pdf`}
                      target="_blank"
                    >
                      <i class="material-icons">picture_as_pdf</i>
                      PDF
                    </a>
                    <a
                      class="btn-archivo xml"
                      title="Descargar XML timbrado"
                      href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(factura.uuid)}&tipo=xml`}
                      target="_blank"
                    >
                      <i class="material-icons">code</i>
                      XML
                    </a>
                  </div>
                </td>
                <td class="der">
                  {#if factura.status === "Vigente"}
                    <button
                      class="btn-accion-cancelar"
                      title="Cancelar factura ante el SAT"
                      on:click={() => abrir_modal_cancelar(factura)}
                    >
                      <i class="material-icons">block</i>
                      Cancelar
                    </button>
                  {:else}
                    <span class="nota-cancelada" title={`Motivo: ${factura.motivo_cancelacion || "-"}`}>
                      <i class="material-icons">info_outline</i>
                      Cancelada
                    </span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Barra de Paginación -->
      <div class="paginacion-barra">
        <div class="paginacion-info">
          Mostrando página <b>{pagina_actual}</b> de <b>{total_paginas}</b> ({total_registros} facturas)
        </div>
        <div class="paginacion-controles">
          <Paginacion bind:total_paginas bind:ha_cambiado_pagina_actual bind:pagina_actual />
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Modal de Cancelación SAT -->
{#if modal_cancelar_abierto && factura_a_cancelar}
  <div class="modal-overlay" on:click={cerrar_modal_cancelar}>
    <div class="modal-card" on:click|stopPropagation>
      <div class="modal-header">
        <div class="modal-titulo">
          <i class="material-icons icono-alerta-rojo">warning</i>
          <h3>Solicitar Cancelación de Factura Fiscal</h3>
        </div>
        <button class="btn-cerrar" on:click={cerrar_modal_cancelar}>
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-body">
        <div class="factura-resumen-box">
          <div class="resumen-fila">
            <span>Factura:</span>
            <b>{factura_a_cancelar.serie}-{factura_a_cancelar.folio}</b>
          </div>
          <div class="resumen-fila">
            <span>UUID Fiscal:</span>
            <span class="font-mono text-xs">{factura_a_cancelar.uuid}</span>
          </div>
          <div class="resumen-fila">
            <span>Receptor:</span>
            <span>{factura_a_cancelar.receptor.nombre} ({factura_a_cancelar.receptor.rfc})</span>
          </div>
          <div class="resumen-fila">
            <span>Monto Total:</span>
            <b class="text-verde">{dinero(factura_a_cancelar.total)} ({factura_a_cancelar.moneda})</b>
          </div>
        </div>

        <div class="campo mt-3">
          <label for="select-motivo-sat">Motivo de Cancelación (Catálogo SAT CFDI 4.0)</label>
          <select id="select-motivo-sat" bind:value={motivo_cancelacion}>
            {#each MOTIVOS_CANCELACION as m}
              <option value={m.clave}>{m.descripcion}</option>
            {/each}
          </select>
        </div>

        {#if motivo_cancelacion === "01"}
          <div class="campo mt-3">
            <label for="input-uuid-sust">UUID de la Factura que Sustituye (Requerido para motivo 01)</label>
            <input
              id="input-uuid-sust"
              type="text"
              placeholder="Ej. 1083F0C1-DD20-4FA1-953A-DD732DB3E398"
              maxlength="36"
              bind:value={uuid_sustitucion}
            />
            <small class="text-gris">Ingresa el UUID de la nueva factura que reemplaza a la que vas a cancelar.</small>
          </div>
        {/if}

        <div class="aviso-peligro mt-3">
          <i class="material-icons">info</i>
          <div>
            <b>Aviso Importante:</b>
            <p>Esta acción cancelará el CFDI ante el SAT y marcará la venta como cancelada. Si la factura es PPD, asegúrate de no tener complementos de pago asociados.</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secundario" on:click={cerrar_modal_cancelar} disabled={cancelando}>
          Volver
        </button>
        <button class="btn-peligro" on:click={confirmar_cancelacion} disabled={cancelando}>
          <i class="material-icons">check</i>
          {cancelando ? "Cancelando..." : "Confirmar Cancelación SAT"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Tarjeta de Filtros de Búsqueda (Diseño Referencia CUCC / Xenon) */
  .card-filtros-principal {
    background: #ffffff;
    border-radius: 16px;
    padding: 22px 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .filtros-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }

  .icono-filtro-naranja {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #fff7ed;
    border: 1px solid #ffedd5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ea580c;
  }
  .icono-filtro-naranja i {
    font-size: 26px;
  }

  .titulo-filtros {
    margin: 0;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: #0f172a;
    text-transform: uppercase;
  }

  .grid-filtros-periodo {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    align-items: flex-end;
  }

  .campo-periodo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .campo-periodo label {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .select-wrapper select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 16px;
    padding: 12px 38px 12px 18px;
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
  }

  .select-wrapper select:hover {
    border-color: #cbd5e1;
    background: #ffffff;
  }

  .select-wrapper select:focus {
    border-color: #0284c7;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  }

  /* Borde turquesa suave de la imagen de referencia para MES */
  .select-wrapper.select-destacado select {
    border-color: #99f6e4;
    background: #f0fdfa;
  }
  .select-wrapper.select-destacado select:hover,
  .select-wrapper.select-destacado select:focus {
    border-color: #2dd4bf;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.2);
  }

  .chevron-naranja {
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: #ea580c;
    font-size: 22px;
    font-weight: bold;
  }

  .fila-busqueda-avanzada {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }

  .contenedor {
    padding: 24px;
    max-width: 1300px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
  }

  /* Encabezado */
  .encabezado {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #fff;
    padding: 22px 28px;
    border-radius: 14px;
    margin-bottom: 20px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  }
  .titulo-area { display: flex; align-items: center; gap: 16px; }
  .icono-badge {
    background: rgba(56, 189, 248, 0.18);
    color: #38bdf8;
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icono-badge i { font-size: 30px; }
  h1 { margin: 0; font-size: 23px; font-weight: 700; }
  h3 { margin: 0; font-size: 16px; font-weight: 700; }
  p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  .header-acciones { display: flex; gap: 10px; }

  /* Métricas Rápidas */
  .metricas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
    margin-bottom: 20px;
  }
  .metrica-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }
  .metrica-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.03em; }
  .metrica-valor { font-size: 20px; font-weight: 800; color: #0f172a; font-family: monospace; }
  .text-verde { color: #16a34a; }
  .text-rojo { color: #dc2626; }
  .text-azul { color: #0284c7; }

  /* Card */
  .card {
    background: #ffffff;
    border-radius: 14px;
    padding: 22px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  }
  .mb-4 { margin-bottom: 20px; }
  .mt-2 { margin-top: 10px; }
  .mt-3 { margin-top: 14px; }
  .flex-1 { flex: 1; }

  /* Filtros */
  .card-filtros { padding: 16px 20px; }
  .filtros-principales {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .buscador-caja {
    position: relative;
    min-width: 280px;
  }
  .icono-buscar {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 20px;
  }
  .input-buscar {
    width: 100%;
    padding: 10px 38px 10px 40px;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    font-size: 13px;
    box-sizing: border-box;
    transition: all 0.2s;
  }
  .input-buscar:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  }
  .btn-limpiar-busqueda {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 2px;
    display: flex;
  }
  .btn-limpiar-busqueda i { font-size: 16px; }

  .selector-estado {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #475569;
    font-weight: 600;
  }
  .selector-estado select {
    padding: 9px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
    cursor: pointer;
  }

  .panel-filtros-avanzados {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }
  .filtros-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
  }
  .campo-filtro {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .campo-filtro label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }
  .campo-filtro input,
  .campo-filtro select {
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    font-size: 13px;
    background: #ffffff;
    box-sizing: border-box;
    width: 100%;
  }
  .campo-filtro input:focus,
  .campo-filtro select:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
  }
  .metrica-subtexto {
    font-size: 11px;
    color: #0284c7;
    font-weight: 600;
  }
  .acciones-filtros {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 14px;
  }

  /* Botones Generales */
  .btn-primario {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primario:hover:not(:disabled) { background: #0369a1; }
  .btn-secundario {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-secundario:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
  .btn-activo { background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  /* Tabla */
  .tabla-scroll {
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }
  .tabla-facturas {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .tabla-facturas th {
    background: #f8fafc;
    padding: 11px 12px;
    border-bottom: 2px solid #e2e8f0;
    text-align: left;
    font-weight: 700;
    color: #475569;
    font-size: 12px;
    white-space: nowrap;
  }
  .tabla-facturas td {
    padding: 11px 12px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  .tabla-facturas tr:hover { background: #f8fafc; }
  .cancelada { background: #fffafb; opacity: 0.75; }

  .folio-texto { font-size: 13px; color: #0f172a; }
  .badge-pedido {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    margin-left: 4px;
  }
  .cliente-nombre { display: block; color: #0f172a; font-size: 13px; }
  .cliente-rfc { display: block; color: #64748b; font-size: 11px; font-family: monospace; }

  .celda-uuid { max-width: 220px; }
  .uuid-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: monospace;
    font-size: 11px;
    color: #475569;
    background: #f1f5f9;
    padding: 3px 6px;
    border-radius: 5px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
  .uuid-chip:hover { color: #0284c7; background: #e0f2fe; }
  .icono-copiar { font-size: 13px; }

  .chip-metodo {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    background: #f1f5f9;
    color: #475569;
  }
  .chip-metodo.ppd { background: #fef3c7; color: #92400e; }
  .saldo-restante { display: block; font-size: 11px; color: #b91c1c; font-family: monospace; font-weight: 600; }

  /* Estados */
  .badge-estado {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .badge-estado i { font-size: 14px; }
  .badge-estado.vigente { background: #dcfce7; color: #15803d; }
  .badge-estado.cancelado { background: #fee2e2; color: #b91c1c; }

  /* Descargas */
  .descargas { display: flex; gap: 6px; }
  .btn-archivo {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s;
  }
  .btn-archivo i { font-size: 14px; }
  .btn-archivo.pdf { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .btn-archivo.pdf:hover { background: #fee2e2; }
  .btn-archivo.xml { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .btn-archivo.xml:hover { background: #dcfce7; }

  /* Acciones */
  .btn-accion-cancelar {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-accion-cancelar:hover { background: #fca5a5; color: #991b1b; }
  .btn-accion-cancelar i { font-size: 14px; }
  .nota-cancelada {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #94a3b8;
  }
  .nota-cancelada i { font-size: 14px; }

  /* Paginación */
  .paginacion-barra {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .paginacion-info { font-size: 13px; color: #64748b; }

  /* Estados vacíos */
  .caja-vacia { text-align: center; padding: 48px 20px; color: #64748b; }
  .icono-vacio { font-size: 48px; color: #cbd5e1; margin-bottom: 8px; }
  .icono-girando { font-size: 36px; animation: girar 1s linear infinite; color: #0284c7; }
  @keyframes girar { 100% { transform: rotate(360deg); } }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }
  .modal-card {
    background: #ffffff;
    width: 100%;
    max-width: 540px;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    overflow: hidden;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .modal-titulo { display: flex; align-items: center; gap: 10px; }
  .icono-alerta-rojo { color: #dc2626; font-size: 24px; }
  .btn-cerrar { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; }
  .btn-cerrar:hover { color: #0f172a; }

  .modal-body { padding: 20px; }
  .factura-resumen-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }
  .resumen-fila { display: flex; justify-content: space-between; align-items: center; }

  .campo { display: flex; flex-direction: column; gap: 5px; }
  .campo label { font-size: 12px; font-weight: 700; color: #334155; }
  .campo select, .campo input {
    padding: 9px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 13px;
  }

  .aviso-peligro {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #fff1f2;
    border: 1px solid #fecdd3;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    color: #9f1239;
  }
  .aviso-peligro i { font-size: 18px; color: #e11d48; margin-top: 2px; }
  .aviso-peligro p { margin: 2px 0 0 0; color: #9f1239; }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }
  .btn-peligro {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #dc2626;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
  }
  .btn-peligro:hover:not(:disabled) { background: #b91c1c; }
  .btn-peligro:disabled { opacity: 0.5; cursor: not-allowed; }

  .der { text-align: right; }
  .font-bold { font-weight: 700; }
  .font-mono { font-family: monospace; }
  .text-xs { font-size: 11px; }
  .text-gris { color: #64748b; font-size: 11px; }
</style>
