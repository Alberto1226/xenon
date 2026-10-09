<script>
  import { onMount } from "svelte";
</script>

<svelte:head>
  <title>Complementos de Pago REP 2.0 - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">payments</i>
      <div>
        <h1>Complementos de Recepción de Pagos (REP 2.0)</h1>
        <p>Emisión de CFDI Tipo P para facturas emitidas bajo método PPD a crédito</p>
      </div>
    </div>
  </header>

  <div class="card">
    <div class="vacio">
      <i class="material-icons icono_vacio">account_balance_wallet</i>
      <p>Módulo de Complementos de Pago en preparación.</p>
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
</style>
