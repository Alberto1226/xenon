<script>
  import { Dialog, Button } from "svelte-mui/src";
  import { formato_precio, convertir_a_fecha_humana } from "./../../../stores";

  export let visible = false;
  export let ruta = null;

  let pestaña_activa = "ventas"; // 'ventas' | 'inventario'

  function cerrar() {
    visible = false;
  }
</script>

<Dialog width="950" bind:visible>
  <div slot="title" class="dialog-title-container">
    {#if ruta}
      <div class="title-header">
        <i class="material-icons title-icon" style="color: #2e7d32;">task_alt</i>
        <span>Ruta Finalizada: <strong>{ruta.nombre_ruta || 'Ruta'}</strong> ({ruta.folio_salida || 'Sin Folio'})</span>
      </div>
      <div class="subtitle-info">
        <span><i class="material-icons info-icon" style="color: #1565c0;">person</i> Agente: <strong>{ruta.agente ? ruta.agente.nombre : 'Sin agente'}</strong></span>
        <span class="sep">•</span>
        <span><i class="material-icons info-icon" style="color: #e65100;">event</i> Finalizada: <strong>{convertir_a_fecha_humana(ruta.fecha_finalizacion)}</strong></span>
      </div>
    {:else}
      <span>Cargando detalle de ruta...</span>
    {/if}
  </div>

  {#if ruta}
    <div class="modal-body-content">
      <!-- Tabs header -->
      <div class="tabs-bar">
        <button
          class="tab-btn"
          class:active={pestaña_activa === 'ventas'}
          on:click={() => (pestaña_activa = 'ventas')}
        >
          <i class="material-icons" style="color: #6a1b9a;">receipt_long</i>
          Ventas y Folios Realizados ({ruta.pedidos_generados ? ruta.pedidos_generados.length : 0})
        </button>
        <button
          class="tab-btn"
          class:active={pestaña_activa === 'inventario'}
          on:click={() => (pestaña_activa = 'inventario')}
        >
          <i class="material-icons" style="color: #00695c;">inventory_2</i>
          Conciliación de Inventario
        </button>
      </div>

      <!-- Resumen financiero rápido -->
      <div class="finanzas-summary">
        <div class="fin-card">
          <span class="fin-label">
            <i class="material-icons fin-icon" style="color: #2e7d32;">monetization_on</i>
            Total Vendido
          </span>
          <span class="fin-val verde">$ {formato_precio(ruta.totales_financieros ? ruta.totales_financieros.total_vendido : 0)}</span>
        </div>
        {#if ruta.totales_financieros && ruta.totales_financieros.desglose_pagos}
          <div class="fin-card">
            <span class="fin-label">
              <i class="material-icons fin-icon" style="color: #388e3c;">payments</i>
              Efectivo
            </span>
            <span class="fin-val">$ {formato_precio(ruta.totales_financieros.desglose_pagos.efectivo || 0)}</span>
          </div>
          <div class="fin-card">
            <span class="fin-label">
              <i class="material-icons fin-icon" style="color: #1976d2;">account_balance</i>
              Transferencia
            </span>
            <span class="fin-val">$ {formato_precio(ruta.totales_financieros.desglose_pagos.transferencia || 0)}</span>
          </div>
          <div class="fin-card">
            <span class="fin-label">
              <i class="material-icons fin-icon" style="color: #8e24aa;">credit_card</i>
              Crédito
            </span>
            <span class="fin-val">$ {formato_precio(ruta.totales_financieros.desglose_pagos.credito || 0)}</span>
          </div>
        {/if}
      </div>

      {#if pestaña_activa === 'ventas'}
        <div class="ventas-section">
          {#if !ruta.pedidos_generados || ruta.pedidos_generados.length === 0}
            <div class="empty-state">
              <i class="material-icons" style="color: #f57c00;">info</i> No se registraron ventas de pedidos durante esta ruta.
            </div>
          {:else}
            {#each ruta.pedidos_generados as pedido, idx}
              <div class="pedido-card">
                <div class="pedido-header">
                  <div class="pedido-folio">
                    <i class="material-icons" style="color: #1565c0;">shopping_bag</i>
                    <span>Folio Venta: <strong>#{pedido.folio}</strong></span>
                  </div>
                  <div class="pedido-cliente">
                    <i class="material-icons" style="color: #00897b;">person</i>
                    <span>{pedido.cliente ? pedido.cliente.nombre : 'Cliente sin nombre'}</span>
                    {#if pedido.cliente && pedido.cliente.direccion}
                      <span class="cliente-dir">({pedido.cliente.direccion})</span>
                    {/if}
                  </div>
                  <div class="pedido-total">
                    <i class="material-icons" style="color: #2e7d32;">attach_money</i>
                    <span>Total: <strong>$ {formato_precio(pedido.total_pedido)}</strong></span>
                  </div>
                </div>

                <div class="pedido-body">
                  <table class="tabla-productos">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th class="centrado">Cant.</th>
                        <th class="derecha">Precio U.</th>
                        <th class="derecha">Subtotal</th>
                        <th>Folios Asignados al Cliente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each (pedido.lista || []) as item}
                        <tr>
                          <td class="prod-nombre">
                            <i class="material-icons" style="font-size: 1.1em; color: #78909c; vertical-align: middle; margin-right: 4px;">inventory_2</i>
                            <strong>{item.producto ? item.producto.nombre : 'Producto'}</strong>
                            {#if item.producto && item.producto.codigo}
                              <span class="prod-codigo">({item.producto.codigo})</span>
                            {/if}
                          </td>
                          <td class="centrado"><strong>{item.cantidad}</strong></td>
                          <td class="derecha">$ {formato_precio(item.producto ? item.producto.precio : 0)}</td>
                          <td class="derecha">
                            $ {formato_precio((item.cantidad || 1) * (item.producto ? item.producto.precio : 0))}
                          </td>
                          <td>
                            {#if item.folios && item.folios.length > 0}
                              <div class="folios-list">
                                {#each item.folios as fol}
                                  <span class="badge-folio">
                                    <i class="material-icons" style="font-size: 1em; color: #2e7d32; vertical-align: middle; margin-right: 2px;">local_offer</i>#{fol}
                                  </span>
                                {/each}
                              </div>
                            {:else}
                              <span class="sin-folios">Sin folios registrados</span>
                            {/if}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {:else if pestaña_activa === 'inventario'}
        <div class="inventario-section">
          {#if !ruta.inventario_conciliacion || ruta.inventario_conciliacion.length === 0}
            <div class="empty-state">
              <i class="material-icons" style="color: #f57c00;">info</i> No hay datos de conciliación de inventario.
            </div>
          {:else}
            <table class="tabla-inventario">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="centrado">Cargado</th>
                  <th class="centrado">Vendido</th>
                  <th class="centrado">Devuelto al Almacén</th>
                  <th class="centrado">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {#each ruta.inventario_conciliacion as item}
                  <tr>
                    <td>
                      <i class="material-icons" style="font-size: 1.1em; color: #78909c; vertical-align: middle; margin-right: 4px;">view_in_ar</i>
                      <strong>{item.producto ? item.producto.nombre : 'Producto'}</strong>
                      {#if item.producto && item.producto.codigo}
                        <span class="prod-codigo">({item.producto.codigo})</span>
                      {/if}
                    </td>
                    <td class="centrado">{item.cantidad_cargada || 0}</td>
                    <td class="centrado verde-text"><strong>{item.cantidad_vendida || 0}</strong></td>
                    <td class="centrado azul-text">{item.cantidad_devuelta || 0}</td>
                    <td class="centrado" class:rojo-text={item.diferencia !== 0}>
                      {item.diferencia || 0}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <div slot="actions" class="actions right">
    <Button color="primary" raised on:click={cerrar}>Cerrar</Button>
  </div>
</Dialog>

<style>
  .dialog-title-container {
    padding: 10px 0 5px 0;
  }

  .title-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.25em;
    font-weight: 600;
    color: #1b5e20;
  }

  .title-icon {
    font-size: 1.4em;
  }

  .subtitle-info {
    margin-top: 6px;
    font-size: 0.88em;
    color: #555;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-icon {
    font-size: 1.15em;
    vertical-align: sub;
  }

  .sep {
    color: #ccc;
  }

  .modal-body-content {
    max-height: 72vh;
    overflow-y: auto;
    padding-right: 5px;
  }

  .tabs-bar {
    display: flex;
    gap: 10px;
    border-bottom: 2px solid #e0e0e0;
    margin-bottom: 15px;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 10px 18px;
    font-size: 0.95em;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: #1976d2;
  }

  .tab-btn.active {
    color: #1976d2;
    border-bottom-color: #1976d2;
    background-color: #f0f7ff;
    border-radius: 6px 6px 0 0;
  }

  .finanzas-summary {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }

  .fin-card {
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 10px 16px;
    flex: 1;
    min-width: 130px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .fin-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8em;
    color: #666;
    text-transform: uppercase;
    font-weight: 600;
  }

  .fin-icon {
    font-size: 1.15em;
  }

  .fin-val {
    font-size: 1.25em;
    font-weight: 700;
    color: #333;
    margin-top: 2px;
  }

  .fin-val.verde {
    color: #2e7d32;
  }

  .pedido-card {
    border: 1px solid #dcdcdc;
    border-radius: 8px;
    margin-bottom: 15px;
    background: #fff;
    box-shadow: 0 2px 5px rgba(0,0,0,0.04);
    overflow: hidden;
  }

  .pedido-header {
    background: #f1f5f9;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9em;
  }

  .pedido-folio, .pedido-cliente, .pedido-total {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cliente-dir {
    color: #666;
    font-size: 0.85em;
  }

  .tabla-productos, .tabla-inventario {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88em;
  }

  .tabla-productos th, .tabla-inventario th {
    background: #f8fafc;
    padding: 9px 12px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
  }

  .tabla-productos td, .tabla-inventario td {
    padding: 9px 12px;
    border-bottom: 1px solid #f1f5f9;
  }

  .prod-codigo {
    color: #888;
    font-size: 0.85em;
    font-family: monospace;
  }

  .folios-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .badge-folio {
    background: #e8f5e9;
    color: #1b5e20;
    border: 1px solid #c8e6c9;
    padding: 3px 9px;
    border-radius: 12px;
    font-size: 0.85em;
    font-weight: 600;
    font-family: monospace;
    display: inline-flex;
    align-items: center;
  }

  .sin-folios {
    color: #aaa;
    font-style: italic;
    font-size: 0.85em;
  }

  .empty-state {
    text-align: center;
    padding: 30px;
    color: #777;
    background: #f9f9f9;
    border-radius: 8px;
  }

  .centrado {
    text-align: center;
  }

  .derecha {
    text-align: right;
  }

  .verde-text {
    color: #2e7d32;
  }

  .azul-text {
    color: #1565c0;
  }

  .rojo-text {
    color: #c62828;
    font-weight: bold;
  }
</style>
