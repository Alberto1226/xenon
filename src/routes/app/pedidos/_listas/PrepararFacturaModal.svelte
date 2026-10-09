<script>
  import { postData, mensajes_app } from "./../../../stores";
  import { obtenerCatalogosFiscales } from "../../../../services/catalogosFiscales";

  export let visible = false;
  export let pedido = null;

  let cargando = false;
  let guardando = false;
  let pedido_cargado = "";
  let pedido_datos = null;
  let cliente = null;
  let pedimentos = [];
  let requerir_pedimentos = false;
  let ambiente_facturacion = "sandbox";
  let estado_preparacion = "";
  let factura_uuid = "";
  let factura_folio = "";
  let emitiendo = false;
  let receptor = {
    rfc: "",
    nombre: "",
    codigo_postal: "",
    tipo_persona: "",
    regimen_fiscal: "",
    uso_cfdi: ""
  };
  let metodo_pago = "PUE";
  let forma_pago = "01";
  let conceptos = [];
  $: codigo_postal_valido = /^\d{5}$/.test(receptor.codigo_postal);

  $: if (!visible) pedido_cargado = "";
  $: if (visible && pedido && String(pedido._id) !== pedido_cargado && !cargando) {
    cargar_datos();
  }

  async function cargar_datos() {
    cargando = true;
    const pedidoId = String(pedido._id);
    try {
      const respuesta = await postData("/app/pedidos/preparar_factura", { pedido_id: pedidoId });
      if (!respuesta.ok) {
        throw new Error(respuesta.mensaje || "No se pudieron cargar los datos del pedido");
      }

      pedido_datos = respuesta.pedido;
      cliente = respuesta.cliente;
      pedimentos = respuesta.pedimentos || [];
      requerir_pedimentos = respuesta.requerir_pedimentos === true;
      ambiente_facturacion = respuesta.ambiente_facturacion || "sandbox";
      estado_preparacion = (respuesta.preparacion_factura && respuesta.preparacion_factura.estado) || "";
      factura_uuid = (respuesta.preparacion_factura && respuesta.preparacion_factura.factura_uuid) || "";
      const facturasPedido = respuesta.pedido.facturacion || [];
      const facturaPedido = facturasPedido.find(factura => factura.uuid === factura_uuid) || facturasPedido[facturasPedido.length - 1];
      if (facturaPedido) {
        factura_uuid = facturaPedido.uuid;
        factura_folio = `${facturaPedido.serie}-${facturaPedido.folio}`;
        estado_preparacion = "emitida";
      } else {
        factura_folio = "";
      }
      const datosFiscales = (cliente && cliente.datos_fiscales) || {};
      const direccion = (cliente && cliente.direccion_fiscal) || {};
      const borrador = respuesta.preparacion_factura && ["pendiente", "fallida"].includes(respuesta.preparacion_factura.estado)
        ? respuesta.preparacion_factura
        : null;

      receptor = borrador && borrador.receptor
        ? { ...borrador.receptor }
        : {
            rfc: datosFiscales.rfc || direccion.rfc || "",
            nombre: datosFiscales.razon_social || datosFiscales.nombre || (cliente && cliente.nombre) || "",
            codigo_postal: direccion.cp || "",
            tipo_persona: direccion.tipo_persona || datosFiscales.tipo_persona || "",
            regimen_fiscal: direccion.rfiscal || datosFiscales.rfiscal || "",
            uso_cfdi: direccion.cfdi || datosFiscales.cfdi || ""
          };
      if (!receptor.tipo_persona) {
        receptor.tipo_persona = receptor.rfc.length === 12 ? "MORAL" : (receptor.rfc.length === 13 ? "FISICA" : "");
      }
      metodo_pago = (borrador && borrador.metodo_pago) || "PUE";
      forma_pago = (borrador && borrador.forma_pago) || "01";
      conceptos = (pedido_datos.lista || []).map((item, indice) => {
        const guardado = borrador && (borrador.conceptos || []).find(concepto =>
          concepto.indice === indice && String(concepto.producto_id) === String(item.producto && item.producto._id)
        );
        const pedimentoOrigen = item.pedimento_origen && (item.pedimento_origen._id || item.pedimento_origen);
        return {
          indice,
          producto_id: item.producto && item.producto._id,
          nombre: (item.producto && item.producto.nombre) || "Producto",
          codigo: (item.producto && item.producto.codigo) || "",
          cantidad: item.cantidad || 0,
          precio: (item.producto && item.producto.precio) || 0,
          sat_clave_prod_serv: (item.producto && item.producto.sat_clave_prod_serv) || "",
          sat_clave_unidad: (item.producto && item.producto.sat_clave_unidad) || "",
          sat_objeto_impuesto: (item.producto && item.producto.sat_objeto_impuesto) || "",
          impuestos_venta: (item.producto && item.producto.impuestos_venta) || { iva: "", ieps_tasa_porcentaje: 0 },
          origen: guardado ? guardado.origen : (pedimentoOrigen ? "importado" : ""),
          pedimento_id: guardado
            ? String(guardado.pedimento_id || "")
            : (pedimentoOrigen ? String(pedimentoOrigen) : "")
        };
      });
      pedido_cargado = pedidoId;
    } catch (err) {
      $mensajes_app.push({ tipo: "error", mensaje: err.message || "Error al preparar la factura." });
      $mensajes_app = $mensajes_app;
      visible = false;
    } finally {
      cargando = false;
    }
  }

  function pedimentos_producto(concepto) {
    return pedimentos.filter(pedimento =>
      pedimento.productos.includes(String(concepto.producto_id))
    );
  }

  function cambiar_origen(concepto) {
    if (concepto.origen === "nacional") concepto.pedimento_id = "";
  }

  function cambiar_tipo_persona() {
    receptor.uso_cfdi = "";
    receptor.regimen_fiscal = "";
  }

  function cambiar_uso_cfdi() {
    const catalogos = obtenerCatalogosFiscales(receptor.tipo_persona, receptor.uso_cfdi);
    if (!catalogos.regimenes.some(regimen => regimen.clave === receptor.regimen_fiscal)) {
      receptor.regimen_fiscal = "";
    }
  }

  function cerrar() {
    visible = false;
  }

  async function guardar_preparacion() {
    if (!codigo_postal_valido) {
      $mensajes_app.push({ tipo: "error", mensaje: "El código postal fiscal debe contener exactamente 5 dígitos." });
      $mensajes_app = $mensajes_app;
      return false;
    }

    guardando = true;
    try {
      const respuesta = await postData("/app/pedidos/guardar_preparacion_factura", {
        pedido_id: pedido_datos._id,
        receptor,
        metodo_pago,
        forma_pago,
        conceptos: conceptos.map(concepto => ({
          indice: concepto.indice,
          producto_id: concepto.producto_id,
          origen: concepto.origen,
          pedimento_id: concepto.pedimento_id || null
        }))
      });
      if (!respuesta.ok) {
        throw new Error(respuesta.mensaje || "No se pudieron guardar los datos");
      }
      $mensajes_app.push({ tipo: "exito", mensaje: respuesta.mensaje });
      $mensajes_app = $mensajes_app;
      estado_preparacion = "pendiente";
      factura_uuid = "";
      return true;
    } catch (err) {
      $mensajes_app.push({ tipo: "error", mensaje: err.message || "Error al guardar los datos de facturación." });
      $mensajes_app = $mensajes_app;
      return false;
    } finally {
      guardando = false;
    }
  }

  async function emitir_factura() {
    const esProduccion = ambiente_facturacion === "produccion";
    const aviso = esProduccion
      ? "ATENCIÓN: CUCC está configurado en PRODUCCIÓN. Se emitirá un CFDI real con efectos fiscales. ¿Confirmas el timbrado?"
      : "Se enviará el CFDI al ambiente SANDBOX de CUCC. ¿Confirmas la prueba de timbrado?";
    if (!window.confirm(aviso)) return;

    emitiendo = true;
    try {
      const preparacionGuardada = await guardar_preparacion();
      if (!preparacionGuardada) return;
      const respuesta = await postData("/app/facturacion/emitir_factura", {
        pedido_id: pedido_datos._id,
        confirmar_emision: true,
        confirmar_produccion: esProduccion
      });
      if (!respuesta.ok) {
        if (respuesta.estado) estado_preparacion = respuesta.estado;
        throw new Error(respuesta.mensaje || "CUCC no pudo timbrar la factura.");
      }
      estado_preparacion = "emitida";
      factura_uuid = respuesta.uuid;
      factura_folio = `${respuesta.serie}-${respuesta.folio}`;
      $mensajes_app.push({ tipo: "exito", mensaje: respuesta.mensaje });
      $mensajes_app = $mensajes_app;
    } catch (err) {
      $mensajes_app.push({ tipo: "error", mensaje: err.message || "Error al emitir la factura." });
      $mensajes_app = $mensajes_app;
      if (err.message && err.message.includes("No reintentes")) {
        estado_preparacion = "requiere_revision";
      }
    } finally {
      emitiendo = false;
    }
  }

  $: formulario_valido = !!(
    receptor.rfc.trim() &&
    receptor.nombre.trim() &&
    codigo_postal_valido &&
    receptor.tipo_persona &&
    obtenerCatalogosFiscales(receptor.tipo_persona, receptor.uso_cfdi).regimenes.some(regimen => regimen.clave === receptor.regimen_fiscal) &&
    conceptos.length > 0 &&
    conceptos.every(concepto =>
      !requerir_pedimentos ||
      concepto.origen === "nacional" ||
      (concepto.origen === "importado" && concepto.pedimento_id)
    )
  );
  $: conceptos_sat_validos = conceptos.length > 0 && conceptos.every(concepto =>
    /^\d{8}$/.test(concepto.sat_clave_prod_serv) &&
    /^[A-Z0-9]{2,3}$/i.test(concepto.sat_clave_unidad) &&
    ["01", "02", "03", "04"].includes(concepto.sat_objeto_impuesto) &&
    (concepto.sat_objeto_impuesto !== "02" || !!concepto.impuestos_venta.iva) &&
    (!(Number(concepto.impuestos_venta.ieps_tasa_porcentaje) > 0) || concepto.sat_objeto_impuesto === "02")
  );
</script>

{#if visible}
  <div class="modal_backdrop" role="presentation" on:click|self={cerrar}>
    <section
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-preparar-factura"
    >
      <header class="modal_header">
        <div>
          <h2 id="titulo-preparar-factura">Preparar factura del pedido #{pedido && pedido.folio}</h2>
          <p>Ambiente CUCC: <strong>{ambiente_facturacion === "produccion" ? "PRODUCCIÓN (CFDI real)" : "SANDBOX / PRUEBAS"}</strong>. Confirma los datos fiscales y el origen de cada producto.</p>
        </div>
        <button type="button" class="cerrar" aria-label="Cerrar" on:click={cerrar}>×</button>
      </header>

      {#if cargando}
        <div class="estado">Cargando datos del pedido...</div>
      {:else if pedido_datos}
        <form on:submit|preventDefault={guardar_preparacion}>
          <section class="seccion">
            <h3>Datos del receptor</h3>
            {#if !cliente}
              <p class="aviso">Este pedido no tiene un cliente asociado. Captura los datos fiscales del receptor.</p>
            {/if}
            <div class="grid">
              <label>RFC
                <input required maxlength="13" bind:value={receptor.rfc} />
              </label>
              <label>Razón social / nombre
                <input required maxlength="254" bind:value={receptor.nombre} />
              </label>
              <label>Código postal fiscal
                <input required inputmode="numeric" maxlength="5" placeholder="5 dígitos" bind:value={receptor.codigo_postal} />
                {#if receptor.codigo_postal && !codigo_postal_valido}
                  <small class="error">Ingresa exactamente 5 dígitos numéricos.</small>
                {/if}
              </label>
              <label>Tipo de persona
                <select bind:value={receptor.tipo_persona} on:change={cambiar_tipo_persona} required>
                  <option value="">Selecciona...</option>
                  <option value="FISICA">Física</option>
                  <option value="MORAL">Moral</option>
                </select>
              </label>
              <label>Uso CFDI (clave SAT)
                <select bind:value={receptor.uso_cfdi} on:change={cambiar_uso_cfdi} disabled={!receptor.tipo_persona} required>
                  <option value="">Selecciona...</option>
                  {#each obtenerCatalogosFiscales(receptor.tipo_persona, "").usos as uso}
                    <option value={uso.clave}>{uso.clave} - {uso.descripcion}</option>
                  {/each}
                </select>
              </label>
              <label>Régimen fiscal (clave SAT)
                <select bind:value={receptor.regimen_fiscal} disabled={!receptor.uso_cfdi} required>
                  <option value="">Selecciona...</option>
                  {#each obtenerCatalogosFiscales(receptor.tipo_persona, receptor.uso_cfdi).regimenes as regimen}
                    <option value={regimen.clave}>{regimen.clave} - {regimen.descripcion}</option>
                  {/each}
                </select>
              </label>
              <label>Método de pago
                <select bind:value={metodo_pago}>
                  <option value="PUE">PUE - Pago en una sola exhibición</option>
                  <option value="PPD">PPD - Pago en parcialidades o diferido</option>
                </select>
              </label>
              <label>Forma de pago
                <select bind:value={forma_pago}>
                  <option value="01">01 - Efectivo</option>
                  <option value="02">02 - Cheque nominativo</option>
                  <option value="03">03 - Transferencia electrónica</option>
                  <option value="04">04 - Tarjeta de crédito</option>
                  <option value="05">05 - Monedero electrónico</option>
                  <option value="06">06 - Dinero electrónico</option>
                  <option value="08">08 - Vales de despensa</option>
                  <option value="12">12 - Dación en pago</option>
                  <option value="13">13 - Pago por subrogación</option>
                  <option value="14">14 - Pago por consignación</option>
                  <option value="15">15 - Condonación</option>
                  <option value="17">17 - Compensación</option>
                  <option value="23">23 - Novación</option>
                  <option value="24">24 - Confusión</option>
                  <option value="25">25 - Remisión de deuda</option>
                  <option value="26">26 - Prescripción o caducidad</option>
                  <option value="27">27 - A satisfacción del acreedor</option>
                  <option value="28">28 - Tarjeta de débito</option>
                  <option value="29">29 - Tarjeta de servicios</option>
                  <option value="30">30 - Aplicación de anticipos</option>
                  <option value="31">31 - Intermediario pagos</option>
                  <option value="99">99 - Por definir</option>
                </select>
              </label>
            </div>
          </section>

          <section class="seccion">
            <h3>Productos del pedido</h3>
            {#if requerir_pedimentos}
              <p class="ayuda">Marca cada producto como importado o nacional. Si es importado, selecciona un pedimento asociado al producto.</p>
            {/if}
            <div class="tabla_scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Importe</th>
                    {#if requerir_pedimentos}
                      <th>Origen</th>
                      <th>Pedimento</th>
                    {/if}
                  </tr>
                </thead>
                <tbody>
                  {#each conceptos as concepto}
                    <tr>
                      <td>
                        <strong>{concepto.nombre}</strong>
                        {#if concepto.codigo}<small>Código: {concepto.codigo}</small>{/if}
                        <small>ClaveProdServ: {concepto.sat_clave_prod_serv || "Falta configurar"}</small>
                        <small>ClaveUnidad: {concepto.sat_clave_unidad || "Falta configurar"}</small>
                        <small>ObjetoImp: {concepto.sat_objeto_impuesto || "Falta configurar"}</small>
                        <small>IVA venta: {concepto.impuestos_venta.iva || "Falta configurar"} · IEPS: {concepto.impuestos_venta.ieps_tasa_porcentaje || 0}%</small>
                      </td>
                      <td>{concepto.cantidad}</td>
                      <td>{pedido_datos.moneda} {Number(concepto.precio || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td>{pedido_datos.moneda} {(Number(concepto.cantidad || 0) * Number(concepto.precio || 0)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      {#if requerir_pedimentos}
                      <td>
                        <select bind:value={concepto.origen} on:change={() => cambiar_origen(concepto)} required>
                          <option value="">Seleccionar...</option>
                          <option value="importado">Importado</option>
                          <option value="nacional">Nacional</option>
                        </select>
                      </td>
                      <td>
                        {#if concepto.origen === "importado"}
                          <select bind:value={concepto.pedimento_id} required>
                            <option value="">Seleccionar pedimento...</option>
                            {#each pedimentos_producto(concepto) as pedimento}
                              <option value={pedimento._id}>{pedimento.numero_pedimento}</option>
                            {/each}
                          </select>
                          {#if pedimentos_producto(concepto).length === 0}
                            <small class="error">No hay pedimento registrado para este producto.</small>
                          {/if}
                        {:else}
                          <span class="sin_pedimento">No aplica</span>
                        {/if}
                      </td>
                      {/if}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </section>

          <div class="resumen">
            Total del pedido: <strong>{pedido_datos.moneda} {Number(pedido_datos.total_pedido || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
          </div>
          {#if estado_preparacion === "requiere_revision" || estado_preparacion === "emitiendo"}
            <p class="aviso error">La respuesta del PAC fue incierta. No vuelvas a emitir hasta revisar el estado en CUCC.</p>
          {:else if estado_preparacion === "emitida" && factura_uuid}
            <p class="confirmacion">Factura timbrada {factura_folio ? `(${factura_folio})` : ""} · UUID: {factura_uuid}</p>
            <div class="descargas">
              <a href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(factura_uuid)}&tipo=pdf`}>Descargar PDF</a>
              <a href={`/app/facturacion/descargar-comprobante?uuid=${encodeURIComponent(factura_uuid)}&tipo=xml`}>Descargar XML</a>
            </div>
          {:else}
            <p class="nota">El total del pedido ya incluye impuestos; al timbrar se desglosan IVA/IEPS sin alterar el importe cobrado. El XML y PDF se consultan directamente en CUCC y no se guardan en el servidor.</p>
            {#if !conceptos_sat_validos}
              <p class="aviso">No se puede timbrar todavía: configura ClaveProdServ, ClaveUnidad, ObjetoImp e impuestos de venta en cada producto.</p>
            {/if}
          {/if}

          <footer class="acciones">
            <button type="button" class="secundario" on:click={cerrar}>Cancelar</button>
            {#if estado_preparacion !== "emitida" && estado_preparacion !== "requiere_revision" && estado_preparacion !== "emitiendo"}
              <button type="submit" class="primario" disabled={!formulario_valido || guardando || emitiendo}>
                {guardando ? "Guardando..." : "Guardar datos de facturación"}
              </button>
              {#if estado_preparacion === "pendiente"}
                <button type="button" class="timbrar" on:click={emitir_factura} disabled={!formulario_valido || !conceptos_sat_validos || guardando || emitiendo}>
                  {emitiendo ? "Enviando a CUCC..." : (ambiente_facturacion === "produccion" ? "Timbrar CFDI real" : "Timbrar en sandbox")}
                </button>
              {/if}
            {/if}
          </footer>
        </form>
      {/if}
    </section>
  </div>
{/if}

<style>
  .modal_backdrop { position: fixed; inset: 0; z-index: 2000; background: rgba(15, 23, 42, .65); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { width: min(1000px, 100%); max-height: 92vh; overflow-y: auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.3); color: #1e293b; }
  .modal_header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; z-index: 1; }
  h2, h3, p { margin-top: 0; }
  h2 { margin-bottom: 4px; font-size: 20px; }
  .modal_header p, .ayuda { color: #64748b; font-size: 13px; margin-bottom: 0; }
  .cerrar { border: 0; background: transparent; font-size: 28px; cursor: pointer; line-height: 1; color: #64748b; }
  .seccion { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 16px; margin-bottom: 14px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; }
  input, select { min-height: 38px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #1e293b; font: inherit; font-weight: 400; }
  .tabla_scroll { overflow-x: auto; margin-top: 14px; }
  table { width: 100%; border-collapse: collapse; min-width: 680px; font-size: 13px; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  th { color: #475569; background: #f8fafc; }
  td:first-child { min-width: 200px; }
  td small { display: block; color: #64748b; margin-top: 3px; }
  td select { width: 100%; }
  .aviso { padding: 10px; border-radius: 5px; background: #fff7ed; color: #9a3412; font-size: 13px; }
  .error { color: #b91c1c !important; }
  .sin_pedimento { color: #64748b; }
  .estado { padding: 50px 24px; text-align: center; color: #64748b; }
  .resumen { padding: 16px 24px 0; text-align: right; }
  .nota { padding: 8px 24px 0; color: #64748b; font-size: 12px; }
  .acciones { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px 24px; }
  .acciones button { border: 0; border-radius: 5px; padding: 10px 16px; cursor: pointer; font-weight: 600; }
  .secundario { background: #e2e8f0; color: #334155; }
  .primario { background: #2563eb; color: white; }
  .timbrar { background: #15803d; color: white; }
  .primario:disabled { opacity: .5; cursor: not-allowed; }
  .timbrar:disabled { opacity: .5; cursor: not-allowed; }
  .confirmacion { margin: 12px 24px; padding: 10px; background: #dcfce7; color: #166534; border-radius: 5px; }
  .descargas { display: flex; gap: 12px; padding: 0 24px 8px; }
  .descargas a { color: #1d4ed8; }
  @media (max-width: 650px) {
    .modal_backdrop { padding: 8px; }
    .modal_header, .seccion { padding-left: 16px; padding-right: 16px; }
    .grid { grid-template-columns: 1fr; }
  }
</style>
