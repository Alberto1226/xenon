<script>
  import { onDestroy } from "svelte";
  import { postData, mensajes_app } from "../../../stores";
  import SesionCoreCfdi from "../_SesionCoreCfdi.svelte";

  const RUTA = "/app/facturacion/sat-descargas";
  // CoreCFDI ya verifica las solicitudes pendientes cada 10 minutos: aquí solo se relee el historial.
  const REFRESCO_HISTORIAL_MS = 5 * 60 * 1000;
  const ESTADOS_FINALES = ["descargada", "rechazada", "vencida"];
  const ESTADOS_CONOCIDOS = ["pendiente", "terminada", "descargada", "rechazada", "vencida", "error"];

  let sesion_activa = false;
  let estado = { rfc_emisor: "", fiel: { rfc: "", status: "", valido_hasta: "", fecha_carga: null } };

  // FIEL
  let archivo_cer = "";
  let archivo_key = "";
  let cer_nombre = "";
  let key_nombre = "";
  let pass_fiel = "";
  let subiendo_fiel = false;
  let errores_fiel = {};
  let advertencias_fiel = [];
  let revisando_fiel = true;
  let pedir_fiel = false;

  // Solicitar
  let fecha_inicio = "";
  let fecha_fin = "";
  let tipo_descarga = "ambas";
  let tipo_comprobante = "";
  let solicitando = false;
  let errores_solicitud = {};
  let resultados_solicitud = [];

  // Historial
  let solicitudes = [];
  let pagina = 1;
  let ultima_pagina = 1;
  let total = 0;
  let cargando_historial = false;
  let error_historial = "";
  let verificando = {};
  let resumen_verificacion = null;
  let temporizador = null;

  // Nada se consulta hasta que el usuario tiene sesión en CoreCFDI.
  async function al_iniciar_sesion() {
    solicitudes = [];
    total = 0;
    resumen_verificacion = null;
    resultados_solicitud = [];
    pedir_fiel = false;
    revisando_fiel = true;
    await cargar_estado();
    await cargar_historial(1);
    revisando_fiel = false;
    clearInterval(temporizador);
    temporizador = setInterval(() => cargar_historial(pagina, true), REFRESCO_HISTORIAL_MS);
  }

  onDestroy(() => clearInterval(temporizador));

  $: if (!sesion_activa) clearInterval(temporizador);

  // Si la ruta responde que la sesión de CoreCFDI venció, se vuelve a pedir el inicio de sesión.
  function sesion_vencida(res) {
    if (res && res.tipo === "sesion") {
      sesion_activa = false;
      return true;
    }
    return false;
  }

  function avisar(tipo, mensaje) {
    $mensajes_app.push({ tipo, mensaje });
    $mensajes_app = $mensajes_app;
  }

  async function cargar_estado() {
    try {
      const res = await postData(RUTA + "/estado", {});
      if (res.ok) estado = res;
      else if (!sesion_vencida(res)) avisar("error", res.mensaje);
    } catch (err) {
      avisar("error", "No se pudo consultar el estado de la integración con CoreCFDI.");
    }
  }

  function handle_file_select(event, tipo) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1] || "";
      if (tipo === "cer") {
        archivo_cer = base64;
        cer_nombre = file.name;
      } else {
        archivo_key = base64;
        key_nombre = file.name;
      }
    };
    reader.readAsDataURL(file);
  }

  async function subir_fiel() {
    errores_fiel = {};
    advertencias_fiel = [];
    subiendo_fiel = true;
    try {
      const res = await postData(RUTA + "/fiel", {
        cer_base64: archivo_cer,
        key_base64: archivo_key,
        cer_nombre,
        key_nombre,
        password: pass_fiel
      });
      if (res.ok) {
        estado.fiel = res.fiel;
        advertencias_fiel = res.advertencias || [];
        avisar("exito", res.mensaje);
        // La llave y la contraseña no se conservan en el navegador después de enviarlas.
        archivo_cer = "";
        archivo_key = "";
        cer_nombre = "";
        key_nombre = "";
        pass_fiel = "";
        pedir_fiel = false;
      } else if (!sesion_vencida(res)) {
        errores_fiel = res.errors || {};
        avisar("error", res.mensaje);
      }
    } catch (err) {
      avisar("error", "Error al cargar la FIEL.");
    } finally {
      subiendo_fiel = false;
    }
  }

  async function solicitar() {
    errores_solicitud = {};
    resultados_solicitud = [];
    solicitando = true;
    try {
      const res = await postData(RUTA + "/solicitar", { fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante });
      if (res.resultados) {
        resultados_solicitud = res.resultados;
        if (res.ok) avisar("exito", "Solicitud enviada al SAT. La descarga puede tardar de minutos a varias horas.");
        else avisar("error", "No se pudo crear ninguna solicitud. Revise el detalle.");
        await cargar_historial(1, true);
      } else if (!sesion_vencida(res)) {
        errores_solicitud = res.errors || {};
        avisar("error", res.mensaje);
      }
    } catch (err) {
      avisar("error", "Error al solicitar la descarga.");
    } finally {
      solicitando = false;
    }
  }

  async function cargar_historial(page, silencioso = false) {
    if (cargando_historial) return;
    cargando_historial = true;
    try {
      const res = await postData(RUTA + "/solicitudes", { page });
      if (res.ok) {
        solicitudes = res.items || [];
        pagina = res.page;
        ultima_pagina = res.lastPage;
        total = res.total;
        error_historial = "";
      } else if (!sesion_vencida(res)) {
        error_historial = res.mensaje;
        if (!silencioso) avisar("error", res.mensaje);
      }
    } catch (err) {
      error_historial = "No se pudo consultar el historial de solicitudes.";
    } finally {
      cargando_historial = false;
    }
  }

  async function verificar(solicitud) {
    verificando[solicitud.id] = true;
    verificando = verificando;
    resumen_verificacion = null;
    try {
      const res = await postData(RUTA + "/verificar", { id: solicitud.id });
      if (res.ok) {
        resumen_verificacion = { id: solicitud.id, ...res.resultado };
        if (res.resultado.descargada && !res.resultado.omitida) {
          avisar("exito", `${res.resultado.importadas} facturas importadas, ${res.resultado.actualizadas} actualizadas.`);
        }
      } else if (sesion_vencida(res)) {
        return;
      } else {
        // CoreCFDI avisa que la empresa no tiene FIEL: se vuelve a pedir.
        if (res.datos && res.datos.requiereFiel) pedir_fiel = true;
        avisar("error", res.mensaje);
      }
      await cargar_historial(pagina, true);
    } catch (err) {
      avisar("error", "No se recibió respuesta de la verificación. Consulte el historial en unos minutos.");
    } finally {
      verificando[solicitud.id] = false;
      verificando = verificando;
    }
  }

  // El periodo llega como "YYYY-MM-DD HH:mm:ss" en hora de México: se muestra tal cual, sin zona horaria.
  function periodo_legible(valor) {
    if (!valor) return "—";
    const partes = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?/.exec(valor);
    if (!partes) return valor;
    return `${partes[3]}/${partes[2]}/${partes[1]}${partes[4] ? " " + partes[4] : ""}`;
  }

  // created_at sí viene en UTC: se convierte a la hora local del navegador.
  function fecha_utc_legible(valor) {
    if (!valor) return "—";
    const fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? valor : fecha.toLocaleString("es-MX");
  }

  function fecha_corta(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || "");
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : valor || "—";
  }

  function clase_estado(status) {
    return ESTADOS_CONOCIDOS.includes(status) ? "estado_" + status : "estado_desconocido";
  }

  function tipo_legible(tipo) {
    if (tipo === "emitido" || tipo === "emitidas") return "Emitidas";
    if (tipo === "recibido" || tipo === "recibidas") return "Recibidas";
    return tipo;
  }

  // La FIEL solo se pide si hace falta: no se ha cargado, ya venció o el usuario quiere reemplazarla.
  // Si no hay registro local pero la empresa ya tiene solicitudes ante el SAT, es que ya tiene FIEL
  // (se cargó desde CoreCFDI): sin FIEL el SAT no acepta ninguna.
  $: fiel_vencida = !!estado.fiel.valido_hasta && estado.fiel.valido_hasta.substring(0, 10) < hoy_local();
  $: fiel_cargada = estado.fiel.rfc ? !fiel_vencida : total > 0;
  $: mostrar_form_fiel = pedir_fiel || !fiel_cargada;

  function hoy_local() {
    const hoy = new Date();
    const dos = (n) => String(n).padStart(2, "0");
    return hoy.getFullYear() + "-" + dos(hoy.getMonth() + 1) + "-" + dos(hoy.getDate());
  }

  $: rfc_distinto = estado.fiel.rfc && estado.rfc_emisor && estado.fiel.rfc.toUpperCase() !== estado.rfc_emisor.toUpperCase();
</script>

<svelte:head>
  <title>Core CFDI: Configuración y Descarga - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">cloud_download</i>
      <div>
        <h1>Configuración y descarga SAT</h1>
        <p>Carga de la FIEL y solicitudes de descarga de CFDI a través de CoreCFDI</p>
      </div>
    </div>
  </header>

  <SesionCoreCfdi bind:activa={sesion_activa} on:activa={al_iniciar_sesion}>
  <div class="card">
    <h2>FIEL (e.firma)</h2>
    {#if revisando_fiel}
      <p class="nota">Revisando la FIEL...</p>
    {:else}
    {#if estado.fiel.rfc}
      <div class="datos_fiel">
        <div><small>RFC</small><strong>{estado.fiel.rfc}</strong></div>
        <div><small>Estado</small><strong>{estado.fiel.status || "—"}</strong></div>
        <div><small>Vigente hasta</small><strong>{fecha_corta(estado.fiel.valido_hasta)}</strong></div>
        <div><small>Última carga</small><strong>{fecha_utc_legible(estado.fiel.fecha_carga)}</strong></div>
      </div>
      {#if rfc_distinto}
        <div class="alerta alerta_aviso">
          <i class="material-icons">warning</i>
          <span>El RFC de la FIEL ({estado.fiel.rfc}) no coincide con el RFC del emisor configurado ({estado.rfc_emisor}).</span>
        </div>
      {/if}
      {#if fiel_vencida}
        <div class="alerta alerta_error">
          <i class="material-icons">error_outline</i>
          <span>La FIEL venció el {fecha_corta(estado.fiel.valido_hasta)}. Cargue la FIEL renovada.</span>
        </div>
      {/if}
    {:else if fiel_cargada}
      <div class="alerta alerta_exito">
        <i class="material-icons">check_circle</i>
        <span>La empresa ya tiene una FIEL cargada en CoreCFDI.</span>
      </div>
    {:else}
      <p class="nota">Aún no se ha cargado una FIEL. Sin FIEL el SAT no acepta solicitudes de descarga.</p>
    {/if}

    {#each advertencias_fiel as advertencia}
      <div class="alerta alerta_aviso">
        <i class="material-icons">warning</i>
        <span>{advertencia}</span>
      </div>
    {/each}

    {#if mostrar_form_fiel}
    <div class="form_grid">
      <div class="campo">
        <label>Certificado (.cer)</label>
        <input type="file" accept=".cer" on:change={(e) => handle_file_select(e, "cer")} />
        {#if cer_nombre}<small>{cer_nombre}</small>{/if}
        {#if errores_fiel.cer_file}<small class="error_campo">{errores_fiel.cer_file[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Llave privada (.key)</label>
        <input type="file" accept=".key" on:change={(e) => handle_file_select(e, "key")} />
        {#if key_nombre}<small>{key_nombre}</small>{/if}
        {#if errores_fiel.key_file}<small class="error_campo">{errores_fiel.key_file[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Contraseña de la llave privada</label>
        <input type="password" autocomplete="off" bind:value={pass_fiel} />
        {#if errores_fiel.password}<small class="error_campo">{errores_fiel.password[0]}</small>{/if}
      </div>
    </div>
    <p class="nota">La llave privada y su contraseña se envían a CoreCFDI y no se guardan en este sistema.</p>
    <button class="btn" on:click={subir_fiel} disabled={subiendo_fiel}>
      {subiendo_fiel ? "Cargando FIEL..." : "Cargar FIEL"}
    </button>
    {#if fiel_cargada}
      <button class="btn btn_secundario" on:click={() => (pedir_fiel = false)} disabled={subiendo_fiel}>Cancelar</button>
    {/if}
    {:else}
      <button class="btn btn_secundario" on:click={() => (pedir_fiel = true)}>Reemplazar FIEL</button>
    {/if}
    {/if}
  </div>

  <div class="card">
    <h2>Solicitar descarga</h2>
    <div class="form_grid">
      <div class="campo">
        <label>Fecha inicio</label>
        <input type="date" bind:value={fecha_inicio} />
        {#if errores_solicitud.fecha_inicio}<small class="error_campo">{errores_solicitud.fecha_inicio[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Fecha fin</label>
        <input type="date" bind:value={fecha_fin} />
        {#if errores_solicitud.fecha_fin}<small class="error_campo">{errores_solicitud.fecha_fin[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Tipo de descarga</label>
        <select bind:value={tipo_descarga}>
          <option value="ambas">Emitidas y recibidas</option>
          <option value="emitidas">Emitidas</option>
          <option value="recibidas">Recibidas</option>
        </select>
        {#if errores_solicitud.tipo_descarga}<small class="error_campo">{errores_solicitud.tipo_descarga[0]}</small>{/if}
      </div>
      <div class="campo">
        <label>Tipo de comprobante</label>
        <select bind:value={tipo_comprobante}>
          <option value="">Todos</option>
          <option value="I">I - Ingreso</option>
          <option value="E">E - Egreso</option>
          <option value="P">P - Pago</option>
          <option value="N">N - Nómina</option>
        </select>
        {#if errores_solicitud.tipo_comprobante}<small class="error_campo">{errores_solicitud.tipo_comprobante[0]}</small>{/if}
      </div>
    </div>
    <p class="nota">Las fechas se interpretan en hora del centro de México. Para periodos largos, solicite rangos mensuales.</p>
    <button class="btn" on:click={solicitar} disabled={solicitando}>
      {solicitando ? "Solicitando al SAT..." : "Solicitar descarga"}
    </button>

    {#each resultados_solicitud as resultado}
      <div class="alerta" class:alerta_exito={resultado.ok} class:alerta_error={!resultado.ok}>
        <i class="material-icons">{resultado.ok ? "check_circle" : "error_outline"}</i>
        <span>
          <strong>{tipo_legible(resultado.tipo_descarga)}:</strong>
          {#if resultado.ok}
            solicitud #{resultado.solicitud.id} creada (SAT: {resultado.solicitud.request_id || "—"}).
          {:else}
            {resultado.mensaje}
          {/if}
        </span>
      </div>
    {/each}
  </div>

  <div class="card">
    <div class="card_titulo">
      <h2>Historial de solicitudes</h2>
      <button class="btn btn_secundario" on:click={() => cargar_historial(pagina)} disabled={cargando_historial}>
        {cargando_historial ? "Actualizando..." : "Actualizar"}
      </button>
    </div>

    {#if resumen_verificacion}
      <div class="alerta" class:alerta_exito={resumen_verificacion.descargada} class:alerta_aviso={!resumen_verificacion.descargada}>
        <i class="material-icons">{resumen_verificacion.descargada ? "check_circle" : "info"}</i>
        <span>
          <strong>Solicitud #{resumen_verificacion.id}:</strong>
          {#if resumen_verificacion.omitida}
            ya está en estado "{resumen_verificacion.status}"; no hace falta verificarla. {resumen_verificacion.mensaje || ""}
          {:else if resumen_verificacion.descargada}
            {resumen_verificacion.importadas} facturas importadas, {resumen_verificacion.actualizadas} actualizadas.
            <a href="/app/facturacion/facturas-recibidas">Ver facturas recibidas</a>
          {:else if resumen_verificacion.status === "pendiente"}
            el SAT sigue procesando ({resumen_verificacion.mensaje || "sin mensaje"}). Vuelva a verificar en 5 a 10 minutos.
          {:else if resumen_verificacion.status === "vencida"}
            los paquetes expiraron en el SAT. Haga una solicitud nueva. {resumen_verificacion.mensaje || ""}
          {:else}
            {resumen_verificacion.status}: {resumen_verificacion.mensaje || "sin mensaje"}
          {/if}
        </span>
      </div>
      {#if resumen_verificacion.errores > 0}
        <div class="alerta alerta_aviso">
          <i class="material-icons">warning</i>
          <span>{resumen_verificacion.errores} XML no se pudieron importar.</span>
        </div>
      {/if}
    {/if}

    {#if error_historial}
      <div class="alerta alerta_error">
        <i class="material-icons">error_outline</i>
        <span>{error_historial}</span>
      </div>
    {/if}

    {#if solicitudes.length === 0}
      <p class="estado">{cargando_historial ? "Consultando solicitudes..." : "Aún no hay solicitudes de descarga."}</p>
    {:else}
      <div class="tabla_scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Periodo</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Mensaje del SAT</th>
              <th>Solicitada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each solicitudes as solicitud (solicitud.id)}
              <tr>
                <td>{solicitud.id}</td>
                <td>{periodo_legible(solicitud.fecha_inicio)} — {periodo_legible(solicitud.fecha_fin)}</td>
                <td>{tipo_legible(solicitud.tipo)}</td>
                <td><span class={"badge " + clase_estado(solicitud.status)}>{solicitud.status}</span></td>
                <td class="mensaje_sat">{solicitud.error_msg || "—"}</td>
                <td>{fecha_utc_legible(solicitud.created_at)}</td>
                <td>
                  {#if !ESTADOS_FINALES.includes(solicitud.status)}
                    <button class="btn btn_chico" on:click={() => verificar(solicitud)} disabled={verificando[solicitud.id]}>
                      {verificando[solicitud.id] ? "Verificando..." : "Verificar ahora"}
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="paginacion">
        <button class="btn btn_secundario" on:click={() => cargar_historial(pagina - 1)} disabled={pagina <= 1 || cargando_historial}>Anterior</button>
        <span>Página {pagina} de {ultima_pagina} · {total} solicitudes</span>
        <button class="btn btn_secundario" on:click={() => cargar_historial(pagina + 1)} disabled={pagina >= ultima_pagina || cargando_historial}>Siguiente</button>
      </div>
    {/if}
    <p class="nota">CoreCFDI verifica solas las solicitudes pendientes cada 10 minutos; esta lista se actualiza cada 5 minutos.</p>
  </div>
  </SesionCoreCfdi>
</div>

<style>
  .contenedor { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .encabezado { display: flex; align-items: center; background: #1e293b; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
  .titulo { display: flex; align-items: center; gap: 16px; }
  .icono { font-size: 36px; color: #38bdf8; }
  h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .encabezado p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  h2 { margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #1e293b; }
  .card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
  .card_titulo { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .card_titulo h2 { margin: 0; }
  .datos_fiel { display: flex; flex-wrap: wrap; gap: 28px; margin-bottom: 16px; }
  .datos_fiel small { display: block; color: #64748b; font-size: 12px; }
  .datos_fiel strong { font-size: 14px; color: #0f172a; }
  .form_grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 12px; }
  .campo label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
  .campo input, .campo select { width: 100%; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; box-sizing: border-box; }
  .campo small { display: block; margin-top: 4px; font-size: 12px; color: #64748b; }
  .campo small.error_campo { color: #b91c1c; }
  .nota { font-size: 12px; color: #64748b; margin: 8px 0 12px 0; }
  .estado { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .btn { background: #1d4ed8; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn_secundario { background: #e2e8f0; color: #334155; }
  .btn_chico { padding: 6px 12px; font-size: 12px; }
  .alerta { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; margin: 12px 0; }
  .alerta_error { background: #fee2e2; color: #991b1b; }
  .alerta_aviso { background: #fef3c7; color: #92400e; }
  .alerta_exito { background: #dcfce7; color: #166534; }
  .tabla_scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  th, td { padding: 11px 9px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
  th { background: #f8fafc; color: #475569; }
  td.mensaje_sat { white-space: normal; max-width: 280px; color: #475569; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .estado_pendiente { background: #fef3c7; color: #92400e; }
  .estado_terminada { background: #dbeafe; color: #1e40af; }
  .estado_descargada { background: #dcfce7; color: #166534; }
  .estado_rechazada, .estado_error { background: #fee2e2; color: #991b1b; }
  .estado_vencida { background: #e2e8f0; color: #475569; }
  .estado_desconocido { background: #f1f5f9; color: #334155; }
  .paginacion { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 16px; font-size: 13px; color: #475569; }
</style>
