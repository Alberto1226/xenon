<script>
  import { onMount } from "svelte";
</script>

<svelte:head>
  <title>Emitir Factura - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">post_add</i>
      <div>
        <h1>Emitir Factura CFDI 4.0</h1>
        <p>Generación de comprobante fiscal para pedidos concluidos o ventas individuales</p>
      </div>
    </div>
  </header>

  <div class="card">
    <div class="vacio">
      <i class="material-icons icono_vacio">description</i>
      <p>Para facturar una venta, abre un pedido enviado y usa la acción “Preparar factura”. Revisa los datos fiscales y confirma el ambiente antes de timbrar.</p>
      <a href="/app/pedidos">Ir a pedidos</a>
    </div>
  </div>
</div>

<style>
  .contenedor { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .encabezado { display: flex; align-items: center; background: #1e293b; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
  .titulo { display: flex; align-items: center; gap: 16px; }
  .icono { font-size: 36px; color: #38bdf8; }
  h1 { margin: 0; font-size: 22px; font-weight: 700; }
  p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  .card { background: #fff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0; text-align: center; }
  .icono_vacio { font-size: 48px; color: #94a3b8; }
  .vacio { color: #64748b; font-size: 14px; }
  .vacio a { display: inline-block; margin-top: 14px; color: #1d4ed8; }
</style>
