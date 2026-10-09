<script>
  import { onMount } from "svelte";
  import { postData, mensajes_app } from "../../../stores";

  let facturas = [];
  let cargando = false;
  onMount(cargar_facturas);

  async function cargar_facturas() {
    cargando = true;
    try {
      const respuesta = await postData("/app/facturacion/facturas-emitidas", {});
      if (!respuesta.ok) throw new Error(respuesta.mensaje || "No se pudieron consultar las facturas.");
      facturas = respuesta.facturas || [];
    } catch (err) {
      $mensajes_app.push({ tipo: "error", mensaje: err.message || "Error al cargar facturas emitidas." });
      $mensajes_app = $mensajes_app;
    } finally {
      cargando = false;
    }
  }

  function fecha_legible(fecha) {
    return fecha ? new Date(fecha).toLocaleString("es-MX") : "—";
  }
</script>

<svelte:head>
  <title>Facturas Emitidas - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">receipt_long</i>
      <div>
        <h1>Facturas Emitidas</h1>
        <p>Consulta de comprobantes fiscales vigentes y cancelados con descarga directa desde CUCC</p>
      </div>
    </div>
  </header>

  <div class="card">
    {#if cargando}
      <p class="estado">Consultando facturas emitidas...</p>
    {:else if facturas.length === 0}
      <div class="vacio">
        <i class="material-icons icono_vacio">find_in_page</i>
        <p>Aún no hay facturas registradas.</p>
      </div>
    {:else}
      <div class="tabla_scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Serie / Folio</th>
              <th>Receptor</th>
              <th>UUID</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {#each facturas as factura}
              <tr>
                <td>{fecha_legible(factura.fecha_emision)}</td>
                <td>{factura.serie}-{factura.folio}</td>
                <td>{factura.receptor.nombre}<small>{factura.receptor.rfc}</small></td>
                <td class="uuid">{factura.uuid}</td>
                <td>{factura.moneda} {Number(factura.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                <td>{factura.status}</td>
                <td class="descargas">
                  <a href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(factura.uuid)}&tipo=pdf`}>PDF</a>
                  <a href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(factura.uuid)}&tipo=xml`}>XML</a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .contenedor { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .encabezado { display: flex; align-items: center; background: #1e293b; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
  .titulo { display: flex; align-items: center; gap: 16px; }
  .icono { font-size: 36px; color: #38bdf8; }
  h1 { margin: 0; font-size: 22px; font-weight: 700; }
  p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  .card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; }
  .icono_vacio { font-size: 48px; color: #94a3b8; }
  .vacio, .estado { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .tabla_scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  th, td { padding: 11px 9px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
  th { background: #f8fafc; color: #475569; }
  td small { display: block; color: #64748b; margin-top: 4px; }
  td.uuid { max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
  .descargas { display: flex; gap: 10px; }
  .descargas a { color: #1d4ed8; text-decoration: none; }
</style>
