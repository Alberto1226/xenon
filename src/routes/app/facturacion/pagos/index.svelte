<script>
  import { onMount } from "svelte";
  import { postData, mensajes_app } from "./../../../stores";
  import Paginacion from "./../../componentes/paginacion/index.svelte";
  import SaldosAFavor from "./_SaldosAFavor.svelte";

  const FORMAS_PAGO = [
    { clave: "01", descripcion: "01 - Efectivo" },
    { clave: "02", descripcion: "02 - Cheque nominativo" },
    { clave: "03", descripcion: "03 - Transferencia electrónica de fondos" },
    { clave: "04", descripcion: "04 - Tarjeta de crédito" },
    { clave: "05", descripcion: "05 - Monedero electrónico" },
    { clave: "06", descripcion: "06 - Dinero electrónico" },
    { clave: "28", descripcion: "28 - Tarjeta de débito" },
    { clave: "29", descripcion: "29 - Tarjeta de servicios" },
    { clave: "17", descripcion: "17 - Compensación" },
    { clave: "31", descripcion: "31 - Intermediario pagos" }
  ];

  const FORMAS_CON_CUENTA = ["02", "03", "04", "05", "06", "28", "29"];

  let pestana = "registrar"; // "registrar" | "saldos" | "historial" | "cuentas"
  let usar_saldo_a_favor = false;
  let refSaldosAFavor; // "registrar" | "historial" | "cuentas"

  // Selector y buscador de cliente
  let buscar_cliente = "";
  let clientes = [];
  let cliente = null;
  let facturas_pendientes = [];
  let cuentas_empresa = [];
  let temporizador_cliente;

  // Información del Pago (replica InformacionPago.jsx de CUCC)
  let fecha_pago = obtenerFechaHoraLocal();
  let forma_pago = "03";
  let moneda = "MXN";
  let tipo_cambio = 1;
  let operacion_referencia = "";
  let cuenta_destino_id = "";
  let ordenante = { banco: "", rfc_banco: "", numero_cuenta: "" };
  let notas = "";

  // Facturas Relacionadas (replica FacturasRelacionadas.jsx y ListadoDatosFactura.jsx de CUCC)
  let factura_seleccion_id = "";
  let facturas_seleccionadas = [];

  // Estados de carga y acción
  let guardando = false;
  let timbrando_directo = false;
  let clave_idempotencia = nueva_clave();

  // Historial
  let pagos_historial = [];
  let pagina_actual = 1;
  let total_paginas = 1;
  let ha_cambiado_pagina_actual = false;
  let cargando_historial = false;

  // Cuentas Bancarias
  let lista_cuentas = [];
  let cuenta_form = { id: "", banco: "", rfc_banco: "", numero_cuenta: "", alias: "" };

  // Modal para ver y corregir errores de timbrado
  let error_modal = null;

  function ver_detalle_error(p) {
    error_modal = {
      pago: p,
      error: (p.rep && p.rep.error) ? p.rep.error : "No se especificó detalle de error devuelto por el PAC.",
      estado: p.rep && p.rep.estado
    };
  }

  function cerrar_modal_error() {
    error_modal = null;
  }

  // Reactividad
  $: requiere_cuenta = (!usar_saldo_a_favor && FORMAS_CON_CUENTA.includes(forma_pago));

  $: monto_total = redondear(
    facturas_seleccionadas.reduce((s, f) => s + (Number(f.importe_abono) || 0), 0)
  );

  $: total_iva_dr = redondear(
    facturas_seleccionadas.reduce((sum, f) => {
      if (f.objeto_impuesto !== "02") return sum;
      return sum + (f.traslados_proporcionales || []).reduce((s, t) => s + (Number(t.importe_dr) || 0), 0);
    }, 0)
  );

  $: if (ha_cambiado_pagina_actual) {
    ha_cambiado_pagina_actual = false;
    cargar_historial();
  }

  onMount(async () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tab") === "saldos") {
        pestana = "saldos";
      }
    }
    await buscar_clientes();
    await cargar_cuentas_bancarias();
  });

  function nueva_clave() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function obtenerFechaHoraLocal() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function redondear(v) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  }

  function dinero(v) {
    return Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function fecha_formato(v) {
    if (!v) return "-";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-MX");
  }

  function limite_rep(p) {
    if (!p || !p.fecha_pago) return null;
    const f = new Date(p.fecha_pago);
    return new Date(f.getFullYear(), f.getMonth() + 1, 10);
  }

  function avisar(tipo, mensaje) {
    $mensajes_app.push({ tipo, mensaje });
    $mensajes_app = $mensajes_app;
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      avisar("exito", "Copiado al portapapeles.");
    } catch (e) {
      avisar("info", texto);
    }
  }

  // --- Buscador de clientes ---
  async function buscar_clientes() {
    const r = await postData("/app/facturacion/pagos/clientes", { buscar: buscar_cliente });
    clientes = r.ok ? (r.clientes || []) : [];
  }

  function al_buscar_cliente() {
    clearTimeout(temporizador_cliente);
    temporizador_cliente = setTimeout(buscar_clientes, 350);
  }

  async function elegir_cliente(c) {
    cliente = c;
    factura_seleccion_id = "";
    facturas_seleccionadas = [];
    clave_idempotencia = nueva_clave();
    await cargar_facturas_cliente();
  }

  
  function al_cambiar_usar_saldo() {
    if (usar_saldo_a_favor) {
      forma_pago = "17";
      operacion_referencia = "Saldo a favor / Abono a capital";
    } else {
      forma_pago = "03";
      operacion_referencia = "";
    }
  }

  async function manejar_usar_saldo_para_cobro(e) {
    const cl = e.detail && e.detail.cliente;
    if (!cl) return;
    await elegir_cliente(cl);
    usar_saldo_a_favor = true;
    al_cambiar_usar_saldo();
    pestana = "registrar";
  }

  function deseleccionar_cliente() {
    cliente = null;
    facturas_pendientes = [];
    factura_seleccion_id = "";
    facturas_seleccionadas = [];
  }

  async function cargar_facturas_cliente() {
    if (!cliente || !cliente._id) return;
    const r = await postData("/app/facturacion/pagos/facturas_pendientes", { cliente_id: cliente._id });
    if (!r.ok) return avisar("error", r.mensaje || "No se pudieron consultar las facturas del cliente.");
    facturas_pendientes = r.facturas || [];
    if (cliente) {
      if (r.cliente && r.cliente.saldo_a_favor !== undefined) {
        cliente.saldo_a_favor = r.cliente.saldo_a_favor;
      } else if (r.saldo_a_favor !== undefined) {
        cliente.saldo_a_favor = r.saldo_a_favor;
      }
    }
    cuentas_empresa = r.cuentas || [];
    if (cuentas_empresa.length > 0 && !cuenta_destino_id) {
      cuenta_destino_id = cuentas_empresa[0]._id;
    }
  }

  // --- Facturas Relacionadas ---
  function agregar_factura_relacionada() {
    if (!factura_seleccion_id) {
      return avisar("info", "Selecciona una factura del desplegable.");
    }
    const yaExiste = facturas_seleccionadas.some(f => String(f._id) === String(factura_seleccion_id));
    if (yaExiste) {
      return avisar("alerta", "Esta factura ya fue agregada a la lista.");
    }
    const f = facturas_pendientes.find(item => String(item._id) === String(factura_seleccion_id));
    if (!f) return;

    const saldo = redondear(f.saldo_pendiente);
    const nueva = {
      _id: f._id,
      uuid: f.uuid,
      serie: f.serie || "",
      folio: f.folio || "",
      folio_pedido: f.folio_pedido || 0,
      moneda: f.moneda || "MXN",
      tipo_cambio: 1,
      total: redondear(f.total),
      subtotal: redondear(f.subtotal),
      saldo_anterior: saldo,
      importe_abono: saldo,
      saldo_insoluto: 0,
      num_parcialidad: f.parcialidad_siguiente || 1,
      objeto_impuesto: f.objeto_impuesto || "02",
      traslados_base: f.traslados || [],
      traslados_proporcionales: []
    };

    recalcular_linea(nueva);
    facturas_seleccionadas = [...facturas_seleccionadas, nueva];
    factura_seleccion_id = "";
    avisar("exito", `Factura ${nueva.serie}${nueva.folio} agregada al comprobante.`);
  }

  function remover_factura_relacionada(id) {
    facturas_seleccionadas = facturas_seleccionadas.filter(f => String(f._id) !== String(id));
    avisar("info", "Factura removida del comprobante.");
  }

  function liquidar_linea(f) {
    f.importe_abono = f.saldo_anterior;
    recalcular_linea(f);
    facturas_seleccionadas = [...facturas_seleccionadas];
  }

  function on_cambio_abono(f) {
    let abono = redondear(Number(f.importe_abono) || 0);
    if (abono < 0) abono = 0;
    if (abono > f.saldo_anterior) {
      avisar("alerta", `El importe no puede ser mayor al saldo anterior (${dinero(f.saldo_anterior)}).`);
      abono = f.saldo_anterior;
    }
    f.importe_abono = abono;
    recalcular_linea(f);
    facturas_seleccionadas = [...facturas_seleccionadas];
  }

  function recalcular_linea(f) {
    const abono = Number(f.importe_abono) || 0;
    f.saldo_insoluto = Math.max(0, redondear(f.saldo_anterior - abono));

    const totalFactura = Number(f.total) || 0;
    const proporcion = totalFactura > 0 ? (abono / totalFactura) : 0;

    f.traslados_proporcionales = (f.traslados_base || []).map(t => {
      const base_dr = redondear(Number(t.base) * proporcion);
      const importe_dr = t.factor === "Exento" ? 0 : redondear(Number(t.importe) * proporcion);
      return {
        impuesto: t.impuesto || "002",
        factor: t.factor || "Tasa",
        tasa: t.tasa !== null && t.tasa !== undefined ? t.tasa : 0.16,
        base_dr,
        importe_dr
      };
    });
  }

  // --- Registro y Timbrado ---
  async function registrar_pago(timbrar_inmediatamente = false) {
    if (!cliente || !cliente._id) {
      return avisar("error", "Selecciona un cliente.");
    }
    if (facturas_seleccionadas.length === 0) {
      return avisar("error", "Agrega al menos una factura a la recepción de pago.");
    }
    if (monto_total <= 0) {
      return avisar("error", "El monto total a pagar debe ser mayor a cero.");
    }
    if (usar_saldo_a_favor && cliente && (monto_total > ((cliente.saldo_a_favor || 0) + 0.0001))) {
      return avisar("error", "El monto a liquidar (" + dinero(monto_total) + ") supera el saldo a favor disponible del cliente (" + dinero(cliente.saldo_a_favor) + ").");
    }
    if (requiere_cuenta && !cuenta_destino_id) {
      return avisar("error", "Selecciona la cuenta bancaria de destino (empresa).");
    }

    guardando = true;
    timbrando_directo = timbrar_inmediatamente;

    try {
      const aplicaciones = facturas_seleccionadas.map(f => ({
        factura_id: f._id,
        num_parcialidad: Number(f.num_parcialidad) || 1,
        saldo_anterior: f.saldo_anterior,
        importe_pagado: Number(f.importe_abono),
        saldo_insoluto: f.saldo_insoluto
      }));

      const payload = {
        cliente_id: cliente._id,
        fecha_pago,
        forma_pago,
        moneda,
        tipo_cambio,
        referencia: operacion_referencia,
        notas,
        cuenta_destino_id: requiere_cuenta ? cuenta_destino_id : "",
        cuenta_ordenante: requiere_cuenta ? ordenante : {},
        clave_idempotencia,
        usar_saldo_a_favor,
        origen: usar_saldo_a_favor ? "saldo_a_favor" : "cobro",
        aplicaciones
      };

      const res = await postData("/app/facturacion/pagos/registrar", payload);
      if (!res.ok) throw new Error(res.mensaje || "Error al registrar el cobro.");

      const nuevoPagoId = res.pago_id;
      avisar("exito", res.mensaje || "Pago registrado exitosamente.");

      if (timbrar_inmediatamente && nuevoPagoId) {
        await ejecutar_timbrado(nuevoPagoId);
      }

      if (usar_saldo_a_favor && cliente) {
        cliente.saldo_a_favor = Math.max(0, redondear((cliente.saldo_a_favor || 0) - monto_total));
      }
      usar_saldo_a_favor = false;
      facturas_seleccionadas = [];
      operacion_referencia = "";
      notas = "";
      clave_idempotencia = nueva_clave();
      await cargar_facturas_cliente();
      await buscar_clientes();

      if (timbrar_inmediatamente) {
        pestana = "historial";
        await cargar_historial();
      }
    } catch (err) {
      console.error(err);
      avisar("error", err.message || "No se pudo registrar la recepción de pago.");
    } finally {
      guardando = false;
      timbrando_directo = false;
    }
  }

  async function ejecutar_timbrado(pago_id) {
    let r = await postData("/app/facturacion/pagos/timbrar_rep", {
      pago_id,
      confirmar_emision: true,
      confirmar_produccion: false
    });

    if (!r.ok && /producción/i.test(r.mensaje || "")) {
      if (confirm("El ambiente configurado en CUCC es PRODUCCIÓN. ¿Autorizas el timbrado fiscal real ante el SAT?")) {
        r = await postData("/app/facturacion/pagos/timbrar_rep", {
          pago_id,
          confirmar_emision: true,
          confirmar_produccion: true
        });
      }
    }

    if (r.ok) {
      avisar("exito", `¡Complemento de Pago (REP) timbrado con éxito! UUID: ${r.uuid || ""}`);
    } else {
      avisar("error", r.mensaje || "No se pudo timbrar el complemento ante el PAC.");
    }
  }

  // --- Historial ---
  async function cargar_historial() {
    cargando_historial = true;
    try {
      const r = await postData("/app/facturacion/pagos/lista", { pagina: pagina_actual });
      if (r.ok) {
        pagos_historial = r.pagos || [];
        total_paginas = r.paginas || 1;
      }
    } catch (e) {
      console.error(e);
    } finally {
      cargando_historial = false;
    }
  }

  async function timbrar_desde_historial(pago) {
    if (!confirm(`¿Timbrar Complemento de Pago (REP) para el cobro folio ${pago.folio} (${dinero(pago.monto_total)})?`)) return;
    await ejecutar_timbrado(pago._id);
    await cargar_historial();
  }

  async function cancelar_desde_historial(pago) {
    const motivo = prompt("Indica el motivo de la cancelación del cobro:");
    if (!motivo) return;
    const r = await postData("/app/facturacion/pagos/cancelar", { pago_id: pago._id, motivo });
    avisar(r.ok ? "exito" : "error", r.mensaje || "Resultado de la cancelación.");
    await cargar_historial();
    await buscar_clientes();
    if (cliente) await cargar_facturas_cliente();
  }

  // --- Cuentas Bancarias ---
  async function cargar_cuentas_bancarias() {
    const r = await postData("/app/facturacion/pagos/cuentas", { accion: "listar" });
    if (r.ok) lista_cuentas = r.cuentas || [];
  }

  async function guardar_cuenta_bancaria() {
    const r = await postData("/app/facturacion/pagos/cuentas", {
      accion: "guardar",
      ...cuenta_form
    });
    if (r.ok) {
      avisar("exito", r.mensaje || "Cuenta guardada.");
      cuenta_form = { id: "", banco: "", rfc_banco: "", numero_cuenta: "", alias: "" };
      await cargar_cuentas_bancarias();
    } else {
      avisar("error", r.mensaje || "No se pudo guardar la cuenta.");
    }
  }

  async function alternar_cuenta_bancaria(c) {
    const r = await postData("/app/facturacion/pagos/cuentas", {
      accion: "activar",
      id: c._id,
      activa: !c.activa
    });
    if (r.ok) {
      await cargar_cuentas_bancarias();
    }
  }
</script>

<div class="contenedor">
  <!-- Encabezado Principal Premium -->
  <header class="encabezado">
    <div class="titulo-area">
      <div class="icono-badge">
        <i class="material-icons">receipt_long</i>
      </div>
      <div>
        <h1>Recepción de Pagos (REP 2.0 / CFDI 4.0)</h1>
        <p>Abono y liquidación de facturas PPD con emisión de Complemento de Pago timbrado en CUCC PAC</p>
      </div>
    </div>
  </header>

  <!-- Navegación por pestañas -->
  <nav class="pestanas">
    <button
      class:activa={pestana === "registrar"}
      on:click={() => (pestana = "registrar")}
    >
      <i class="material-icons">add_circle_outline</i>
      Nueva Recepción de Pago
    </button>
    <button
      class:activa={pestana === "saldos"}
      on:click={() => {
        pestana = "saldos";
        if (refSaldosAFavor && refSaldosAFavor.cargar_clientes) {
          refSaldosAFavor.cargar_clientes();
        }
      }}
    >
      <i class="material-icons">savings</i>
      Abonos a Capital (Saldos a Favor)
    </button>
    <button
      class:activa={pestana === "historial"}
      on:click={() => {
        pestana = "historial";
        cargar_historial();
      }}
    >
      <i class="material-icons">history</i>
      Historial de Pagos y REP
    </button>
    <button
      class:activa={pestana === "cuentas"}
      on:click={() => {
        pestana = "cuentas";
        cargar_cuentas_bancarias();
      }}
    >
      <i class="material-icons">account_balance</i>
      Cuentas Bancarias Empresa
    </button>
  </nav>

  <!-- PESTAÑA: REGISTRAR PAGO -->
  {#if pestana === "registrar"}
    <!-- Paso 1: Selección del Cliente -->
    <section class="card mb-4">
      <div class="seccion-header">
        <span class="paso-badge">1</span>
        <h3>Selección de Cliente</h3>
      </div>

      {#if !cliente}
        <div class="buscador-caja">
          <i class="material-icons icono-buscar">search</i>
          <input
            type="text"
            class="input-buscar"
            placeholder="Buscar cliente con facturas pendientes por nombre o RFC..."
            bind:value={buscar_cliente}
            on:input={al_buscar_cliente}
          />
        </div>

        {#if clientes.length === 0}
          <div class="alerta-info">
            <i class="material-icons">info</i>
            <span>No se encontraron clientes con facturas PPD vigentes con saldo pendiente.</span>
          </div>
        {:else}
          <div class="clientes-grid">
            {#each clientes as c (c._id)}
              <div class="cliente-item" on:click={() => elegir_cliente(c)}>
                <div class="cliente-info">
                  <span class="cliente-nombre">{c.nombre}</span>
                  <span class="cliente-rfc">{c.rfc || "RFC sin registrar"}</span>
                </div>
                <div class="cliente-stats">
                  <span class="badge-facturas">{c.facturas} {c.facturas === 1 ? "factura" : "facturas"}</span>
                  <span class="cliente-saldo">{dinero(c.saldo)}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <!-- Cliente Seleccionado -->
        <div class="cliente-seleccionado">
          <div class="cliente-detalle">
            <i class="material-icons icono-check">verified_user</i>
            <div>
              <h4>{cliente.nombre}</h4>
              <span class="rfc-chip">RFC: {cliente.rfc || (cliente.datos_fiscales && cliente.datos_fiscales.rfc) || "XAXX010101000"}</span>
            </div>
          </div>
          <button class="btn-secundario btn-sm" on:click={deseleccionar_cliente}>
            <i class="material-icons">swap_horiz</i>
            Cambiar Cliente
          </button>
        </div>

        {#if cliente && cliente.saldo_a_favor > 0}
          <div class="banner-saldo-favor" class:activo={usar_saldo_a_favor}>
            <div class="banner-saldo-contenido">
              <i class="material-icons icono-saldo-favor">savings</i>
              <div>
                <strong>Este cliente dispone de {dinero(cliente.saldo_a_favor)} de Saldo a Favor</strong>
                <p>Puedes aplicar este saldo anticipado para abonar o liquidar sus facturas sin requerir nuevo ingreso bancario.</p>
              </div>
            </div>
            <label class="switch-saldo-label">
              <input type="checkbox" bind:checked={usar_saldo_a_favor} on:change={al_cambiar_usar_saldo} />
              <span class="switch-txt">{usar_saldo_a_favor ? "✓ Aplicando Saldo a Favor" : "Usar Saldo a Favor"}</span>
            </label>
          </div>
        {/if}
      {/if}
    </section>

    {#if cliente}
      <div class="grid-recepcion">
        <!-- Columna Izquierda: Información del Pago (InformacionPago.jsx) -->
        <div class="card panel-pago">
          <div class="seccion-header">
            <span class="paso-badge">2</span>
            <h3>Información del Pago</h3>
          </div>

          <div class="form-vertical">
            <div class="campo">
              <label for="input-fecha-pago">Fecha y Hora de Pago</label>
              <input
                id="input-fecha-pago"
                type="datetime-local"
                bind:value={fecha_pago}
                required
              />
            </div>

            <div class="campo">
              <label for="select-forma-pago">Forma de Pago (SAT)</label>
              <select id="select-forma-pago" bind:value={forma_pago}>
                {#each FORMAS_PAGO as fp}
                  <option value={fp.clave}>{fp.descripcion}</option>
                {/each}
              </select>
            </div>

            <div class="fila-moneda-tc">
              <div class="campo">
                <label for="input-moneda">Moneda</label>
                <input id="input-moneda" type="text" value="MXN" readonly class="input-readonly" />
              </div>
              <div class="campo">
                <label for="input-tipo-cambio">Tipo de Cambio</label>
                <input id="input-tipo-cambio" type="number" step="0.0001" bind:value={tipo_cambio} readonly class="input-readonly" />
              </div>
            </div>

            <div class="campo">
              <label for="input-operacion">Nº Operación / Referencia / Rastreo SPEI</label>
              <input
                id="input-operacion"
                type="text"
                placeholder="Ej. Cheque 4021, Rastreo SPEI, Autorización..."
                maxlength="100"
                bind:value={operacion_referencia}
              />
            </div>

            <!-- Cuentas Bancarias Si Aplica -->
            {#if requiere_cuenta}
              <div class="bloque-bancario">
                <span class="subtitulo-seccion">
                  <i class="material-icons">account_balance</i>
                  Datos Bancarios (Requeridos por forma de pago)
                </span>

                <div class="campo mt-2">
                  <label for="select-cuenta-destino">Cuenta Destino (Beneficiario)</label>
                  <select id="select-cuenta-destino" bind:value={cuenta_destino_id}>
                    <option value="">-- Selecciona cuenta de la empresa --</option>
                    {#each cuentas_empresa as c}
                      <option value={c._id}>{c.banco} - {c.numero_cuenta} ({c.alias || c.rfc_banco})</option>
                    {/each}
                  </select>
                </div>

                <div class="campo mt-2">
                  <label for="input-ord-banco">Banco Ordenante (Cliente)</label>
                  <input
                    id="input-ord-banco"
                    type="text"
                    placeholder="Ej. BBVA, Santander, Banorte..."
                    bind:value={ordenante.banco}
                  />
                </div>

                <div class="fila-doble mt-2">
                  <div class="campo">
                    <label for="input-ord-rfc">RFC Banco Ordenante</label>
                    <input
                      id="input-ord-rfc"
                      type="text"
                      placeholder="Ej. BBA830831LJ2"
                      maxlength="13"
                      bind:value={ordenante.rfc_banco}
                    />
                  </div>
                  <div class="campo">
                    <label for="input-ord-cuenta">Nº Cuenta Ordenante</label>
                    <input
                      id="input-ord-cuenta"
                      type="text"
                      placeholder="10 a 18 dígitos..."
                      maxlength="18"
                      bind:value={ordenante.numero_cuenta}
                    />
                  </div>
                </div>
              </div>
            {/if}

            <div class="campo mt-2">
              <label for="input-notas">Notas Internas (Opcional)</label>
              <textarea
                id="input-notas"
                rows="2"
                placeholder="Observaciones internas del cobro..."
                bind:value={notas}
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Facturas Relacionadas y Desglose Proporcional (ListadoDatosFactura.jsx) -->
        <div class="card panel-facturas">
          <div class="seccion-header">
            <span class="paso-badge">3</span>
            <h3>Facturas Relacionadas (DoctoRelacionado)</h3>
          </div>

          <!-- Selector de Facturas PPD pendientes -->
          <div class="selector-factura-caja">
            <div class="flex-grow">
              <label for="select-factura-ppd" class="label-sm">Buscar / Seleccionar Factura con Saldo Pendiente</label>
              <select id="select-factura-ppd" bind:value={factura_seleccion_id}>
                <option value="">-- Elige una factura PPD del cliente --</option>
                {#each facturas_pendientes as f}
                  <option value={f._id}>
                    {f.serie}{f.folio} {f.folio_pedido ? `[Pedido #${f.folio_pedido}]` : ""} | Saldo: {dinero(f.saldo_pendiente)} | Total: {dinero(f.total)} | {f.uuid.slice(0, 8)}...
                  </option>
                {/each}
              </select>
            </div>
            <button class="btn-agregar" on:click={agregar_factura_relacionada} disabled={!factura_seleccion_id}>
              <i class="material-icons">add</i>
              Agregar Factura
            </button>
          </div>

          <!-- Listado de Facturas Relacionadas Agregadas -->
          {#if facturas_seleccionadas.length === 0}
            <div class="caja-vacia">
              <i class="material-icons icono-vacio">receipt</i>
              <p>No has agregado ninguna factura para abonar en este pago.</p>
              <small>Selecciona una factura en el menú superior y pulsa <b>Agregar Factura</b>.</small>
            </div>
          {:else}
            <div class="lista-facturas-agregadas">
              {#each facturas_seleccionadas as item, idx (item._id)}
                <div class="tarjeta-docto">
                  <!-- Cabecera de la Factura -->
                  <div class="docto-header">
                    <div class="docto-titulo">
                      <span class="badge-folio">{item.serie}{item.folio}</span>
                      {#if item.folio_pedido}
                        <span class="badge-pedido">Pedido #{item.folio_pedido}</span>
                      {/if}
                      <span class="uuid-label" title={item.uuid} on:click={() => copiarTexto(item.uuid)}>
                        UUID: {item.uuid}
                        <i class="material-icons icono-copiar">content_copy</i>
                      </span>
                    </div>
                    <button
                      class="btn-quitar"
                      title="Quitar factura del comprobante"
                      on:click={() => remover_factura_relacionada(item._id)}
                    >
                      <i class="material-icons">delete</i>
                    </button>
                  </div>

                  <!-- Fila 1: Datos Generales SAT -->
                  <div class="docto-grid-sat">
                    <div>
                      <span class="campo-titulo">Moneda / TC</span>
                      <span class="campo-valor">{item.moneda} (1.0)</span>
                    </div>
                    <div>
                      <span class="campo-titulo">Total Factura</span>
                      <span class="campo-valor">{dinero(item.total)}</span>
                    </div>
                    <div>
                      <span class="campo-titulo">Objeto Impuesto</span>
                      <select class="select-sm" bind:value={item.objeto_impuesto} on:change={() => recalcular_linea(item)}>
                        <option value="02">02 - Sí objeto de impuesto</option>
                        <option value="01">01 - No objeto de impuesto</option>
                      </select>
                    </div>
                  </div>

                  <!-- Fila 2: Operación Financiera (Parcialidad, Saldo Anterior, Abono, Nuevo Saldo) -->
                  <div class="docto-operacion">
                    <div class="campo-op">
                      <label>Nº Parcialidad</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        class="input-sm text-center"
                        bind:value={item.num_parcialidad}
                      />
                    </div>
                    <div class="campo-op">
                      <label>Saldo Anterior</label>
                      <input
                        type="text"
                        class="input-sm input-readonly text-right font-mono"
                        value={dinero(item.saldo_anterior)}
                        readonly
                      />
                    </div>
                    <div class="campo-op destacada">
                      <div class="label-con-boton">
                        <label>Importe a Abonar</label>
                        <button class="btn-enlace" on:click={() => liquidar_linea(item)}>Liquidar</button>
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        max={item.saldo_anterior}
                        step="0.01"
                        class="input-sm text-right font-bold"
                        bind:value={item.importe_abono}
                        on:input={() => on_cambio_abono(item)}
                      />
                    </div>
                    <div class="campo-op">
                      <label>Nuevo Saldo Insoluto</label>
                      <input
                        type="text"
                        class="input-sm input-readonly text-right font-mono"
                        class:saldo-cero={item.saldo_insoluto === 0}
                        value={dinero(item.saldo_insoluto)}
                        readonly
                      />
                    </div>
                  </div>

                  <!-- Fila 3: Desglose Proporcional de Impuestos (TrasladoDR) como CUCC -->
                  {#if item.objeto_impuesto === "02" && item.traslados_proporcionales.length > 0}
                    <div class="panel-impuestos-dr">
                      <span class="titulo-impuestos">
                        <i class="material-icons">account_tree</i>
                        Impuestos Proporcionales DR (Calculados en vivo según abono)
                      </span>
                      <table class="tabla-impuestos-dr">
                        <thead>
                          <tr>
                            <th>BaseDR</th>
                            <th>Impuesto</th>
                            <th>Factor</th>
                            <th>Tasa / Cuota</th>
                            <th class="der">ImporteDR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {#each item.traslados_proporcionales as t}
                            <tr>
                              <td class="font-mono">{dinero(t.base_dr)}</td>
                              <td>{t.impuesto === "002" ? "002 (IVA)" : t.impuesto}</td>
                              <td>{t.factor}</td>
                              <td>{(Number(t.tasa) * 100).toFixed(2)}% ({t.tasa})</td>
                              <td class="der font-mono font-bold">{dinero(t.importe_dr)}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Barra de Totales y Acciones Principales -->
      <footer class="barra-acciones card mt-4">
        <div class="resumen-totales">
          <div class="item-resumen">
            <span class="label-resumen">Facturas Aplicadas</span>
            <span class="valor-resumen">{facturas_seleccionadas.length}</span>
          </div>
          <div class="item-resumen">
            <span class="label-resumen">IVA Proporcional Trasladado</span>
            <span class="valor-resumen text-info">{dinero(total_iva_dr)}</span>
          </div>
          <div class="item-resumen total-destacado">
            <span class="label-resumen">Total de la Recepción de Pago</span>
            <span class="valor-resumen text-success">{dinero(monto_total)}</span>
          </div>
        </div>

        <div class="botones-acciones">
          <button
            class="btn-secundario"
            disabled={guardando || facturas_seleccionadas.length === 0 || monto_total <= 0}
            on:click={() => registrar_pago(false)}
          >
            <i class="material-icons">save</i>
            {guardando && !timbrando_directo ? "Guardando..." : "Guardar Pago (Sin timbrar)"}
          </button>

          <button
            class="btn-primario"
            disabled={guardando || facturas_seleccionadas.length === 0 || monto_total <= 0}
            on:click={() => registrar_pago(true)}
          >
            <i class="material-icons">verified</i>
            {timbrando_directo ? "Timbrando con PAC..." : "Registrar y Timbrar REP Ahora"}
          </button>
        </div>
      </footer>
    {/if}
  {/if}

  <!-- PESTAÑA: HISTORIAL DE PAGOS Y REP -->
  {#if pestana === "historial"}
    <section class="card">
      <div class="seccion-header-entre">
        <div>
          <h3>Historial de Pagos y Complementos (REP)</h3>
          <p class="subtitulo-gris">Consulta y timbra los cobros registrados con saldos aplicados</p>
        </div>
        <button class="btn-secundario btn-sm" on:click={cargar_historial} disabled={cargando_historial}>
          <i class="material-icons">refresh</i>
          Actualizar
        </button>
      </div>

      {#if cargando_historial}
        <div class="caja-vacia">
          <p>Cargando historial de pagos...</p>
        </div>
      {:else if pagos_historial.length === 0}
        <div class="caja-vacia">
          <i class="material-icons icono-vacio">inbox</i>
          <p>No hay pagos registrados aún.</p>
        </div>
      {:else}
        <div class="tabla-contenedor">
          <table class="tabla-principal">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha Pago</th>
                <th>Cliente</th>
                <th>Forma Pago</th>
                <th class="der">Monto Cobrado</th>
                <th>Facturas Abonadas</th>
                <th>Estado REP</th>
                <th class="der">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {#each pagos_historial as p (p._id)}
                <tr class:cancelado={p.status === "Cancelado"}>
                  <td class="font-bold">#{p.folio}</td>
                  <td>{fecha_formato(p.fecha_pago)}</td>
                  <td>
                    <span class="font-bold">{p.cliente && p.cliente.nombre}</span>
                    <small class="block text-gris">{p.cliente && p.cliente.rfc}</small>
                  </td>
                  <td>{p.forma_pago}</td>
                  <td class="der font-mono font-bold">{dinero(p.monto_total)}</td>
                  <td>
                    <div class="tags-facturas">
                      {#each (p.aplicaciones || []) as ap}
                        <span class="chip-factura" title={`Saldo ant: ${dinero(ap.saldo_anterior)} -> Insoluto: ${dinero(ap.saldo_insoluto)}`}>
                          {ap.serie}{ap.folio_factura} (P.{ap.num_parcialidad}): <b>{dinero(ap.importe_pagado)}</b>
                        </span>
                      {/each}
                    </div>
                  </td>
                  <td>
                    {#if p.status === "Cancelado"}
                      <span class="badge-status cancelado">Cancelado</span>
                    {:else if p.rep.estado === "timbrado"}
                      <div class="badge-status timbrado">
                        <i class="material-icons text-sm">check_circle</i>
                        Timbrado {p.rep.serie}{p.rep.folio}
                      </div>
                      <small class="block font-mono text-xs mt-1" title={p.rep.uuid}>
                        {p.rep.uuid ? p.rep.uuid.slice(0, 13) + "..." : ""}
                      </small>
                    {:else if p.rep.estado === "sin_timbrar"}
                      <div class="badge-status pendiente">
                        <i class="material-icons text-sm">schedule</i>
                        Sin Timbrar
                      </div>
                      <small class="block text-alerta text-xs mt-1">Límite SAT: {fecha_formato(limite_rep(p))}</small>
                    {:else if ["fallido", "requiere_revision"].includes(p.rep.estado)}
                      <div class="badge-status" class:error={p.rep.estado === "fallido"} class:revision={p.rep.estado === "requiere_revision"}>
                        <i class="material-icons text-sm">{p.rep.estado === "requiere_revision" ? "sync_problem" : "error_outline"}</i>
                        <span>{p.rep.estado === "requiere_revision" ? "Requiere Revisión" : "Rechazo PAC"}</span>
                      </div>
                    {:else}
                      <span class="badge-status">{p.rep.estado}</span>
                    {/if}
                  </td>
                  <td class="der">
                    <div class="acciones-celda">
                      {#if p.status === "Registrado"}
                        {#if p.rep.estado === "timbrado"}
                          <a
                            class="btn-icono"
                            title="Descargar XML timbrado"
                            href={`/app/facturacion/descargar-comprobante?uuid=${p.rep.uuid}&tipo=xml`}
                            target="_blank"
                          >
                            <i class="material-icons">code</i>
                          </a>
                          <a
                            class="btn-icono"
                            title="Descargar PDF"
                            href={`/app/facturacion/descargar-comprobante?uuid=${p.rep.uuid}&tipo=pdf`}
                            target="_blank"
                          >
                            <i class="material-icons">picture_as_pdf</i>
                          </a>
                        {:else if ["sin_timbrar", "fallido", "requiere_revision"].includes(p.rep.estado)}
                          {#if p.rep.error || ["fallido", "requiere_revision"].includes(p.rep.estado)}
                            <button
                              type="button"
                              class="btn-accion-error"
                              title="Ver detalle del error devuelto por el PAC"
                              on:click={() => ver_detalle_error(p)}
                            >
                              <i class="material-icons">help_outline</i>
                              Ver Error
                            </button>
                          {/if}
                          <a
                            class="btn-icono btn-xml-intento"
                            title="Descargar XML generado / enviado para verificar el error"
                            href={`/app/facturacion/pagos/descargar_xml?pago_id=${p._id}`}
                            download={`REP-pago-${p.folio}-intento.xml`}
                          >
                            <i class="material-icons">code</i>
                          </a>
                          <button
                            type="button"
                            class="btn-accion-timbrar"
                            title="Timbrar o Reintentar timbrado con CUCC PAC"
                            on:click={() => timbrar_desde_historial(p)}
                          >
                            <i class="material-icons">refresh</i>
                            {p.rep.estado === "sin_timbrar" ? "Timbrar REP" : "Reintentar REP"}
                          </button>
                          <button
                            type="button"
                            class="btn-accion-cancelar"
                            title="Cancelar pago y revertir saldos en facturas"
                            on:click={() => cancelar_desde_historial(p)}
                          >
                            <i class="material-icons">cancel</i>
                          </button>
                        {/if}
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="mt-4">
          <Paginacion bind:total_paginas bind:ha_cambiado_pagina_actual bind:pagina_actual />
        </div>
      {/if}
    </section>
  {/if}

  <!-- PESTAÑA: ABONOS Y SALDOS A FAVOR -->
  {#if pestana === "saldos"}
    <SaldosAFavor
      bind:this={refSaldosAFavor}
      cuentas_empresa={cuentas_empresa}
      on:usar_saldo_para_cobro={manejar_usar_saldo_para_cobro}
    />
  {/if}

  <!-- PESTAÑA: CUENTAS BANCARIAS -->
  {#if pestana === "cuentas"}
    <section class="card">
      <div class="seccion-header">
        <span class="paso-badge"><i class="material-icons text-sm">account_balance</i></span>
        <h3>Cuentas Bancarias de la Empresa</h3>
      </div>
      <p class="subtitulo-gris mb-3">Registra las cuentas receptoras que se declaran en los complementos de recepción de pagos</p>

      <div class="form-cuentas-grid">
        <div class="campo">
          <label for="cb-banco">Nombre del Banco</label>
          <input id="cb-banco" type="text" placeholder="Ej. BBVA México, Banorte..." bind:value={cuenta_form.banco} />
        </div>
        <div class="campo">
          <label for="cb-rfc">RFC del Banco</label>
          <input id="cb-rfc" type="text" placeholder="Ej. BBA830831LJ2" maxlength="13" bind:value={cuenta_form.rfc_banco} />
        </div>
        <div class="campo">
          <label for="cb-numero">Nº de Cuenta (10 a 18 dígitos o CLABE)</label>
          <input id="cb-numero" type="text" placeholder="0123456789..." maxlength="18" bind:value={cuenta_form.numero_cuenta} />
        </div>
        <div class="campo">
          <label for="cb-alias">Alias / Identificador</label>
          <input id="cb-alias" type="text" placeholder="Ej. Cuenta Principal Cobranza..." bind:value={cuenta_form.alias} />
        </div>
      </div>

      <div class="mt-3 flex gap-2">
        <button class="btn-primario btn-sm" on:click={guardar_cuenta_bancaria}>
          <i class="material-icons">save</i>
          {cuenta_form.id ? "Actualizar Cuenta" : "Agregar Cuenta"}
        </button>
        {#if cuenta_form.id}
          <button class="btn-secundario btn-sm" on:click={() => (cuenta_form = { id: "", banco: "", rfc_banco: "", numero_cuenta: "", alias: "" })}>
            Cancelar
          </button>
        {/if}
      </div>

      <div class="tabla-contenedor mt-4">
        <table class="tabla-principal">
          <thead>
            <tr>
              <th>Banco</th>
              <th>RFC</th>
              <th>Número de Cuenta</th>
              <th>Alias</th>
              <th>Estado</th>
              <th class="der">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each lista_cuentas as c (c._id)}
              <tr class:cancelado={!c.activa}>
                <td class="font-bold">{c.banco}</td>
                <td>{c.rfc_banco}</td>
                <td class="font-mono">{c.numero_cuenta}</td>
                <td>{c.alias || "-"}</td>
                <td>
                  <span class="badge-status" class:timbrado={c.activa} class:cancelado={!c.activa}>
                    {c.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td class="der">
                  <button
                    class="btn-secundario btn-sm"
                    on:click={() => (cuenta_form = { id: c._id, banco: c.banco, rfc_banco: c.rfc_banco, numero_cuenta: c.numero_cuenta, alias: c.alias })}
                  >
                    Editar
                  </button>
                  <button class="btn-secundario btn-sm" on:click={() => alternar_cuenta_bancaria(c)}>
                    {c.activa ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- MODAL PARA VER DETALLE DE ERROR Y CORREGIRLO -->
  {#if error_modal}
    <div class="modal-fondo" on:click|self={cerrar_modal_error}>
      <div class="modal-caja modal-error">
        <div class="modal-header header-error">
          <div class="header-icono-titulo">
            <i class="material-icons icono-modal-error">error_outline</i>
            <div>
              <h3>Detalle de Error de Timbrado (REP)</h3>
              <p>Cobro Folio #{error_modal.pago.folio} &bull; {error_modal.pago.cliente ? error_modal.pago.cliente.nombre : "Cliente"}</p>
            </div>
          </div>
          <button type="button" class="btn-cerrar-modal" on:click={cerrar_modal_error}>&times;</button>
        </div>

        <div class="modal-cuerpo">
          <div class="info-resumen-error">
            <div>
              <span class="label-info">Estado actual:</span>
              <span class="badge-status error">{error_modal.pago.rep ? error_modal.pago.rep.estado : "Error"}</span>
            </div>
            <div>
              <span class="label-info">Monto cobrado:</span>
              <span class="font-mono font-bold">{dinero(error_modal.pago.monto_total)}</span>
            </div>
            <div>
              <span class="label-info">Facturas aplicadas:</span>
              <span class="font-bold">{(error_modal.pago.aplicaciones || []).length} factura(s)</span>
            </div>
          </div>

          <div class="caja-error-tecnico">
            <div class="caja-error-header">
              <i class="material-icons text-sm">terminal</i>
              <span>Respuesta devuelta por PAC CUCC / SAT</span>
            </div>
            <pre class="error-mensaje-pre">{error_modal.error}</pre>
          </div>

          <div class="caja-sugerencia">
            <div class="sugerencia-header">
              <i class="material-icons text-info">lightbulb</i>
              <b>Explicación y Opciones de Corrección:</b>
            </div>
            <ul class="lista-pasos-solucion">
              {#if /CRP20255/i.test(error_modal.error)}
                <li><b>Regla SAT CRP20255:</b> "El valor del campo BaseDR que corresponde a Traslado debe ser mayor que cero". La base gravable proporcional de los traslados no puede ser 0.00.</li>
                <li><b>Corrección aplicada:</b> El generador de XML fiscal ya fue actualizado para recalcular e incluir únicamente bases gravables válidas y mayores a cero.</li>
                <li>Puedes pulsar <b>"Reintentar Timbrado"</b> para emitir el comprobante con los importes corregidos ante el PAC.</li>
                <li>O si prefieres desaplicar los abonos y liberar las facturas para volver a capturar el cobro, pulsa <b>"Cancelar Cobro"</b>.</li>
              {:else if /contrase|usuario|credenciales/i.test(error_modal.error)}
                <li>El PAC reportó que las credenciales SOAP de CUCC son incorrectas. Revisa el usuario y contraseña en <b>Perfil Fiscal</b> antes de reintentar.</li>
              {:else}
                <li>Revisa que los RFC y datos del cliente y emisor estén vigentes ante el SAT.</li>
                <li>Pulsa <b>"Reintentar Timbrado"</b> para reemitir el complemento REP ante el PAC.</li>
                <li>Si prefieres desaplicar los saldos y liberar las facturas, pulsa <b>"Cancelar Cobro"</b>.</li>
              {/if}
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secundario" on:click={cerrar_modal_error}>
            Cerrar
          </button>
          <a
            class="btn-secundario btn-descargar-xml-modal"
            title="Descargar el archivo XML generado que se intentó timbrar ante el PAC"
            href={`/app/facturacion/pagos/descargar_xml?pago_id=${error_modal.pago._id}`}
            download={`REP-pago-${error_modal.pago.folio}-intento.xml`}
          >
            <i class="material-icons">code</i>
            Descargar XML del intento
          </a>
          <button
            type="button"
            class="btn-peligro"
            title="Cancelar este cobro para desaplicar los saldos y permitir volver a cobrar"
            on:click={() => {
              const p = error_modal.pago;
              cerrar_modal_error();
              cancelar_desde_historial(p);
            }}
          >
            <i class="material-icons">cancel</i>
            Cancelar Cobro y Liberar Facturas
          </button>
          <button
            type="button"
            class="btn-primario"
            title="Reintentar el timbrado con el PAC CUCC"
            on:click={() => {
              const p = error_modal.pago;
              cerrar_modal_error();
              timbrar_desde_historial(p);
            }}
          >
            <i class="material-icons">refresh</i>
            Reintentar Timbrado (REP)
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .contenedor {
    padding: 24px;
    max-width: 1300px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
  }

  /* Encabezado */
  .encabezado {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #fff;
    padding: 24px 28px;
    border-radius: 14px;
    margin-bottom: 20px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  }
  .titulo-area {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .icono-badge {
    background: rgba(56, 189, 248, 0.18);
    color: #38bdf8;
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
  }
  .icono-badge i { font-size: 32px; }
  h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  h3 { margin: 0; font-size: 17px; font-weight: 700; }
  h4 { margin: 0; font-size: 15px; font-weight: 600; }
  p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  .subtitulo-gris { color: #64748b; font-size: 13px; margin-top: 4px; }

  /* Pestañas */
  .pestanas {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  .pestanas button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pestanas button:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
  .pestanas button.activa {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
  }
  .pestanas button i { font-size: 18px; }

  /* Cards */
  .card {
    background: #ffffff;
    border-radius: 14px;
    padding: 22px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .mb-4 { margin-bottom: 20px; }
  .mt-4 { margin-top: 20px; }
  .mt-2 { margin-top: 10px; }
  .mt-3 { margin-top: 14px; }
  .mb-3 { margin-bottom: 14px; }

  .seccion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .seccion-header-entre {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .paso-badge {
    background: #e0f2fe;
    color: #0284c7;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
  }

  /* Buscador de clientes */
  .buscador-caja {
    position: relative;
    margin-bottom: 14px;
  }
  .icono-buscar {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 20px;
  }
  .input-buscar {
    width: 100%;
    padding: 11px 14px 11px 40px;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .input-buscar:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  }

  .clientes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    max-height: 220px;
    overflow-y: auto;
  }
  .cliente-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cliente-item:hover {
    border-color: #0284c7;
    background: #f0f9ff;
    transform: translateY(-1px);
  }
  .cliente-info { display: flex; flex-direction: column; gap: 2px; }
  .cliente-nombre { font-size: 13px; font-weight: 600; color: #0f172a; }
  .cliente-rfc { font-size: 11px; color: #64748b; font-family: monospace; }
  .cliente-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .badge-facturas {
    background: #e2e8f0;
    color: #475569;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .cliente-saldo { font-size: 13px; font-weight: 700; color: #b91c1c; font-family: monospace; }

  .cliente-seleccionado {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 14px 18px;
    border-radius: 10px;
  }
  .cliente-detalle {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .icono-check { color: #16a34a; font-size: 28px; }
  .rfc-chip {
    font-family: monospace;
    font-size: 12px;
    color: #166534;
    background: #dcfce7;
    padding: 2px 8px;
    border-radius: 6px;
  }

    /* Grid Recepción (2 Columnas) */
  .grid-recepcion {
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .grid-recepcion { grid-template-columns: 1fr; }
  }

  /* Formulario Izquierda */
  .form-vertical { display: flex; flex-direction: column; gap: 14px; width: 100%; box-sizing: border-box; }
  .campo { display: flex; flex-direction: column; gap: 5px; min-width: 0; width: 100%; box-sizing: border-box; }
  .campo label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label-sm { font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
  .campo input, .campo select, .campo textarea {
    width: 100%;
    min-width: 0;
    padding: 9px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 13px;
    box-sizing: border-box;
    background: #fff;
  }
  .campo input:focus, .campo select:focus, .campo textarea:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  }
  .fila-doble {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .fila-moneda-tc {
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr);
    gap: 10px;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .input-readonly { background: #f8fafc; color: #64748b; cursor: not-allowed; }

  .bloque-bancario {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    padding: 12px;
    border-radius: 9px;
    box-sizing: border-box;
    width: 100%;
  }
  .subtitulo-seccion {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
  }
  .subtitulo-seccion i { font-size: 16px; color: #0284c7; }

  /* Panel Facturas Derecha */
  .selector-factura-caja {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    background: #f8fafc;
    padding: 14px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    margin-bottom: 16px;
  }
  .flex-grow { flex: 1; }
  .btn-agregar {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #0284c7;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;
  }
  .btn-agregar:hover:not(:disabled) { background: #0369a1; }
  .btn-agregar:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Lista de facturas agregadas */
  .caja-vacia {
    text-align: center;
    padding: 36px 20px;
    color: #64748b;
  }
  .icono-vacio { font-size: 42px; color: #cbd5e1; margin-bottom: 8px; }
  .lista-facturas-agregadas { display: flex; flex-direction: column; gap: 16px; }

  .tarjeta-docto {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 11px;
    padding: 16px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    transition: border-color 0.2s;
  }
  .tarjeta-docto:hover { border-color: #94a3b8; }

  .docto-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
  }
  .docto-titulo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge-folio {
    background: #0f172a;
    color: #fff;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 13px;
    font-family: monospace;
  }
  .badge-pedido {
    background: #e0f2fe;
    color: #0369a1;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 12px;
  }
  .uuid-label {
    font-family: monospace;
    font-size: 11px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
  .uuid-label:hover { color: #0284c7; text-decoration: underline; }
  .icono-copiar { font-size: 14px; }
  .btn-quitar {
    background: #fee2e2;
    color: #dc2626;
    border: none;
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .btn-quitar:hover { background: #fecaca; }
  .btn-quitar i { font-size: 18px; }

  .docto-grid-sat {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 10px;
    background: #f8fafc;
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .campo-titulo { display: block; font-size: 11px; color: #64748b; font-weight: 600; }
  .campo-valor { font-size: 13px; font-weight: 600; color: #0f172a; }
  .select-sm {
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 12px;
    background: #fff;
  }

  .docto-operacion {
    display: grid;
    grid-template-columns: 110px 1fr 1.3fr 1fr;
    gap: 12px;
    align-items: flex-end;
  }
  @media (max-width: 768px) {
    .docto-operacion { grid-template-columns: 1fr 1fr; }
  }
  .campo-op { display: flex; flex-direction: column; gap: 4px; }
  .campo-op label { font-size: 11px; font-weight: 700; color: #475569; }
  .input-sm {
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    font-size: 13px;
    box-sizing: border-box;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-mono { font-family: monospace; }
  .font-bold { font-weight: 700; }
  .destacada {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 6px 8px;
    border-radius: 8px;
  }
  .label-con-boton {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .btn-enlace {
    background: none;
    border: none;
    color: #16a34a;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0;
  }
  .btn-enlace:hover { text-decoration: underline; }
  .saldo-cero { color: #16a34a; font-weight: 700; }

  /* Impuestos DR Desglose */
  .panel-impuestos-dr {
    margin-top: 12px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 10px 14px;
  }
  .titulo-impuestos {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #1d4ed8;
    margin-bottom: 6px;
  }
  .titulo-impuestos i { font-size: 14px; }
  .tabla-impuestos-dr {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .tabla-impuestos-dr th {
    text-align: left;
    padding: 4px 6px;
    color: #475569;
    border-bottom: 1px solid #bfdbfe;
    font-size: 11px;
  }
  .tabla-impuestos-dr td {
    padding: 4px 6px;
    border-bottom: 1px solid #dbeafe;
    color: #1e293b;
  }

  /* Barra de Acciones */
  .barra-acciones {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
  }
  .resumen-totales {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }
  .item-resumen { display: flex; flex-direction: column; gap: 2px; }
  .label-resumen { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
  .valor-resumen { font-size: 16px; font-weight: 700; font-family: monospace; }
  .total-destacado .valor-resumen { font-size: 22px; }
  .text-info { color: #0284c7; }
  .text-success { color: #15803d; }

  .botones-acciones { display: flex; gap: 12px; }
  .btn-primario {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #16a34a;
    color: #ffffff;
    border: none;
    border-radius: 9px;
    padding: 11px 20px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
    transition: all 0.2s;
  }
  .btn-primario:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); }
  .btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-secundario {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    color: #1e293b;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-secundario:hover:not(:disabled) { background: #f1f5f9; }
  .btn-secundario:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; }

  /* Tablas Historial y Cuentas */
  .tabla-contenedor {
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }
  .tabla-principal {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .tabla-principal th {
    background: #f8fafc;
    padding: 10px 12px;
    border-bottom: 2px solid #e2e8f0;
    text-align: left;
    font-weight: 700;
    color: #475569;
    font-size: 12px;
  }
  .tabla-principal td {
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  .tabla-principal tr:hover { background: #f8fafc; }
  .cancelado { opacity: 0.55; }
  .der { text-align: right; }
  .block { display: block; }
  .text-gris { color: #64748b; }
  .text-xs { font-size: 11px; }
  .text-sm { font-size: 14px; }
  .text-alerta { color: #dc2626; font-weight: 600; }

  .tags-facturas { display: flex; flex-direction: column; gap: 4px; }
  .chip-factura {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
  }

  .badge-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .badge-status.timbrado { background: #dcfce7; color: #15803d; }
  .badge-status.pendiente { background: #fef3c7; color: #b45309; }
  .badge-status.error { background: #fee2e2; color: #dc2626; }
  .badge-status.revision { background: #fef3c7; color: #b45309; }
  .badge-status.cancelado { background: #f1f5f9; color: #64748b; }

  .acciones-celda {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .btn-icono {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: #f1f5f9;
    color: #0284c7;
    text-decoration: none;
    transition: background 0.15s;
  }
  .btn-icono:hover { background: #e0f2fe; }
  .btn-icono i { font-size: 16px; }
  .btn-xml-intento {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    color: #0284c7;
  }
  .btn-xml-intento:hover {
    background: #e0f2fe;
    border-color: #38bdf8;
    color: #0369a1;
  }

  .btn-accion-timbrar {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #0284c7;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-accion-timbrar:hover { background: #0369a1; }
  .btn-accion-timbrar i { font-size: 14px; }

  .btn-accion-cancelar {
    display: inline-flex;
    align-items: center;
    background: #fee2e2;
    color: #dc2626;
    border: none;
    border-radius: 6px;
    padding: 5px;
    cursor: pointer;
  }
  .btn-accion-cancelar:hover { background: #fecaca; }
  .btn-accion-cancelar i { font-size: 16px; }

  /* Form Cuentas Grid */
  .form-cuentas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }
  .flex { display: flex; }
  .gap-2 { gap: 8px; }

  /* Estilos de Botones y Badges de Error */
  .btn-badge-error {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, opacity 0.15s;
    font-size: 11px;
    font-weight: 600;
  }
  .btn-badge-error:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .enlace-ver-motivo {
    display: flex;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: none;
    color: #dc2626;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin-top: 2px;
  }
  .enlace-ver-motivo:hover {
    text-decoration: underline;
  }
  .btn-accion-error {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-accion-error:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }
  .btn-accion-error i { font-size: 14px; }

  /* Modal de Detalle de Error */
  .modal-fondo {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
  }
  .modal-caja.modal-error {
    background: #ffffff;
    border-radius: 14px;
    max-width: 650px;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: modalIn 0.2s ease-out;
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .modal-header.header-error {
    background: #fff1f2;
    border-bottom: 1px solid #fecdd3;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-icono-titulo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .icono-modal-error {
    font-size: 32px;
    color: #e11d48;
  }
  .header-error h3 {
    margin: 0;
    font-size: 17px;
    color: #9f1239;
    font-weight: 700;
  }
  .header-error p {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: #be123c;
  }
  .btn-cerrar-modal {
    background: transparent;
    border: none;
    font-size: 24px;
    color: #9f1239;
    cursor: pointer;
    line-height: 1;
  }
  .modal-cuerpo {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }
  .info-resumen-error {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    background: #f8fafc;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    font-size: 13px;
  }
  .label-info {
    display: block;
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .caja-error-tecnico {
    background: #0f172a;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #334155;
  }
  .caja-error-header {
    background: #1e293b;
    color: #94a3b8;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid #334155;
  }
  .error-mensaje-pre {
    margin: 0;
    padding: 12px;
    color: #f87171;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }
  .caja-sugerencia {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 12px 16px;
  }
  .sugerencia-header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #166534;
    font-size: 13px;
    margin-bottom: 8px;
  }
  .lista-pasos-solucion {
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
    color: #15803d;
    line-height: 1.6;
  }
  .modal-footer {
    padding: 14px 20px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
  }
  .btn-peligro {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #dc2626;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-peligro:hover {
    background: #b91c1c;
  }

  /* Banner Saldo a Favor en Pago */
  .banner-saldo-favor {
    margin-top: 14px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 10px;
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
    transition: all 0.2s ease;
  }

  .banner-saldo-favor.activo {
    background: #dcfce7;
    border-color: #86efac;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
  }

  .banner-saldo-contenido {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icono-saldo-favor {
    font-size: 28px;
    color: #16a34a;
  }

  .banner-saldo-contenido strong {
    color: #14532d;
    font-size: 0.95rem;
    display: block;
  }

  .banner-saldo-contenido p {
    color: #166534;
    font-size: 0.82rem;
    margin: 2px 0 0 0;
  }

  .switch-saldo-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    background: #ffffff;
    border: 1px solid #86efac;
    padding: 6px 14px;
    border-radius: 20px;
    user-select: none;
    transition: all 0.15s ease;
  }

  .switch-saldo-label:hover {
    border-color: #22c55e;
    background: #f0fdf4;
  }

  .switch-saldo-label input[type="checkbox"] {
    accent-color: #16a34a;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .switch-txt {
    font-size: 0.85rem;
    font-weight: 700;
    color: #15803d;
  }
</style>
