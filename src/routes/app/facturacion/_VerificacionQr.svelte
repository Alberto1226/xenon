<script context="module">
  // Las respuestas se guardan en memoria durante la sesión: el servidor no cachea la imagen del QR.
  const cache = new Map();

  export function idValido(id) {
    const n = Number(id);
    return id !== null && id !== undefined && id !== "" && Number.isInteger(n) && n > 0;
  }
</script>

<script>
  // Modal con el QR del verificador del SAT de un CFDI de CoreCFDI.
  // No consulta al SAT: la liga solo lleva los datos del CFDI y el SAT valida al abrirla.
  import { onMount, createEventDispatcher } from "svelte";
  import QRCode from "qrcode";
  import { postData } from "../../stores";

  export let id;
  export let moneda = "";

  const dispatch = createEventDispatcher();

  let cargando = true;
  let error = "";
  let datos = null;
  let qr_imagen = null;
  let copiado = false;

  onMount(cargar);

  async function cargar() {
    if (!idValido(id)) {
      cargando = false;
      error = "El id de la factura no es válido.";
      return;
    }
    if (cache.has(id)) {
      await mostrar(cache.get(id));
      cargando = false;
      return;
    }
    try {
      const res = await postData("/app/facturacion/verificacion-qr", { id });
      if (res.ok) {
        cache.set(id, res.verificacion);
        await mostrar(res.verificacion);
      } else if (res.tipo === "sesion") {
        dispatch("sesion");
      } else {
        error = res.mensaje || "No se pudo obtener la verificación QR.";
        // 422: la factura no tiene UUID o le faltan RFC; no se puede verificar.
        if (res.status === 422 && res.tipo === "validacion") dispatch("invalida", { id, mensaje: error });
      }
    } catch (err) {
      error = "No se pudo obtener la verificación QR.";
    } finally {
      cargando = false;
    }
  }

  async function mostrar(verificacion) {
    datos = verificacion;
    qr_imagen = verificacion.qrSvg;
    if (!qr_imagen && verificacion.url) {
      // Sin QR del servidor: se genera aquí con la misma liga, sin modificarla.
      try {
        qr_imagen = await QRCode.toDataURL(verificacion.url, { width: 240, margin: 1 });
      } catch (err) {
        qr_imagen = null;
      }
    }
  }

  function total_legible(valor) {
    const texto = (Number(valor) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return moneda ? `${moneda} ${texto}` : texto;
  }

  async function copiar_liga() {
    if (!datos || !datos.url) return;
    try {
      await navigator.clipboard.writeText(datos.url);
    } catch (err) {
      const campo = document.createElement("textarea");
      campo.value = datos.url;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      document.body.removeChild(campo);
    }
    copiado = true;
    setTimeout(() => (copiado = false), 2000);
  }

  function al_teclear(evento) {
    if (evento.key === "Escape") dispatch("cerrar");
  }
</script>

<svelte:window on:keydown={al_teclear} />

<div class="fondo" on:click={() => dispatch("cerrar")}></div>
<div class="modal" role="dialog" aria-modal="true" aria-label="Verificación QR del CFDI">
  <header>
    <h2>Verificación QR</h2>
    <button class="cerrar" on:click={() => dispatch("cerrar")} aria-label="Cerrar"><i class="material-icons">close</i></button>
  </header>

  {#if cargando}
    <p class="estado">Generando verificación...</p>
  {:else if error}
    <div class="alerta alerta_error">
      <i class="material-icons">error_outline</i>
      <span>{error}</span>
    </div>
  {:else if datos}
    <div class="qr">
      {#if qr_imagen}
        <img src={qr_imagen} alt="QR del verificador del SAT" width="240" height="240" />
      {:else}
        <p class="estado">No se pudo generar la imagen del QR. Use la liga.</p>
      {/if}
    </div>

    {#if !datos.selloCompleto}
      <div class="alerta alerta_aviso">
        <i class="material-icons">info</i>
        <span>El SAT pedirá capturar los últimos 8 caracteres del sello manualmente.</span>
      </div>
    {/if}

    <dl>
      <dt>UUID</dt><dd class="mono">{datos.uuid}</dd>
      <dt>RFC emisor</dt><dd class="mono">{datos.emisorRfc}</dd>
      <dt>RFC receptor</dt><dd class="mono">{datos.receptorRfc}</dd>
      <dt>Total</dt><dd>{total_legible(datos.total)}</dd>
    </dl>

    {#if datos.url}
      <div class="botones">
        <a class="btn" href={datos.url} target="_blank" rel="noopener noreferrer">Abrir en el SAT</a>
        <button class="btn btn_secundario" on:click={copiar_liga}>{copiado ? "Liga copiada" : "Copiar liga"}</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .fondo { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); z-index: 1000; }
  .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1001; background: #fff; border-radius: 12px; padding: 20px 24px; width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; font-family: system-ui, sans-serif; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  h2 { margin: 0; font-size: 18px; color: #0f172a; }
  .cerrar { background: none; border: none; cursor: pointer; color: #475569; padding: 4px; }
  .qr { display: flex; justify-content: center; margin: 8px 0 12px; }
  .qr img { width: 240px; height: 240px; }
  .estado { color: #64748b; font-size: 14px; text-align: center; padding: 24px 0; }
  .alerta { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin: 8px 0; }
  .alerta_error { background: #fee2e2; color: #991b1b; }
  .alerta_aviso { background: #fef3c7; color: #92400e; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 13px; margin: 12px 0; }
  dt { color: #64748b; font-weight: 600; }
  dd { margin: 0; color: #0f172a; word-break: break-all; }
  .mono { font-family: ui-monospace, monospace; font-size: 12px; }
  .botones { display: flex; gap: 10px; margin-top: 8px; }
  .btn { background: #1d4ed8; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
  .btn_secundario { background: #e2e8f0; color: #334155; }
</style>
