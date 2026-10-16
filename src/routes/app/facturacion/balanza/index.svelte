<script>
  // Balanza anual de ingresos y egresos según los CFDI vigentes descargados del SAT (CoreCFDI).
  // Es lo facturado por fecha de emisión: no es flujo de efectivo ni una balanza de comprobación,
  // así que de aquí no se derivan utilidad fiscal, impuestos ni saldos por cobrar o pagar.
  import { postData } from "../../../stores";
  import SesionCoreCfdi from "../_SesionCoreCfdi.svelte";
  import { monto, porcentaje, sinMovimiento, opcionesDeYear, mensajeDeError, geometriaGrafica } from "../../../../services/corecfdi/balanzaVista.js";

  let sesion_activa = false;
  let cargando = false;
  let error = "";
  let balanza = null;
  let year = null;
  let consultado_en = null;
  let mes_activo = null;

  // Sin `year` el servidor elige el año más reciente con CFDI y lo devuelve en yearSeleccionado.
  async function cargar(year_pedido = null, actualizar = false) {
    cargando = true;
    try {
      const res = await postData("/app/facturacion/balanza", { year: year_pedido, actualizar });
      if (res.ok) {
        balanza = res;
        year = res.yearSeleccionado;
        consultado_en = res.consultadoEn;
        mes_activo = null;
        error = "";
      } else if (res.tipo === "sesion") {
        // La sesión de CoreCFDI venció: se vuelve a pedir el inicio de sesión.
        sesion_activa = false;
      } else {
        error = mensajeDeError(res);
        // El selector regresa al año que sí se está mostrando.
        if (balanza) year = balanza.yearSeleccionado;
      }
    } catch (err) {
      error = "No se pudo consultar la balanza de ingresos y egresos.";
    } finally {
      cargando = false;
    }
  }

  function al_iniciar_sesion() {
    balanza = null;
    year = null;
    cargar();
  }

  function hora_legible(marca) {
    return marca ? new Date(marca).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
  }

  $: years = balanza ? opcionesDeYear(balanza.years, balanza.yearSeleccionado) : [];
  $: vacio = balanza ? sinMovimiento(balanza.acumulados) : false;
  $: grafica = balanza ? geometriaGrafica(balanza.mensualidades) : null;
</script>

<svelte:head>
  <title>Balanza de ingresos y egresos - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">balance</i>
      <div>
        <h1>Balanza de ingresos y egresos</h1>
        <p>Lo que la empresa facturó y lo que le facturaron en el año, según los CFDI descargados del SAT</p>
      </div>
    </div>
  </header>

  <SesionCoreCfdi bind:activa={sesion_activa} on:activa={al_iniciar_sesion}>
    <div class="alerta alerta_info">
      <i class="material-icons">info</i>
      <span>Importes calculados con los CFDI vigentes descargados del SAT, por fecha de emisión. No considera cobros ni pagos, y suma monedas distintas sin convertir.</span>
    </div>

    {#if error}
      <div class="alerta alerta_error">
        <i class="material-icons">error_outline</i>
        <span>{error}</span>
      </div>
    {/if}

    <div class="barra_acciones">
      <div class="campo">
        <label for="balanza_year">Año</label>
        <select id="balanza_year" bind:value={year} on:change={() => cargar(year)} disabled={cargando || !balanza}>
          {#each years as opcion}
            <option value={opcion}>{opcion}</option>
          {/each}
        </select>
      </div>
      <div class="acciones">
        {#if consultado_en}<span class="nota">Consultado a las {hora_legible(consultado_en)}</span>{/if}
        <button class="btn btn_secundario" on:click={() => cargar(year, true)} disabled={cargando}>
          {cargando ? "Consultando..." : "Actualizar"}
        </button>
      </div>
    </div>

    {#if cargando && !balanza}
      <p class="estado">Consultando la balanza...</p>
    {:else if balanza}
      <div class="tarjetas">
        <div class="tarjeta"><small>Ingresos del año</small><strong>{monto(balanza.acumulados.ingresos)}</strong><em>Facturado por la empresa</em></div>
        <div class="tarjeta"><small>Egresos del año</small><strong>{monto(balanza.acumulados.egresos)}</strong><em>Facturado a la empresa</em></div>
        <div class="tarjeta" class:negativo={balanza.acumulados.balanceNeto < 0}>
          <small>Balance neto</small><strong>{monto(balanza.acumulados.balanceNeto)}</strong><em>Ingresos menos egresos</em>
        </div>
        <div class="tarjeta" class:negativo={balanza.acumulados.margen < 0}>
          <small>Margen</small><strong>{porcentaje(balanza.acumulados.margen)}</strong><em>Balance neto entre ingresos</em>
        </div>
      </div>

      {#if vacio}
        <div class="card vacio">
          <i class="material-icons icono_vacio">inbox</i>
          <p>No hay CFDI descargados para este año</p>
        </div>
      {:else}
        <div class="card">
          <h2>Ingresos y egresos por mes · {balanza.yearSeleccionado}</h2>
          <div class="leyenda">
            <span><i class="muestra muestra_ingresos"></i>Ingresos</span>
            <span><i class="muestra muestra_egresos"></i>Egresos</span>
            <span><i class="muestra muestra_balanza"></i>Balanza</span>
          </div>
          <div class="grafica" on:mouseleave={() => (mes_activo = null)}>
            <svg viewBox={`0 0 ${grafica.ancho} ${grafica.alto}`} role="img" aria-label={"Ingresos, egresos y balanza por mes de " + balanza.yearSeleccionado}>
              {#each grafica.marcas as marca}
                <line class="rejilla" x1={grafica.izquierda} x2={grafica.derecha} y1={marca.y} y2={marca.y} />
                <text class="eje" x={grafica.izquierda - 8} y={marca.y + 4} text-anchor="end">{marca.texto}</text>
              {/each}
              {#each grafica.columnas as c}
                {#if mes_activo === c}
                  <rect class="resalte" x={c.x} y={grafica.arriba} width={c.ancho} height={grafica.base - grafica.arriba} />
                {/if}
                <rect class="barra_ingresos" x={c.ingresos.x} y={c.ingresos.y} width={c.ingresos.ancho} height={c.ingresos.alto} rx="2" />
                <rect class="barra_egresos" x={c.egresos.x} y={c.egresos.y} width={c.egresos.ancho} height={c.egresos.alto} rx="2" />
                <text class="eje" x={c.centro} y={grafica.alto - 8} text-anchor="middle">{c.mes.nombre.substring(0, 3)}</text>
              {/each}
              <line class="linea_cero" x1={grafica.izquierda} x2={grafica.derecha} y1={grafica.cero} y2={grafica.cero} />
              <polyline class="linea_balanza" points={grafica.linea} />
              {#each grafica.columnas as c}
                <circle class="punto_balanza" cx={c.balanza.x} cy={c.balanza.y} r="4" />
                <rect class="zona" x={c.x} y="0" width={c.ancho} height={grafica.alto} on:mouseenter={() => (mes_activo = c)} />
              {/each}
            </svg>
            {#if mes_activo}
              <div class="globo" class:globo_izquierda={mes_activo.centro > grafica.ancho / 2} style={"left:" + (mes_activo.centro / grafica.ancho) * 100 + "%"}>
                <strong>{mes_activo.mes.nombre}</strong>
                <span><i class="muestra muestra_ingresos"></i>Ingresos <b>{monto(mes_activo.mes.ingresos)}</b></span>
                <span><i class="muestra muestra_egresos"></i>Egresos <b>{monto(mes_activo.mes.egresos)}</b></span>
                <span><i class="muestra muestra_balanza"></i>Balanza <b class:negativo={mes_activo.mes.balanza < 0}>{monto(mes_activo.mes.balanza)}</b></span>
              </div>
            {/if}
          </div>
        </div>

        <div class="card">
          <h2>Detalle mensual</h2>
          <div class="tabla_scroll">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th class="derecha">Ingresos</th>
                  <th class="derecha">Egresos</th>
                  <th class="derecha">Balanza</th>
                </tr>
              </thead>
              <tbody>
                {#each balanza.mensualidades as mes (mes.numero)}
                  <tr>
                    <td>{mes.nombre}</td>
                    <td class="derecha">{monto(mes.ingresos)}</td>
                    <td class="derecha">{monto(mes.egresos)}</td>
                    <td class="derecha" class:negativo={mes.balanza < 0}>{monto(mes.balanza)}</td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total del año</td>
                  <td class="derecha">{monto(balanza.acumulados.ingresos)}</td>
                  <td class="derecha">{monto(balanza.acumulados.egresos)}</td>
                  <td class="derecha" class:negativo={balanza.acumulados.balanceNeto < 0}>{monto(balanza.acumulados.balanceNeto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="dos_columnas">
          <div class="card">
            <h2>Principales clientes</h2>
            {#if balanza.topClientes.length === 0}
              <p class="nota">No hay CFDI de ingreso emitidos en el año.</p>
            {:else}
              <table>
                <thead>
                  <tr><th>Cliente</th><th>RFC</th><th class="derecha">Total</th></tr>
                </thead>
                <tbody>
                  {#each balanza.topClientes as cliente}
                    <tr>
                      <td class="nombre">{cliente.nombre || "—"}</td>
                      <td>{cliente.rfc || "—"}</td>
                      <td class="derecha">{monto(cliente.total)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>
          <div class="card">
            <h2>Principales proveedores</h2>
            {#if balanza.topProveedores.length === 0}
              <p class="nota">No hay CFDI de ingreso recibidos en el año.</p>
            {:else}
              <table>
                <thead>
                  <tr><th>Proveedor</th><th>RFC</th><th class="derecha">Total</th></tr>
                </thead>
                <tbody>
                  {#each balanza.topProveedores as proveedor}
                    <tr>
                      <td class="nombre">{proveedor.nombre || "—"}</td>
                      <td>{proveedor.rfc || "—"}</td>
                      <td class="derecha">{monto(proveedor.total)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
              <p class="nota">No incluye notas de crédito recibidas, por lo que su suma puede no coincidir con los egresos.</p>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
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
  .barra_acciones { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; }
  .acciones { display: flex; align-items: center; gap: 12px; }
  .nota { font-size: 12px; color: #64748b; margin: 6px 0 0 0; }
  .estado { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .campo label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
  .campo select { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; min-width: 110px; }
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .tarjeta { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
  .tarjeta small { display: block; color: #64748b; font-size: 12px; }
  .tarjeta strong { display: block; font-size: 20px; color: #0f172a; }
  .tarjeta em { font-style: normal; font-size: 12px; color: #64748b; }
  .tarjeta.negativo { border-color: #fca5a5; background: #fef2f2; }
  .tarjeta.negativo strong, td.negativo, b.negativo { color: #b91c1c; }
  .card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
  .dos_columnas { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; }
  .btn { background: #1d4ed8; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn_secundario { background: #e2e8f0; color: #334155; }
  .alerta { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; margin: 0 0 12px 0; }
  .alerta_error { background: #fee2e2; color: #991b1b; }
  .alerta_info { background: #e0f2fe; color: #075985; }
  .icono_vacio { font-size: 48px; color: #94a3b8; }
  .vacio { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .leyenda { display: flex; gap: 18px; font-size: 12px; color: #475569; margin-bottom: 8px; }
  .leyenda span, .globo span { display: flex; align-items: center; gap: 6px; }
  .muestra { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
  .muestra_ingresos { background: #2563eb; }
  .muestra_egresos { background: #ea580c; }
  .muestra_balanza { background: #9333ea; height: 3px; width: 14px; }
  .grafica { position: relative; }
  svg { display: block; width: 100%; height: auto; }
  .rejilla { stroke: #e2e8f0; stroke-width: 1; }
  .linea_cero { stroke: #94a3b8; stroke-width: 1; }
  .eje { font-size: 11px; fill: #64748b; }
  .barra_ingresos { fill: #2563eb; }
  .barra_egresos { fill: #ea580c; }
  .linea_balanza { fill: none; stroke: #9333ea; stroke-width: 2; stroke-linejoin: round; }
  .punto_balanza { fill: #9333ea; stroke: #fff; stroke-width: 2; }
  .resalte { fill: #f1f5f9; }
  .zona { fill: transparent; }
  .globo { position: absolute; top: 8px; transform: translateX(12px); background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #334155; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12); pointer-events: none; white-space: nowrap; }
  .globo_izquierda { transform: translateX(calc(-100% - 12px)); }
  .globo strong { display: block; margin-bottom: 4px; color: #0f172a; }
  .globo b { margin-left: auto; padding-left: 14px; color: #0f172a; }
  .tabla_scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  th, td { padding: 11px 9px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
  th { background: #f8fafc; color: #475569; }
  tfoot td { font-weight: 700; background: #f8fafc; border-top: 2px solid #cbd5e1; }
  .derecha { text-align: right; }
  td.nombre { white-space: normal; }
</style>
