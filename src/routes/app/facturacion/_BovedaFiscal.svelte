<script context="module">
  // Permisos de escritura de la sesión de CoreCFDI. No hay forma de consultarlos: tras un 403 se
  // ocultan los botones correspondientes en todos los expedientes que se abran después.
  const sin_permiso = { crear: false, eliminar: false };
</script>

<script>
  // Panel lateral con el expediente de un CFDI en la Bóveda Fiscal de CoreCFDI.
  // Los comentarios y adjuntos son documentación interna: no cambian el CFDI ni registran pagos.
  import { onMount, createEventDispatcher } from "svelte";
  import { postData, mensajes_app } from "../../stores";
  import { nombreDeContentDisposition } from "../../../services/corecfdi/boveda.js";
  import {
    TIPOS_DOCUMENTO,
    MAX_COMENTARIO,
    EXTENSIONES_PERMITIDAS,
    montoMoneda,
    fechaFactura,
    fechaHoraLocal,
    resumenPagos,
    estadoComentario,
    errorDeArchivo,
    tamanoLegible,
    tieneVistaPrevia,
    mensajeDeError,
    mensajeDeDescarga,
    cicloDeVida,
    semaforoFiscal
  } from "../../../services/corecfdi/bovedaVista.js";

  export let id;
  // "recibida" o "emitida": según el listado desde el que se abrió (solo cambia textos).
  export let origen = "recibida";

  const RUTA = "/app/facturacion/boveda";
  const RUTA_ARCHIVO = "/app/facturacion/boveda-archivo";
  const dispatch = createEventDispatcher();

  let cargando = true;
  let error = "";
  let exp = null;
  let puede_crear = !sin_permiso.crear;
  let puede_eliminar = !sin_permiso.eliminar;

  let comentario = "";
  let comentando = false;
  let error_comentario = "";

  let tipo_documento = "";
  let archivo = null;
  let input_archivo;
  let subiendo = false;
  let errores_subida = {};

  let eliminando = {};
  let descargando = {};

  onMount(() => cargar(false));

  function avisar(tipo, mensaje) {
    $mensajes_app.push({ tipo, mensaje });
    $mensajes_app = $mensajes_app;
  }

  // Devuelve true si la respuesta se atendió como error general (sesión, permisos).
  function revisar_sesion(res) {
    if (res.tipo === "sesion") {
      dispatch("sesion");
      return true;
    }
    return false;
  }

  async function cargar(actualizar) {
    cargando = true;
    try {
      const res = await postData(RUTA, { accion: "expediente", id, actualizar });
      if (res.ok) {
        exp = res;
        error = "";
      } else if (!revisar_sesion(res)) {
        error = mensajeDeError(res, "No se pudo consultar el expediente.");
      }
    } catch (err) {
      error = "No se pudo consultar el expediente.";
    } finally {
      cargando = false;
    }
  }

  function sin_permiso_de(clave, res) {
    if (res.tipo !== "prohibido") return;
    sin_permiso[clave] = true;
    if (clave === "crear") puede_crear = false;
    if (clave === "eliminar") puede_eliminar = false;
  }

  // No es idempotente: ante cualquier error se muestra y el usuario decide si vuelve a enviar.
  async function comentar() {
    if (!estado_comentario.valido || comentando) return;
    comentando = true;
    error_comentario = "";
    try {
      const res = await postData(RUTA, { accion: "comentario", id, comentario });
      if (res.ok) {
        exp = { ...exp, comentarios: res.comentarios, eventos: res.eventos };
        comentario = "";
      } else if (!revisar_sesion(res)) {
        sin_permiso_de("crear", res);
        error_comentario = mensajeDeError(res, "No se pudo guardar el comentario.");
      }
    } catch (err) {
      error_comentario = "No se pudo guardar el comentario. Revise la bitácora antes de volver a enviarlo.";
    } finally {
      comentando = false;
    }
  }

  function elegir_archivo(evento) {
    archivo = evento.target.files && evento.target.files[0] ? evento.target.files[0] : null;
    errores_subida = archivo && errorDeArchivo(archivo) ? { archivo: [errorDeArchivo(archivo)] } : {};
  }

  async function subir() {
    const problema_archivo = errorDeArchivo(archivo);
    errores_subida = {};
    if (!tipo_documento) errores_subida.tipo_documento = ["Seleccione el tipo de documento."];
    if (problema_archivo) errores_subida.archivo = [problema_archivo];
    if (Object.keys(errores_subida).length > 0 || subiendo) return;

    subiendo = true;
    try {
      const params = new URLSearchParams({ id: String(id), tipo_documento, nombre: archivo.name });
      const respuesta = await fetch(`${RUTA_ARCHIVO}?${params}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/octet-stream", "X-Tipo-Archivo": archivo.type || "application/octet-stream" },
        body: archivo
      });
      const res = await respuesta.json();
      if (res.ok) {
        exp = { ...exp, adjuntos: res.adjuntos, eventos: res.eventos };
        if (res.recuperado) avisar("exito", "CoreCFDI tardó en responder, pero el archivo sí quedó guardado.");
        archivo = null;
        tipo_documento = "";
        if (input_archivo) input_archivo.value = "";
      } else if (!revisar_sesion(res)) {
        sin_permiso_de("crear", res);
        errores_subida = res.errors || { general: [mensajeDeError(res, "No se pudo subir el archivo.")] };
      }
    } catch (err) {
      errores_subida = { general: ["No se pudo subir el archivo. Actualice el expediente para revisar si quedó guardado antes de reintentar."] };
    } finally {
      subiendo = false;
    }
  }

  async function eliminar(adjunto) {
    if (!window.confirm(`¿Eliminar definitivamente "${adjunto.nombreArchivo}"? Esta acción no se puede deshacer.`)) return;
    eliminando = { ...eliminando, [adjunto.id]: true };
    try {
      const res = await postData(RUTA, { accion: "eliminar", id_adjunto: adjunto.id, id });
      if (res.ok && res.yaNoExistia) {
        // Ya no existía: se quita de la pantalla y se vuelve a pedir el expediente.
        exp = { ...exp, adjuntos: exp.adjuntos.filter((a) => a.id !== adjunto.id) };
        cargar(true);
      } else if (res.ok) {
        exp = { ...exp, adjuntos: res.adjuntos, eventos: res.eventos };
      } else if (!revisar_sesion(res)) {
        sin_permiso_de("eliminar", res);
        avisar("error", mensajeDeError(res, "No se pudo eliminar el archivo."));
      }
    } catch (err) {
      avisar("error", "No se pudo eliminar el archivo.");
    } finally {
      eliminando = { ...eliminando, [adjunto.id]: false };
    }
  }

  // El archivo se pide a este sistema (que lo trae de CoreCFDI con el token) y se entrega como blob.
  async function abrir_archivo(clave, consulta, en_linea, nombre_respaldo, es_cfdi = false) {
    // La ventana se abre antes de la petición para que el navegador no la bloquee.
    const ventana = en_linea ? window.open("", "_blank") : null;
    descargando = { ...descargando, [clave]: true };
    try {
      const respuesta = await fetch(`${RUTA_ARCHIVO}?${new URLSearchParams(consulta)}`, { credentials: "same-origin" });
      if (!respuesta.ok) {
        const res = await respuesta.json().catch(() => ({}));
        if (ventana) ventana.close();
        if (!revisar_sesion(res)) avisar("error", mensajeDeDescarga({ ...res, status: res.status || respuesta.status }, { esCfdi: es_cfdi }));
        return;
      }
      const disposicion = respuesta.headers.get("content-disposition") || "";
      const nombre = nombreDeContentDisposition(disposicion) || nombre_respaldo;
      const contenido = await respuesta.blob();
      if (ventana && /^inline/i.test(disposicion)) {
        const url = URL.createObjectURL(contenido);
        ventana.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
        return;
      }
      if (ventana) ventana.close();
      // Como octet-stream: el navegador solo lo guarda, no lo interpreta.
      const url = URL.createObjectURL(new Blob([contenido], { type: "application/octet-stream" }));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10 * 1000);
    } catch (err) {
      if (ventana) ventana.close();
      avisar("error", "No se pudo descargar el archivo.");
    } finally {
      descargando = { ...descargando, [clave]: false };
    }
  }

  function abrir_adjunto(adjunto, en_linea) {
    const consulta = en_linea ? { adjunto: adjunto.id, inline: 1 } : { adjunto: adjunto.id };
    abrir_archivo(`adjunto-${adjunto.id}-${en_linea ? "ver" : "bajar"}`, consulta, en_linea, adjunto.nombreArchivo);
  }

  function abrir_cfdi(tipo) {
    const uuid = exp.factura.uuid;
    abrir_archivo(`cfdi-${tipo}`, { uuid, tipo }, false, `${uuid}.${tipo}`, true);
  }

  function clase_estado(estado) {
    if (estado === "vigente") return "estado_vigente";
    if (estado === "cancelado") return "estado_cancelado";
    return "estado_desconocido";
  }

  function icono_evento(evento) {
    if (evento === "Comentario Agregado") return "chat";
    if (evento === "Documento Adjuntado") return "attach_file";
    if (evento === "Documento Eliminado") return "delete";
    if (evento === "Factura Importada") return "cloud_download";
    if (evento === "Conversión a PDF") return "picture_as_pdf";
    if (/cancelad/i.test(evento)) return "block";
    return "radio_button_checked";
  }

  $: estado_comentario = estadoComentario(comentario, MAX_COMENTARIO);
  $: resumen = exp ? resumenPagos(exp.pagos) : null;
  $: moneda = exp ? exp.factura.moneda : "MXN";
  // Se recalculan con las listas que devuelve cada escritura, sin volver a pedir el expediente.
  $: semaforo = exp ? semaforoFiscal(exp, origen) : null;
  $: hitos = exp ? cicloDeVida(exp, origen) : [];

  const ICONOS_HITO = {
    emitida: "receipt",
    importada: "cloud_download",
    validacion_sat: "verified_user",
    pdf: "picture_as_pdf",
    pagada_pue: "attach_money",
    pago_ppd: "account_balance_wallet",
    cancelada: "block"
  };
  const ICONOS_SEMAFORO = { riesgo: "error", incompleto: "info", completo: "check_circle" };
  const aceptar = EXTENSIONES_PERMITIDAS.map((e) => "." + e).join(",");
</script>

<div class="fondo" on:click={() => dispatch("cerrar")}></div>
<aside class="panel" role="dialog" aria-label="Bóveda Fiscal">
  <header class="cabecera">
    <div class="titulo">
      <i class="material-icons">inventory_2</i>
      <div>
        <h2>Bóveda Fiscal</h2>
        <small>Expediente del CFDI en CoreCFDI</small>
      </div>
    </div>
    <div class="cabecera_acciones">
      <button class="btn btn_secundario" on:click={() => cargar(true)} disabled={cargando}>
        <i class="material-icons">refresh</i> Actualizar
      </button>
      <button class="cerrar" on:click={() => dispatch("cerrar")} aria-label="Cerrar"><i class="material-icons">close</i></button>
    </div>
  </header>

  <div class="contenido">
    {#if cargando && !exp}
      <p class="estado">Consultando el expediente...</p>
    {:else if error && !exp}
      <div class="alerta alerta_error"><i class="material-icons">error_outline</i><span>{error}</span></div>
    {:else if exp}
      {#if error}
        <div class="alerta alerta_error"><i class="material-icons">error_outline</i><span>{error}</span></div>
      {/if}

      {#if exp.esEfo}
        <div class="alerta alerta_efo">
          <i class="material-icons">report</i>
          <span>
            <strong>Emisor en la lista 69-B del SAT (EFOS){exp.efoSituacion ? `: ${exp.efoSituacion}` : ""}.</strong>
            Revise la materialidad de la operación antes de deducir esta factura.
          </span>
        </div>
      {/if}

      <section class="seccion">
        <div class="encabezado_factura">
          <div>
            <small>Emisor</small>
            <strong>{exp.factura.emisor.nombre || ""}</strong>
            <span>{exp.factura.emisor.rfc || ""}</span>
          </div>
          <div>
            <small>Receptor</small>
            <strong>{exp.factura.receptor.nombre || ""}</strong>
            <span>{exp.factura.receptor.rfc || ""}</span>
          </div>
        </div>
        <dl class="datos">
          <div><dt>Folio</dt><dd>{exp.factura.folio || ""}</dd></div>
          <div class="ancho"><dt>UUID</dt><dd class="uuid">{exp.factura.uuid || ""}</dd></div>
          <div><dt>Fecha</dt><dd>{fechaFactura(exp.factura.fecha, exp.factura.hora)}</dd></div>
          <div><dt>Total</dt><dd>{montoMoneda(exp.factura.total, moneda)}</dd></div>
          <div><dt>Moneda</dt><dd>{moneda}</dd></div>
          <div><dt>Tipo</dt><dd>{exp.factura.tipoComprobante}{exp.factura.metodoPago ? ` · ${exp.factura.metodoPago}` : ""}</dd></div>
          <div><dt>Estatus</dt><dd><span class={"badge " + clase_estado(exp.factura.estado)}>{exp.factura.estado || ""}</span></dd></div>
        </dl>
        <div class="botones_cfdi">
          <!-- Siempre activos: has_xml / has_pdf son indicativos y pueden venir en false aunque el archivo exista. -->
          <button class="btn btn_secundario" disabled={descargando["cfdi-xml"]} on:click={() => abrir_cfdi("xml")}>
            <i class="material-icons">code</i> XML
          </button>
          <button class="btn btn_secundario" disabled={descargando["cfdi-pdf"]} on:click={() => abrir_cfdi("pdf")}>
            <i class="material-icons">picture_as_pdf</i> PDF
          </button>
        </div>
      </section>

      <section class="seccion">
        <div class={"semaforo semaforo_" + semaforo.estado}>
          <strong>{semaforo.titulo}</strong>
          <ul>
            {#each semaforo.detalles as detalle}
              <li><i class="material-icons">{ICONOS_SEMAFORO[semaforo.estado]}</i><span>{detalle}</span></li>
            {/each}
          </ul>
        </div>
        <p class="nota">Calificación automática con la información disponible en CoreCFDI.</p>

        <h3>Ciclo de vida del CFDI</h3>
        <ol class="ciclo">
          {#each hitos as hito (hito.clave)}
            <li class={"tono_" + (hito.completado ? hito.tono : "neutro")}>
              <i class="material-icons">{ICONOS_HITO[hito.clave] || "radio_button_checked"}</i>
              <div>
                <strong>{hito.titulo}</strong>
                <p>{hito.descripcion}</p>
                {#if hito.pagos && hito.pagos.length > 0}
                  <ul class="pagos_hito">
                    {#each hito.pagos as pago}
                      <li class:cancelado={pago.cancelado}>
                        {pago.folio || "REP"} · {montoMoneda(pago.monto, moneda)} · {fechaFactura(pago.fecha)} · {pago.cancelado ? "cancelado" : pago.estado || ""}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      </section>

      <section class="seccion">
        <h3>Pagos</h3>
        <div class="tarjetas">
          <div class="tarjeta"><small>Total</small><strong>{montoMoneda(exp.factura.total, moneda)}</strong></div>
          <div class="tarjeta"><small>Pagado</small><strong>{montoMoneda(exp.totalPagado, moneda)}</strong></div>
          <div class="tarjeta"><small>Saldo</small><strong>{montoMoneda(exp.saldoPendiente, moneda)}</strong></div>
        </div>
        <p class="nota">Según los complementos de pago (REP) descargados del SAT. Para el saldo de cartera consulte Cuentas por pagar / por cobrar.</p>
        {#if resumen.pagos.length === 0}
          <p class="vacio">Sin pagos relacionados.</p>
        {:else}
          <div class="tabla_scroll">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Folio</th><th>UUID</th><th class="derecha">Monto</th><th>Estatus</th></tr>
              </thead>
              <tbody>
                {#each resumen.pagos as pago}
                  <tr class:cancelado={pago.cancelado}>
                    <td>{fechaFactura(pago.fecha)}</td>
                    <td>{pago.folio || ""}</td>
                    <td class="uuid" title={pago.uuid || ""}>{pago.uuid || ""}</td>
                    <td class="derecha monto">{montoMoneda(pago.monto, moneda)}</td>
                    <td>
                      <span class={"badge " + clase_estado(pago.cancelado ? "cancelado" : pago.estado)}>{pago.cancelado ? "cancelado" : pago.estado || ""}</span>
                      {#if pago.fechaCancelacion}<small>{fechaFactura(pago.fechaCancelacion)} · no suma</small>{/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <section class="seccion">
        <h3>Bitácora</h3>
        {#if puede_crear}
          <div class="caja_comentario">
            <textarea rows="3" maxlength={MAX_COMENTARIO + 200} placeholder="Ej. Validada por contabilidad" bind:value={comentario} disabled={comentando}></textarea>
            <div class="pie_comentario">
              <small class:excedido={estado_comentario.restantes < 0}>{estado_comentario.longitud} / {MAX_COMENTARIO}</small>
              <button class="btn" on:click={comentar} disabled={!estado_comentario.valido || comentando}>{comentando ? "Guardando..." : "Agregar comentario"}</button>
            </div>
            {#if estado_comentario.error}<small class="error_campo">{estado_comentario.error}</small>{/if}
            {#if error_comentario}<small class="error_campo">{error_comentario}</small>{/if}
          </div>
        {/if}
        {#if exp.comentarios.length === 0}
          <p class="vacio">Sin comentarios.</p>
        {:else}
          <ul class="comentarios">
            {#each exp.comentarios as c (c.id)}
              <li>
                <p>{c.comentario}</p>
                <small>{c.usuario || ""} · {fechaHoraLocal(c.creadoEn)}</small>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <section class="seccion">
        <h3>Documentos adjuntos</h3>
        {#if puede_crear}
          <div class="subida">
            <div class="campo">
              <label>Tipo de documento</label>
              <select bind:value={tipo_documento} disabled={subiendo}>
                <option value="">Seleccione...</option>
                {#each TIPOS_DOCUMENTO as tipo}<option value={tipo}>{tipo}</option>{/each}
              </select>
              {#if errores_subida.tipo_documento}<small class="error_campo">{errores_subida.tipo_documento[0]}</small>{/if}
            </div>
            <div class="campo campo_archivo">
              <label>Archivo (máx. 10 MB)</label>
              <input type="file" accept={aceptar} bind:this={input_archivo} on:change={elegir_archivo} disabled={subiendo} />
              {#if archivo && !errores_subida.archivo}<small>{tamanoLegible(archivo.size)}</small>{/if}
              {#if errores_subida.archivo}<small class="error_campo">{errores_subida.archivo[0]}</small>{/if}
            </div>
            <button class="btn" on:click={subir} disabled={subiendo || !archivo}>{subiendo ? "Subiendo..." : "Subir"}</button>
          </div>
          {#if errores_subida.general}<small class="error_campo">{errores_subida.general[0]}</small>{/if}
        {/if}
        {#if exp.adjuntos.length === 0}
          <p class="vacio">Sin documentos adjuntos.</p>
        {:else}
          <div class="tabla_scroll">
            <table>
              <thead>
                <tr><th>Tipo</th><th>Archivo</th><th>Subido por</th><th></th></tr>
              </thead>
              <tbody>
                {#each exp.adjuntos as adjunto (adjunto.id)}
                  <tr>
                    <td>{adjunto.tipoDocumento}</td>
                    <td class="nombre_archivo" title={adjunto.nombreArchivo}>{adjunto.nombreArchivo}</td>
                    <td>{adjunto.usuario || ""}<small>{fechaHoraLocal(adjunto.creadoEn)}</small></td>
                    <td class="acciones">
                      {#if tieneVistaPrevia(adjunto.nombreArchivo)}
                        <button class="enlace" on:click={() => abrir_adjunto(adjunto, true)} disabled={descargando[`adjunto-${adjunto.id}-ver`]}>Ver</button>
                      {/if}
                      <button class="enlace" on:click={() => abrir_adjunto(adjunto, false)} disabled={descargando[`adjunto-${adjunto.id}-bajar`]}>Descargar</button>
                      {#if puede_eliminar}
                        <button class="enlace peligro" on:click={() => eliminar(adjunto)} disabled={eliminando[adjunto.id]}>Eliminar</button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <section class="seccion">
        <h3>Historial</h3>
        {#if exp.eventos.length === 0}
          <p class="vacio">Sin eventos.</p>
        {:else}
          <ol class="linea_tiempo">
            {#each exp.eventos as evento}
              <li>
                <i class="material-icons">{icono_evento(evento.evento)}</i>
                <div>
                  <strong>{evento.evento}</strong>
                  {#if evento.descripcion}<p>{evento.descripcion}</p>{/if}
                  <small>{evento.usuario || ""} · {fechaHoraLocal(evento.creadoEn)}</small>
                </div>
              </li>
            {/each}
          </ol>
        {/if}
      </section>
    {/if}
  </div>
</aside>

<style>
  .fondo { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); z-index: 1000; }
  .panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(760px, 100vw); background: #f8fafc; z-index: 1001; display: flex; flex-direction: column; box-shadow: -8px 0 24px rgba(15, 23, 42, 0.2); font-family: system-ui, sans-serif; }
  .cabecera { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #1e293b; color: #fff; padding: 16px 20px; }
  .titulo { display: flex; align-items: center; gap: 12px; }
  .titulo i { font-size: 30px; color: #38bdf8; }
  h2 { margin: 0; font-size: 18px; }
  .titulo small { color: #94a3b8; font-size: 12px; }
  .cabecera_acciones { display: flex; align-items: center; gap: 8px; }
  .cerrar { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; }
  .contenido { overflow-y: auto; padding: 16px 20px 32px; }
  .seccion { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
  h3 { margin: 0 0 12px; font-size: 15px; color: #0f172a; }
  .encabezado_factura { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .encabezado_factura > div { display: flex; flex-direction: column; gap: 2px; }
  .encabezado_factura small, dt { color: #64748b; font-size: 12px; }
  .encabezado_factura span { font-size: 13px; color: #334155; }
  .datos { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 0; }
  .datos .ancho { grid-column: 1 / -1; }
  dd { margin: 2px 0 0; font-size: 13px; color: #0f172a; }
  .uuid { font-family: ui-monospace, monospace; font-size: 12px; word-break: break-all; }
  .botones_cfdi { display: flex; gap: 8px; margin-top: 14px; }
  .tarjetas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .tarjeta { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
  .tarjeta small { display: block; color: #64748b; font-size: 12px; }
  .tarjeta strong { font-size: 16px; color: #0f172a; }
  .nota { font-size: 12px; color: #64748b; margin: 8px 0 10px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; background: #1d4ed8; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn i { font-size: 18px; }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn_secundario { background: #e2e8f0; color: #334155; }
  .alerta { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; }
  .alerta_error { background: #fee2e2; color: #991b1b; }
  .alerta_efo { background: #b91c1c; color: #fff; }
  .estado, .vacio { color: #64748b; font-size: 13px; }
  .estado { text-align: center; padding: 36px; }
  .tabla_scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { background: #f8fafc; color: #475569; white-space: nowrap; }
  td small { display: block; color: #64748b; margin-top: 3px; }
  td.uuid { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .derecha { text-align: right; }
  tr.cancelado td { color: #94a3b8; }
  tr.cancelado .monto { text-decoration: line-through; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .estado_vigente { background: #dcfce7; color: #166534; }
  .estado_cancelado { background: #fee2e2; color: #991b1b; }
  .estado_desconocido { background: #f1f5f9; color: #334155; }
  .caja_comentario textarea { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; font-size: 13px; resize: vertical; }
  .pie_comentario { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
  .pie_comentario small { color: #64748b; font-size: 12px; }
  .pie_comentario small.excedido { color: #b91c1c; font-weight: 600; }
  .error_campo { display: block; margin-top: 4px; font-size: 12px; color: #b91c1c; }
  .comentarios { list-style: none; padding: 0; margin: 12px 0 0; }
  .comentarios li { border-left: 3px solid #1d4ed8; padding: 6px 10px; margin-bottom: 8px; background: #f8fafc; border-radius: 0 6px 6px 0; }
  .comentarios p { margin: 0 0 4px; font-size: 13px; white-space: pre-wrap; word-break: break-word; }
  .comentarios small, .linea_tiempo small { color: #64748b; font-size: 12px; }
  .subida { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
  .campo label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 5px; }
  .campo select, .campo input { padding: 7px 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; max-width: 100%; }
  .campo_archivo { flex: 1; min-width: 200px; }
  .campo_archivo small { display: block; color: #64748b; font-size: 12px; margin-top: 3px; }
  .nombre_archivo { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .acciones { white-space: nowrap; }
  .enlace { color: #1d4ed8; background: none; border: none; padding: 0; font-size: 13px; cursor: pointer; margin-right: 10px; }
  .enlace:disabled { opacity: 0.5; cursor: wait; }
  .enlace.peligro { color: #b91c1c; }
  .linea_tiempo { list-style: none; padding: 0; margin: 0; }
  .linea_tiempo li { display: flex; gap: 10px; padding-bottom: 12px; position: relative; }
  .linea_tiempo li:not(:last-child)::before { content: ""; position: absolute; left: 11px; top: 26px; bottom: 0; width: 2px; background: #e2e8f0; }
  .linea_tiempo i { font-size: 18px; color: #1d4ed8; background: #dbeafe; border-radius: 50%; padding: 3px; height: 18px; }
  .linea_tiempo strong { font-size: 13px; color: #0f172a; }
  .linea_tiempo p { margin: 2px 0; font-size: 13px; color: #334155; }
  .semaforo { border-radius: 10px; padding: 12px 14px; border: 1px solid; }
  .semaforo strong { font-size: 14px; }
  .semaforo ul { list-style: none; padding: 0; margin: 8px 0 0; }
  .semaforo li { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; margin-bottom: 4px; }
  .semaforo li i { font-size: 18px; }
  .semaforo_riesgo { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
  .semaforo_incompleto { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
  .semaforo_completo { background: #dcfce7; border-color: #86efac; color: #166534; }
  .ciclo { list-style: none; padding: 0; margin: 0; }
  .ciclo > li { display: flex; gap: 10px; padding-bottom: 14px; position: relative; }
  .ciclo > li:not(:last-child)::before { content: ""; position: absolute; left: 14px; top: 32px; bottom: 0; width: 2px; background: #e2e8f0; }
  .ciclo > li > i { font-size: 18px; border-radius: 50%; padding: 6px; height: 18px; }
  .ciclo strong { font-size: 13px; color: #0f172a; }
  .ciclo p { margin: 2px 0; font-size: 13px; color: #334155; }
  .tono_ok > i { background: #dcfce7; color: #166534; }
  .tono_pendiente > i { background: #fef3c7; color: #b45309; }
  .tono_alerta > i { background: #fee2e2; color: #b91c1c; }
  .tono_neutro > i { background: #f1f5f9; color: #94a3b8; }
  .tono_neutro strong { color: #64748b; }
  .pagos_hito { list-style: none; padding: 0; margin: 4px 0 0; font-size: 12px; color: #334155; }
  .pagos_hito li.cancelado { color: #b91c1c; text-decoration: line-through; }
  @media (max-width: 600px) {
    .encabezado_factura, .tarjetas { grid-template-columns: 1fr; }
  }
</style>
