<script>
  import { onMount } from "svelte";
  import { postData, mensajes_app } from "./../../../stores";
  import Paginacion from "./../../componentes/paginacion/index.svelte";

  const FORMAS = [
    ["01", "Efectivo"], ["02", "Cheque nominativo"], ["03", "Transferencia electrónica"], ["04", "Tarjeta de crédito"],
    ["28", "Tarjeta de débito"], ["06", "Dinero electrónico"], ["17", "Compensación"], ["31", "Intermediario pagos"]
  ];
  const FORMAS_CON_CUENTA = ["02", "03", "04", "05", "06", "28", "29"];

  let pestana = "registrar";

  // Registrar
  let buscar_cliente = "";
  let clientes = [];
  let cliente = null;
  let facturas = [];
  let cuentas = [];
  let saldo_a_favor = 0;
  let fecha_pago = new Date().toISOString().slice(0, 10);
  let forma_pago = "03";
  let monto = "";
  let referencia = "";
  let notas = "";
  let cuenta_destino_id = "";
  let ordenante = { banco: "", rfc_banco: "", numero_cuenta: "" };
  let usar_saldo = false;
  let seleccion = {};
  let guardando = false;
  let clave_idempotencia = nueva_clave();
  let temporizador;

  // Historial
  let pagos = [];
  let pagina_actual = 1;
  let total_paginas = 1;
  let ha_cambiado_pagina_actual = false;

  // Cuentas
  let lista_cuentas = [];
  let cuenta_form = { id: "", banco: "", rfc_banco: "", numero_cuenta: "", alias: "" };

  $: requiere_cuenta = FORMAS_CON_CUENTA.includes(forma_pago);
  $: aplicado = redondear(Object.values(seleccion).reduce((s, v) => s + (Number(v) || 0), 0));
  $: saldo_usable = usar_saldo ? Math.min(saldo_a_favor, aplicado) : 0;
  $: efectivo_necesario = redondear(aplicado - saldo_usable);
  $: excedente = redondear((Number(monto) || 0) - efectivo_necesario);
  $: if (ha_cambiado_pagina_actual) {
    ha_cambiado_pagina_actual = false;
    cargar_historial();
  }

  onMount(buscar_clientes);

  function nueva_clave() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function redondear(v) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  }
  function dinero(v) {
    return Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
  function fecha(v) {
    return v ? new Date(v).toLocaleDateString("es-MX") : "—";
  }
  function avisar(tipo, mensaje) {
    $mensajes_app.push({ tipo, mensaje });
    $mensajes_app = $mensajes_app;
  }

  async function buscar_clientes() {
    const r = await postData("/app/facturacion/pagos/clientes", { buscar: buscar_cliente });
    clientes = r.ok ? r.clientes : [];
  }
  function al_buscar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(buscar_clientes, 350);
  }

  async function elegir_cliente(c) {
    cliente = c;
    seleccion = {};
    monto = "";
    usar_saldo = false;
    clave_idempotencia = nueva_clave();
    await cargar_facturas();
  }
  async function cargar_facturas() {
    const r = await postData("/app/facturacion/pagos/facturas_pendientes", { cliente_id: cliente._id });
    if (!r.ok) return avisar("error", r.mensaje);
    facturas = r.facturas;
    cuentas = r.cuentas;
    saldo_a_favor = r.saldo_a_favor;
  }

  function marcar(f, activo) {
    if (activo) seleccion[f._id] = f.saldo_pendiente;
    else delete seleccion[f._id];
    seleccion = seleccion;
  }
  function limitar(f) {
    const v = redondear(seleccion[f._id]);
    seleccion[f._id] = v > f.saldo_pendiente ? f.saldo_pendiente : (v > 0 ? v : f.saldo_pendiente);
  }
  function liquidar_todo() {
    seleccion = {};
    facturas.forEach(f => (seleccion[f._id] = f.saldo_pendiente));
    monto = redondear(Math.max(0, facturas.reduce((s, f) => s + f.saldo_pendiente, 0) - (usar_saldo ? saldo_a_favor : 0)));
  }
  // Reparte el monto entre las facturas más antiguas primero.
  function aplicar_automatico() {
    let resto = redondear((Number(monto) || 0) + (usar_saldo ? saldo_a_favor : 0));
    seleccion = {};
    for (const f of facturas) {
      if (resto <= 0) break;
      const importe = Math.min(resto, f.saldo_pendiente);
      seleccion[f._id] = redondear(importe);
      resto = redondear(resto - importe);
    }
  }

  async function registrar() {
    if (aplicado <= 0) return avisar("error", "Selecciona al menos una factura.");
    if (Number(monto) < efectivo_necesario) return avisar("error", "El monto recibido no cubre lo aplicado.");
    guardando = true;
    try {
      const r = await postData("/app/facturacion/pagos/registrar", {
        cliente_id: cliente._id,
        fecha_pago,
        forma_pago,
        monto: Number(monto) || 0,
        referencia,
        notas,
        usar_saldo,
        clave_idempotencia,
        cuenta_destino_id: requiere_cuenta ? cuenta_destino_id : "",
        cuenta_ordenante: requiere_cuenta ? ordenante : {},
        aplicaciones: Object.keys(seleccion).map(id => ({ factura_id: id, importe: seleccion[id] }))
      });
      if (!r.ok) throw new Error(r.mensaje);
      avisar("exito", r.mensaje);
      seleccion = {};
      monto = "";
      referencia = "";
      usar_saldo = false;
      clave_idempotencia = nueva_clave();
      await cargar_facturas();
      buscar_clientes();
    } catch (err) {
      avisar("error", err.message || "No se pudo registrar el pago.");
    }
    guardando = false;
  }

  async function cargar_historial() {
    const r = await postData("/app/facturacion/pagos/lista", { pagina: pagina_actual });
    if (r.ok) {
      pagos = r.pagos;
      total_paginas = r.paginas;
    }
  }
  async function timbrar(p) {
    let produccion = false;
    if (!confirm(`¿Timbrar el complemento de pago del cobro ${p.folio}?`)) return;
    let r = await postData("/app/facturacion/pagos/timbrar_rep", { pago_id: p._id, confirmar_emision: true, confirmar_produccion: false });
    if (!r.ok && /producción/.test(r.mensaje || "") && confirm("El ambiente es PRODUCCIÓN. ¿Autorizas un timbrado real?")) {
      produccion = true;
      r = await postData("/app/facturacion/pagos/timbrar_rep", { pago_id: p._id, confirmar_emision: true, confirmar_produccion: produccion });
    }
    avisar(r.ok ? "exito" : "error", r.mensaje);
    cargar_historial();
  }
  async function cancelar(p) {
    const motivo = prompt("Motivo de la cancelación:");
    if (!motivo) return;
    const r = await postData("/app/facturacion/pagos/cancelar", { pago_id: p._id, motivo });
    avisar(r.ok ? "exito" : "error", r.mensaje);
    cargar_historial();
  }
  // Plazo para timbrar el REP: día 10 del mes siguiente al pago.
  function limite_rep(p) {
    const d = new Date(p.fecha_pago);
    return new Date(d.getFullYear(), d.getMonth() + 1, 10);
  }

  async function cargar_cuentas() {
    const r = await postData("/app/facturacion/pagos/cuentas", { accion: "listar" });
    if (r.ok) lista_cuentas = r.cuentas;
  }
  async function guardar_cuenta() {
    const r = await postData("/app/facturacion/pagos/cuentas", { accion: "guardar", ...cuenta_form });
    avisar(r.ok ? "exito" : "error", r.mensaje || "");
    if (r.ok) {
      cuenta_form = { id: "", banco: "", rfc_banco: "", numero_cuenta: "", alias: "" };
      cargar_cuentas();
    }
  }
  async function activar_cuenta(c) {
    await postData("/app/facturacion/pagos/cuentas", { accion: "activar", id: c._id, activa: !c.activa });
    cargar_cuentas();
  }

  function ir(p) {
    pestana = p;
    if (p === "historial") cargar_historial();
    if (p === "cuentas") cargar_cuentas();
  }
</script>

<svelte:head>
  <title>Complementos de Pago REP 2.0 - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">payments</i>
      <div>
        <h1>Recepción de pagos</h1>
        <p>Registra cobros de facturas PPD, aplícalos a una o varias facturas y timbra el complemento de pago (MXN).</p>
      </div>
    </div>
  </header>

  <nav class="pestanas">
    <button class:activa={pestana === "registrar"} on:click={() => ir("registrar")}>Registrar pago</button>
    <button class:activa={pestana === "historial"} on:click={() => ir("historial")}>Historial y REP</button>
    <button class:activa={pestana === "cuentas"} on:click={() => ir("cuentas")}>Cuentas bancarias</button>
  </nav>

  {#if pestana === "registrar"}
    <div class="card">
      {#if !cliente}
        <h3>Cliente con saldo pendiente</h3>
        <input class="buscador" type="search" placeholder="Buscar cliente" bind:value={buscar_cliente} on:input={al_buscar} />
        {#if clientes.length === 0}
          <p class="vacio">No hay clientes con facturas PPD pendientes.</p>
        {:else}
          <table>
            <thead><tr><th>Cliente</th><th>RFC</th><th class="der">Facturas</th><th class="der">Saldo</th><th class="der">Saldo a favor</th><th></th></tr></thead>
            <tbody>
              {#each clientes as c (c._id)}
                <tr>
                  <td>{c.nombre}</td><td>{c.rfc}</td><td class="der">{c.facturas}</td>
                  <td class="der">{dinero(c.saldo)}</td><td class="der">{dinero(c.saldo_a_favor)}</td>
                  <td class="der"><button on:click={() => elegir_cliente(c)}>Cobrar</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {:else}
        <div class="fila">
          <h3>{cliente.nombre}</h3>
          <button class="sec" on:click={() => { cliente = null; buscar_clientes(); }}>Cambiar cliente</button>
        </div>

        <div class="form">
          <label>Fecha de pago <input type="date" bind:value={fecha_pago} max={new Date().toISOString().slice(0, 10)} /></label>
          <label>Forma de pago
            <select bind:value={forma_pago}>
              {#each FORMAS as f}<option value={f[0]}>{f[0]} - {f[1]}</option>{/each}
            </select>
          </label>
          <label>Monto recibido (MXN) <input type="number" min="0" step="0.01" bind:value={monto} /></label>
          <label>Referencia <input type="text" maxlength="100" bind:value={referencia} /></label>
        </div>

        {#if requiere_cuenta}
          <div class="form">
            <label>Cuenta destino
              <select bind:value={cuenta_destino_id}>
                <option value="">Selecciona...</option>
                {#each cuentas as c}<option value={c._id}>{c.banco} · {c.numero_cuenta}</option>{/each}
              </select>
            </label>
            <label>Banco ordenante <input type="text" maxlength="80" bind:value={ordenante.banco} /></label>
            <label>RFC del banco ordenante <input type="text" maxlength="13" bind:value={ordenante.rfc_banco} /></label>
            <label>Cuenta ordenante <input type="text" maxlength="18" bind:value={ordenante.numero_cuenta} /></label>
          </div>
          <p class="nota">La cuenta destino y los datos del ordenante se exigen al timbrar el complemento; se pueden completar antes.</p>
        {/if}

        {#if saldo_a_favor > 0}
          <label class="check"><input type="checkbox" bind:checked={usar_saldo} /> Usar saldo a favor disponible ({dinero(saldo_a_favor)})</label>
        {/if}

        <div class="fila">
          <h4>Facturas con saldo</h4>
          <span>
            <button class="sec" on:click={aplicar_automatico}>Aplicar automático (más antiguas)</button>
            <button class="sec" on:click={liquidar_todo}>Liquidar todas</button>
          </span>
        </div>
        <table>
          <thead><tr><th></th><th>Factura</th><th>Pedido</th><th>Vence</th><th class="der">Total</th><th class="der">Saldo</th><th class="der">Aplicar</th></tr></thead>
          <tbody>
            {#each facturas as f (f._id)}
              <tr>
                <td><input type="checkbox" checked={seleccion[f._id] !== undefined} on:change={e => marcar(f, e.target.checked)} /></td>
                <td>{f.serie}{f.folio}</td>
                <td>{f.folio_pedido || "—"}</td>
                <td class:vencida={f.fecha_limite && new Date(f.fecha_limite) < new Date()}>{fecha(f.fecha_limite)}</td>
                <td class="der">{dinero(f.total)}</td>
                <td class="der">{dinero(f.saldo_pendiente)}</td>
                <td class="der">
                  {#if seleccion[f._id] !== undefined}
                    <input class="importe" type="number" min="0.01" max={f.saldo_pendiente} step="0.01" bind:value={seleccion[f._id]} on:change={() => limitar(f)} />
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        <div class="totales">
          <span>Aplicado: <b>{dinero(aplicado)}</b></span>
          {#if usar_saldo}<span>Saldo a favor usado: <b>{dinero(saldo_usable)}</b></span>{/if}
          <span>Recibido: <b>{dinero(monto)}</b></span>
          <span class:alerta={excedente < 0}>
            {excedente < 0 ? "Faltan" : "Excedente (saldo a favor)"}: <b>{dinero(Math.abs(excedente))}</b>
          </span>
        </div>
        <button disabled={guardando || aplicado <= 0 || excedente < 0} on:click={registrar}>
          {guardando ? "Registrando..." : "Registrar pago"}
        </button>
      {/if}
    </div>
  {/if}

  {#if pestana === "historial"}
    <div class="card">
      {#if pagos.length === 0}
        <p class="vacio">Sin pagos registrados.</p>
      {:else}
        <table>
          <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Origen</th><th class="der">Aplicado</th><th class="der">Excedente</th><th>Facturas</th><th>REP</th><th></th></tr></thead>
          <tbody>
            {#each pagos as p (p._id)}
              <tr class:cancelado={p.status === "Cancelado"}>
                <td>{p.folio}</td>
                <td>{fecha(p.fecha_pago)}</td>
                <td>{p.cliente && p.cliente.nombre}</td>
                <td>{p.origen === "saldo_a_favor" ? "Saldo a favor" : "Cobro"} · {p.forma_pago}</td>
                <td class="der">{dinero(p.monto_aplicado)}</td>
                <td class="der">{dinero(p.excedente_disponible)}</td>
                <td>{(p.aplicaciones || []).map(a => `${a.serie}${a.folio_factura} (${dinero(a.importe_pagado)})`).join(", ")}</td>
                <td>
                  {#if p.status === "Cancelado"}Cancelado
                  {:else if p.rep.estado === "timbrado"}Timbrado {p.rep.serie}{p.rep.folio}
                  {:else}
                    {p.rep.estado.replace("_", " ")}
                    {#if p.rep.estado === "sin_timbrar"}<small class="nota">límite {fecha(limite_rep(p))}</small>{/if}
                    {#if p.rep.error}<small class="alerta" title={p.rep.error}>⚠</small>{/if}
                  {/if}
                </td>
                <td class="der">
                  {#if p.status === "Registrado" && ["sin_timbrar", "fallido"].includes(p.rep.estado) && p.aplicaciones.length > 0}
                    <button on:click={() => timbrar(p)}>Timbrar REP</button>
                    <button class="sec" on:click={() => cancelar(p)}>Cancelar</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <Paginacion bind:total_paginas bind:ha_cambiado_pagina_actual bind:pagina_actual />
      {/if}
    </div>
  {/if}

  {#if pestana === "cuentas"}
    <div class="card">
      <div class="form">
        <label>Banco <input type="text" maxlength="80" bind:value={cuenta_form.banco} /></label>
        <label>RFC del banco <input type="text" maxlength="13" bind:value={cuenta_form.rfc_banco} /></label>
        <label>Cuenta (10-18 dígitos) <input type="text" maxlength="18" bind:value={cuenta_form.numero_cuenta} /></label>
        <label>Alias <input type="text" maxlength="60" bind:value={cuenta_form.alias} /></label>
      </div>
      <button on:click={guardar_cuenta}>{cuenta_form.id ? "Actualizar" : "Agregar"} cuenta</button>
      <table>
        <thead><tr><th>Banco</th><th>RFC</th><th>Cuenta</th><th>Alias</th><th></th></tr></thead>
        <tbody>
          {#each lista_cuentas as c (c._id)}
            <tr class:cancelado={!c.activa}>
              <td>{c.banco}</td><td>{c.rfc_banco}</td><td>{c.numero_cuenta}</td><td>{c.alias}</td>
              <td class="der">
                <button class="sec" on:click={() => (cuenta_form = { id: c._id, banco: c.banco, rfc_banco: c.rfc_banco, numero_cuenta: c.numero_cuenta, alias: c.alias })}>Editar</button>
                <button class="sec" on:click={() => activar_cuenta(c)}>{c.activa ? "Desactivar" : "Activar"}</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .contenedor { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .encabezado { display: flex; align-items: center; background: #1e293b; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 16px; }
  .titulo { display: flex; align-items: center; gap: 16px; }
  .icono { font-size: 36px; color: #38bdf8; }
  h1 { margin: 0; font-size: 22px; font-weight: 700; }
  h3, h4 { margin: 0 0 12px 0; }
  p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  .pestanas { display: flex; gap: 8px; margin-bottom: 16px; }
  .pestanas button { background: #e2e8f0; color: #1e293b; }
  .pestanas button.activa { background: #1d4ed8; color: #fff; }
  .card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; }
  .buscador { width: 100%; max-width: 360px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 16px; }
  .form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px; }
  label { display: flex; flex-direction: column; font-size: 12px; color: #475569; gap: 4px; }
  label input, label select { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
  .check { flex-direction: row; align-items: center; margin: 8px 0; font-size: 14px; }
  .fila { display: flex; justify-content: space-between; align-items: center; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0 16px; }
  th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  .der { text-align: right; }
  .importe { width: 110px; padding: 4px; text-align: right; }
  .vacio { color: #64748b; text-align: center; padding: 24px; }
  .nota { color: #64748b; font-size: 12px; }
  .vencida, .alerta { color: #b91c1c; }
  .cancelado { opacity: 0.5; }
  .totales { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; font-size: 14px; }
  button { background: #1d4ed8; color: #fff; border: 0; border-radius: 6px; padding: 7px 14px; cursor: pointer; }
  button.sec { background: #e2e8f0; color: #1e293b; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
