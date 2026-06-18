<script>
  import { onMount } from "svelte";
  import { postData, mensaje_bueno, mensaje_error } from "../../stores";
  import { fade } from "svelte/transition";

  let activeTab = "list"; // "list", "new", "calculate"
  let loading = false;

  // List of pedimentos
  let pedimentos = [];
  let totalPedimentos = 0;
  let paginaActual = 1;
  let limite = 10;
  let paginasTotales = 1;

  // Selected pedimento for details or calculations
  let pedimentoSeleccionado = null;
  let metodologiaSeleccionada = "ad-valorem";
  let factorFijo = 15; // default 15%

  // New Pedimento Form data
  let nuevoPedimento = {
    numero_pedimento: "",
    clave_pedimento: "A1",
    fecha_pedimento: new Date().toISOString().substring(0, 10),
    tipo_cambio: 20.00,
    // Campos SAT oficiales de Cabecera
    aduana_despacho: "160",
    patente: "3387",
    regimen: "IMD",
    peso_bruto: 0,
    valor_dolares: 0,
    valor_aduana_mxn: 0,
    cove: "",
    proveedor: {
      nombre: "",
      tax_id: "",
      pais: "CHN"
    },
    // Desglose de incrementables y contribuciones del SAT
    incrementables_sat: {
      fletes: 0,
      seguros: 0,
      otros: 0
    },
    contribuciones_sat: {
      dta: 0,
      prv: 0,
      igi: 0,
      iva: 0,
      total_efectivo: 0
    },
    gastos_importacion: {
      Impuesto_Aduanal: 0,
      Flete: 0,
      Agente_Aduanal: 0,
      Seguridad: 0,
      otros: []
    },
    productos: []
  };

  // Temporary item inputs for adding products to new pedimento
  let tempProduct = {
    producto_id: "",
    cantidad: 1,
    precio_compra_usd: 0,
    fraccion_arancelaria: "",
    unidad_medida: "pza",
    // Campos SAT por partida
    sec: 1,
    nico: "00",
    marca: "",
    modelo: "",
    valor_aduana_partida_mxn: 0
  };

  let searchProductQuery = "";
  let allProducts = [];
  let filteredProducts = [];
  let showProductDropdown = false;
  let selectedProductName = "Selecciona un producto...";

  onMount(async () => {
    await cargarPedimentos();
    await cargarProductos();
  });

  async function cargarPedimentos() {
    loading = true;
    try {
      const res = await postData("app/pedimentos/lista", {
        pagina_actual: paginaActual,
        limite: limite
      });
      if (res.ok) {
        pedimentos = res.lista;
        totalPedimentos = res.total;
        paginasTotales = Math.ceil(totalPedimentos / limite) || 1;
      } else {
        mensaje_error(res.mensaje || "Error al cargar pedimentos.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de conexión al cargar pedimentos.");
    } finally {
      loading = false;
    }
  }

  async function cargarProductos() {
    try {
      const res = await postData("app/productos/lista_de_todos_los_productos");
      if (res.ok) {
        allProducts = res.lista;
        filteredProducts = allProducts;
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error al cargar la lista de productos.");
    }
  }

  // Filtrado de productos para el buscador predictivo
  $: {
    if (searchProductQuery.trim() === "") {
      filteredProducts = allProducts;
    } else {
      const q = searchProductQuery.toLowerCase();
      filteredProducts = allProducts.filter(
        (p) =>
          (p.nombre && p.nombre.toLowerCase().includes(q)) ||
          (p.codigo && p.codigo.toLowerCase().includes(q))
      );
    }
  }

  function selectProduct(p) {
    tempProduct.producto_id = p._id;
    selectedProductName = `${p.codigo || 'S/C'} - ${p.nombre}`;
    showProductDropdown = false;
    searchProductQuery = "";
  }

  function agregarOtrosGastos() {
    nuevoPedimento.gastos_importacion.otros = [
      ...nuevoPedimento.gastos_importacion.otros,
      { concepto: "", monto: 0 }
    ];
  }

  function removerOtrosGastos(index) {
    nuevoPedimento.gastos_importacion.otros.splice(index, 1);
    nuevoPedimento.gastos_importacion.otros = nuevoPedimento.gastos_importacion.otros;
  }

  function sincronizarGastosSat() {
    const c = nuevoPedimento.contribuciones_sat;
    const inc = nuevoPedimento.incrementables_sat;
    
    // Sumar contribuciones e incrementables
    const totalImpuestosSat = (c.igi || 0) + (c.iva || 0) + (c.dta || 0) + (c.prv || 0);
    nuevoPedimento.gastos_importacion.Impuesto_Aduanal = totalImpuestosSat;
    nuevoPedimento.gastos_importacion.Flete = inc.fletes || 0;
    
    mensaje_bueno("Gastos e impuestos del SAT sincronizados para prorrateo.");
  }

  function agregarProductoALista() {
    if (!tempProduct.producto_id) {
      mensaje_error("Por favor selecciona un producto");
      return;
    }
    if (tempProduct.cantidad <= 0) {
      mensaje_error("La cantidad debe ser mayor que 0");
      return;
    }
    if (tempProduct.precio_compra_usd < 0) {
      mensaje_error("El precio de compra no puede ser negativo");
      return;
    }

    const prodOriginal = allProducts.find(p => p._id === tempProduct.producto_id);

    nuevoPedimento.productos = [
      ...nuevoPedimento.productos,
      {
        producto: tempProduct.producto_id,
        nombre: prodOriginal ? prodOriginal.nombre : "Desconocido",
        codigo: prodOriginal ? prodOriginal.codigo : "",
        fraccion_arancelaria: tempProduct.fraccion_arancelaria,
        cantidad: tempProduct.cantidad,
        unidad_medida: tempProduct.unidad_medida,
        precio_compra_usd: tempProduct.precio_compra_usd,
        costo_fiscal_unitario_mxn: 0,
        // Nuevos campos SAT
        sec: tempProduct.sec,
        nico: tempProduct.nico,
        marca: tempProduct.marca,
        modelo: tempProduct.modelo,
        valor_aduana_partida_mxn: tempProduct.valor_aduana_partida_mxn
      }
    ];

    const siguientePartida = nuevoPedimento.productos.length + 1;

    // Resetear inputs temporales
    tempProduct = {
      producto_id: "",
      cantidad: 1,
      precio_compra_usd: 0,
      fraccion_arancelaria: "",
      unidad_medida: "pza",
      sec: siguientePartida,
      nico: "00",
      marca: "",
      modelo: "",
      valor_aduana_partida_mxn: 0
    };
    selectedProductName = "Selecciona un producto...";
  }

  function removerProductoDeLista(index) {
    nuevoPedimento.productos.splice(index, 1);
    nuevoPedimento.productos = nuevoPedimento.productos;
  }

  async function guardarPedimento() {
    if (!nuevoPedimento.numero_pedimento) {
      mensaje_error("Por favor ingresa el número de pedimento");
      return;
    }
    if (nuevoPedimento.productos.length === 0) {
      mensaje_error("Debes agregar al menos un producto al pedimento");
      return;
    }

    loading = true;
    try {
      const res = await postData("app/pedimentos/crear", nuevoPedimento);
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        // Resetear formulario
        nuevoPedimento = {
          numero_pedimento: "",
          clave_pedimento: "A1",
          fecha_pedimento: new Date().toISOString().substring(0, 10),
          tipo_cambio: 20.00,
          aduana_despacho: "160",
          patente: "3387",
          regimen: "IMD",
          peso_bruto: 0,
          valor_dolares: 0,
          valor_aduana_mxn: 0,
          cove: "",
          proveedor: {
            nombre: "",
            tax_id: "",
            pais: "CHN"
          },
          incrementables_sat: {
            fletes: 0,
            seguros: 0,
            otros: 0
          },
          contribuciones_sat: {
            dta: 0,
            prv: 0,
            igi: 0,
            iva: 0,
            total_efectivo: 0
          },
          gastos_importacion: {
            Impuesto_Aduanal: 0,
            Flete: 0,
            Agente_Aduanal: 0,
            Seguridad: 0,
            otros: []
          },
          productos: []
        };
        activeTab = "list";
        await cargarPedimentos();
      } else {
        mensaje_error(res.mensaje || "Error al crear el pedimento.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error al conectar con el servidor.");
    } finally {
      loading = false;
    }
  }

  async function registrarArribo(id) {
    if (!confirm("¿Confirmas que este cargamento ha arribado al almacén? Las existencias físicas se actualizarán automáticamente.")) {
      return;
    }
    loading = true;
    try {
      const res = await postData("app/pedimentos/arribar", { id_pedimento: id });
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        await cargarPedimentos();
      } else {
        mensaje_error(res.mensaje || "Error al registrar arribo.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de red al registrar arribo.");
    } finally {
      loading = false;
    }
  }

  function irACalcularCostos(ped) {
    pedimentoSeleccionado = ped;
    activeTab = "calculate";
  }

  async function guardarCalculoFiscal() {
    loading = true;
    try {
      const res = await postData("app/pedimentos/calcular_fiscales", {
        id_pedimento: pedimentoSeleccionado._id,
        metodologia: metodologiaSeleccionada,
        factor_fijo: factorFijo
      });
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        pedimentoSeleccionado = res.pedimento;
        await cargarPedimentos();
      } else {
        mensaje_error(res.mensaje || "Error al guardar el cálculo fiscal.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de comunicación con el servidor.");
    } finally {
      loading = false;
    }
  }

  function anterior() {
    if (paginaActual > 1) {
      paginaActual--;
      cargarPedimentos();
    }
  }

  function siguiente() {
    if (paginaActual < paginasTotales) {
      paginaActual++;
      cargarPedimentos();
    }
  }

  // Formateador de precios en MXN
  function formatMoney(amount) {
    return amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  // Sumatoria total de gastos indirectos de un pedimento
  function sumarGastosIndirectos(ped) {
    if (!ped || !ped.gastos_importacion) return 0;
    const g = ped.gastos_importacion;
    const otros = g.otros ? g.otros.reduce((acc, curr) => acc + (curr.monto || 0), 0) : 0;
    return (g.Impuesto_Aduanal || 0) + (g.Flete || 0) + (g.Agente_Aduanal || 0) + (g.Seguridad || 0) + otros;
  }
</script>

<svelte:head>
  <title>Pedimentos de Importación - Admin</title>
</svelte:head>

<!-- Overlay y loader de carga -->
{#if loading}
  <div class="overlay" transition:fade={{ duration: 150 }}></div>
  <div class="loader-container" transition:fade={{ duration: 150 }}>
    <div class="spinner"></div>
    <div class="cargando-texto">Procesando operaciones...</div>
  </div>
{/if}

<div class="vista-pedimentos">
  <!-- Pestañas del menú superior -->
  <div class="menu-tabs">
    <div
      class="tab {activeTab === 'list' ? 'active' : ''}"
      on:click={() => (activeTab = "list")}
    >
      <i class="material-icons">list</i> Lista de Pedimentos
    </div>
    <div
      class="tab {activeTab === 'new' ? 'active' : ''}"
      on:click={() => (activeTab = "new")}
    >
      <i class="material-icons">add_box</i> Registrar Nuevo Pedimento
    </div>
    {#if activeTab === 'calculate'}
      <div class="tab active">
        <i class="material-icons">calculate</i> Cálculo Fiscal: {pedimentoSeleccionado.numero_pedimento}
      </div>
    {/if}
  </div>

  <div class="content-container">
    <!-- SECCIÓN 1: LISTA DE PEDIMENTOS -->
    {#if activeTab === "list"}
      <div class="section-title mb-4">
        <h2>Registro de Pedimentos de Importación</h2>
        <p class="subtitulo">Visualiza los cargamentos en tránsito, registra su llegada y calcula sus precios fiscales.</p>
      </div>

      <div class="contenedor_ventana">
        {#if pedimentos.length === 0}
          <div class="centrado py-5 text-muted">
            <i class="material-icons empty-icon">local_shipping</i>
            <p class="mt-2 text-large">No se han registrado pedimentos todavía.</p>
          </div>
        {:else}
          <div class="table-responsive">
            <table class="table table-custom align-middle">
              <thead>
                <tr>
                  <th scope="col">Número de Pedimento</th>
                  <th scope="col">Fecha Pedimento</th>
                  <th scope="col">Estatus</th>
                  <th scope="col">Tipo de Cambio</th>
                  <th scope="col">Gastos Indirectos</th>
                  <th scope="col">Productos</th>
                  <th scope="col" class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {#each pedimentos as ped (ped._id)}
                  <tr>
                    <td>
                      <div class="font-bold text-dark">{ped.numero_pedimento}</div>
                      <div class="text-muted text-small">Clave: {ped.clave_pedimento}</div>
                    </td>
                    <td>{new Date(ped.fecha_pedimento).toLocaleDateString('es-MX')}</td>
                    <td>
                      {#if ped.status === 'transito'}
                        <span class="badge bg-warning text-dark">
                          <i class="material-icons inline-icon">sailing</i> En Tránsito
                        </span>
                      {:else}
                        <span class="badge bg-success">
                          <i class="material-icons inline-icon">check_circle</i> Arribado
                        </span>
                      {/if}
                    </td>
                    <td>{ped.tipo_cambio.toFixed(4)} MXN</td>
                    <td>{formatMoney(sumarGastosIndirectos(ped))}</td>
                    <td>
                      <div class="prod-count">{ped.productos.length} partida(s)</div>
                    </td>
                    <td class="text-center">
                      <button 
                        class="btn btn-action-blue me-2" 
                        on:click={() => irACalcularCostos(ped)}
                      >
                        <i class="material-icons text-medium">calculate</i> Costos
                      </button>

                      {#if ped.status === 'transito'}
                        <button 
                          class="btn btn-action-green" 
                          on:click={() => registrarArribo(ped._id)}
                        >
                          <i class="material-icons text-medium">warehouse</i> Arribar
                        </button>
                      {:else}
                        <span class="arribado-label">
                          <i class="material-icons text-medium vertical-align-middle">done_all</i>
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- Paginación -->
      {#if totalPedimentos > 0}
        <div class="paginacion-area mt-4">
          <div class="info-paginacion">
            Mostrando bloques de <strong>{limite}</strong> pedimentos. Total: <strong>{totalPedimentos}</strong>.
          </div>
          <div class="controles-paginacion">
            <button class="btn btn-page" disabled={paginaActual === 1} on:click={anterior}>
              <i class="material-icons">keyboard_arrow_left</i>
            </button>
            <span class="page-indicator">Página <strong>{paginaActual}</strong> de <strong>{paginasTotales}</strong></span>
            <button class="btn btn-page" disabled={paginaActual === paginasTotales} on:click={siguiente}>
              <i class="material-icons">keyboard_arrow_right</i>
            </button>
          </div>
        </div>
      {/if}

    <!-- SECCIÓN 2: REGISTRAR NUEVO PEDIMENTO -->
    {:else if activeTab === "new"}
      <div class="section-title mb-4">
        <h2>Registrar Nuevo Pedimento de Importación (SAT)</h2>
        <p class="subtitulo">Ingresa los datos generales, desglosa los gastos de flete e impuestos y agrega los productos.</p>
      </div>

      <div class="secciones-verticales">
        <!-- 1. Datos Generales y Aduanales -->
        <div class="card p-4 mb-4">
          <h4 class="card-section-title mb-3">1. Datos Generales y Aduanales (SAT)</h4>
          
          <div class="form-row">
            <div class="form-group fg-large">
              <label class="form-label font-bold">Número de Pedimento:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="15 dígitos oficiales" 
                bind:value={nuevoPedimento.numero_pedimento}
              />
            </div>
            <div class="form-group fg-small">
              <label class="form-label font-bold">Clave SAT:</label>
              <input 
                type="text" 
                class="form-control" 
                bind:value={nuevoPedimento.clave_pedimento}
              />
            </div>
            <div class="form-group fg-small">
              <label class="form-label font-bold">Régimen:</label>
              <input 
                type="text" 
                class="form-control" 
                bind:value={nuevoPedimento.regimen}
              />
            </div>
            <div class="form-group fg-small">
              <label class="form-label font-bold">Patente:</label>
              <input 
                type="text" 
                class="form-control" 
                bind:value={nuevoPedimento.patente}
              />
            </div>
            <div class="form-group fg-small">
              <label class="form-label font-bold">Aduana E/S:</label>
              <input 
                type="text" 
                class="form-control" 
                bind:value={nuevoPedimento.aduana_despacho}
              />
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group fg-medium">
              <label class="form-label font-bold">Tipo de Cambio (MXN):</label>
              <input 
                type="number" 
                step="0.0001" 
                class="form-control" 
                bind:value={nuevoPedimento.tipo_cambio}
              />
            </div>
            <div class="form-group fg-medium">
              <label class="form-label font-bold">Fecha de Registro / Pago:</label>
              <input 
                type="date" 
                class="form-control" 
                bind:value={nuevoPedimento.fecha_pedimento}
              />
            </div>
            <div class="form-group fg-medium">
              <label class="form-label font-bold">Peso Bruto (kg):</label>
              <input 
                type="number" 
                step="0.001" 
                class="form-control" 
                bind:value={nuevoPedimento.peso_bruto}
              />
            </div>
            <div class="form-group fg-medium">
              <label class="form-label font-bold">COVE / Factura:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Ej. COVE257UVCJ84"
                bind:value={nuevoPedimento.cove}
              />
            </div>
          </div>

          <h5 class="mt-4 mb-3 text-dark border-bottom pb-2 font-bold text-medium">Datos del Proveedor Extranjero</h5>
          <div class="form-row">
            <div class="form-group fg-large">
              <label class="form-label font-bold">Razón Social Proveedor:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Nombre de la empresa extranjera"
                bind:value={nuevoPedimento.proveedor.nombre}
              />
            </div>
            <div class="form-group fg-medium">
              <label class="form-label font-bold">Tax ID / ID Fiscal:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Identificador fiscal"
                bind:value={nuevoPedimento.proveedor.tax_id}
              />
            </div>
            <div class="form-group fg-small">
              <label class="form-label font-bold">País Origen:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Ej. CHN"
                bind:value={nuevoPedimento.proveedor.pais}
              />
            </div>
          </div>
        </div>

        <!-- 2. Gastos e Impuestos SAT -->
        <div class="card p-4 mb-4">
          <h4 class="card-section-title mb-3">2. Incrementables y Contribuciones SAT</h4>
          
          <p class="text-small text-muted mb-3">Ingresa los valores declarados en el pedimento ante el SAT. Al finalizar, presiona el botón para cargarlos automáticamente al prorrateo de costos fiscales de importación.</p>

          <h5 class="mt-3 mb-2 font-bold text-dark text-small">A. Incrementables Oficiales SAT (MXN)</h5>
          <div class="form-row mb-4">
            <div class="form-group">
              <label class="form-label font-bold">Fletes SAT:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.incrementables_sat.fletes}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Seguros SAT:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.incrementables_sat.seguros}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Otros Incrementables SAT:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.incrementables_sat.otros}
              />
            </div>
          </div>

          <h5 class="mt-3 mb-2 font-bold text-dark text-small">B. Contribuciones Liquidadas SAT (MXN)</h5>
          <div class="form-row mb-3">
            <div class="form-group">
              <label class="form-label font-bold">IGI / IGE SAT:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.contribuciones_sat.igi}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">IVA Aduana SAT:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.contribuciones_sat.iva}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">DTA SAT:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.contribuciones_sat.dta}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">PRV SAT:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.contribuciones_sat.prv}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Total Efectivo Pagado:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.contribuciones_sat.total_efectivo}
              />
            </div>
          </div>

          <div class="mb-4 text-start">
            <button class="btn btn-secondary py-2 font-bold" style="width: auto; padding: 10px 24px; background-color: #ebf5fb; color: #1a5276; border: 1.5px solid #1a5276;" on:click={sincronizarGastosSat}>
              <i class="material-icons text-medium">sync</i> Cargar Valores Oficiales al Prorrateo
            </button>
          </div>

          <h4 class="card-section-title mb-3 mt-4">C. Desglose de Gastos de Prorrateo (Costos Fiscales)</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label font-bold">Impuesto Aduanal Prorrateo:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.gastos_importacion.Impuesto_Aduanal}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Costo de Flete Prorrateo:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.gastos_importacion.Flete}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Honorarios Agente Aduanal:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.gastos_importacion.Agente_Aduanal}
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Seguridad / Custodia:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={nuevoPedimento.gastos_importacion.Seguridad}
              />
            </div>
          </div>

          <!-- Otros gastos dinámicos -->
          <div class="mb-2 mt-3">
            <div class="d-flex justify-content-between align-items-center mb-2" style="max-width: 600px;">
              <label class="form-label font-bold mb-0">Otros Gastos:</label>
              <button class="btn btn-secondary btn-sm" on:click={agregarOtrosGastos}>
                <i class="material-icons text-small">add</i> Agregar Concepto
              </button>
            </div>

            {#each nuevoPedimento.gastos_importacion.otros as otro, index}
              <div class="row align-items-center mb-2" style="max-width: 600px;" transition:fade={{ duration: 100 }}>
                <div class="col-7">
                  <input 
                    type="text" 
                    placeholder="Concepto (ej. Prevalidación)" 
                    class="form-control form-control-sm" 
                    bind:value={otro.concepto}
                  />
                </div>
                <div class="col-4">
                  <input 
                    type="number" 
                    placeholder="Monto MXN" 
                    class="form-control form-control-sm" 
                    bind:value={otro.monto}
                  />
                </div>
                <div class="col-1 text-center">
                  <button class="btn btn-danger-icon" on:click={() => removerOtrosGastos(index)}>
                    <i class="material-icons">delete</i>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- 3. Productos en el Cargamento -->
        <div class="card p-4 mb-4">
          <h4 class="card-section-title mb-3">3. Productos en el Cargamento (Partidas)</h4>

          <!-- Inputs para agregar producto -->
          <div class="form-row">
            <!-- Buscador Predictivo de Productos -->
            <div class="form-group fg-large product-selector-container">
              <label class="form-label font-bold">Seleccionar Producto:</label>
              <div class="custom-dropdown-trigger" on:click={() => (showProductDropdown = !showProductDropdown)}>
                <span>{selectedProductName}</span>
                <i class="material-icons">arrow_drop_down</i>
              </div>

              {#if showProductDropdown}
                <div class="custom-dropdown-content" transition:fade={{ duration: 100 }}>
                  <input 
                    type="text" 
                    class="form-control mb-2" 
                    placeholder="Buscar por nombre o código..." 
                    bind:value={searchProductQuery}
                    on:click|stopPropagation
                  />
                  <div class="dropdown-list">
                    {#each filteredProducts as p}
                      <div class="dropdown-item" on:click={() => selectProduct(p)}>
                        <strong>{p.codigo || 'S/C'}</strong> - {p.nombre}
                      </div>
                    {/each}
                    {#if filteredProducts.length === 0}
                      <div class="p-2 text-muted text-center text-small">No se encontraron productos</div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>

            <div class="form-group fg-small">
              <label class="form-label font-bold">Partida (Sec):</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={tempProduct.sec}
              />
            </div>
            
            <div class="form-group fg-small">
              <label class="form-label font-bold">NICO:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Ej. 99"
                bind:value={tempProduct.nico}
              />
            </div>

            <div class="form-group fg-medium">
              <label class="form-label font-bold">Marca Declarada:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Ej. Carbon Audio"
                bind:value={tempProduct.marca}
              />
            </div>

            <div class="form-group fg-medium">
              <label class="form-label font-bold">Modelo Declarado:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Ej. CA-WMB8065PR"
                bind:value={tempProduct.modelo}
              />
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group fg-medium">
              <label class="form-label font-bold">Fracción Arancelaria:</label>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Código de fracción"
                bind:value={tempProduct.fraccion_arancelaria}
              />
            </div>
            
            <div class="form-group fg-small">
              <label class="form-label font-bold">U. Medida:</label>
              <input 
                type="text" 
                class="form-control" 
                bind:value={tempProduct.unidad_medida}
              />
            </div>

            <div class="form-group fg-small">
              <label class="form-label font-bold">Cantidad:</label>
              <input 
                type="number" 
                class="form-control" 
                bind:value={tempProduct.cantidad}
              />
            </div>

            <div class="form-group fg-medium">
              <label class="form-label font-bold">Precio Compra (USD):</label>
              <input 
                type="number" 
                step="0.01" 
                class="form-control" 
                bind:value={tempProduct.precio_compra_usd}
              />
            </div>

            <div class="form-group fg-medium">
              <label class="form-label font-bold">Valor Aduana Partida (MXN):</label>
              <input 
                type="number" 
                class="form-control" 
                placeholder="Monto aduana pesos"
                bind:value={tempProduct.valor_aduana_partida_mxn}
              />
            </div>
          </div>

          <div class="mb-4 mt-3 text-start">
            <button class="btn btn-secondary py-2" style="width: auto; padding: 10px 24px;" on:click={agregarProductoALista}>
              <i class="material-icons text-medium">add_shopping_cart</i> Agregar Item al Cargamento
            </button>
          </div>

          <!-- Tabla de Productos Agregados -->
          <h5 class="font-bold text-dark border-bottom pb-2">Lista de Partidas ({nuevoPedimento.productos.length})</h5>
          <div class="table-container-fixed mb-4" style="max-height: 250px;">
            {#if nuevoPedimento.productos.length === 0}
              <div class="p-3 text-center text-muted text-small">No hay productos agregados en este cargamento</div>
            {:else}
              <table class="table table-sm table-striped align-middle">
                <thead>
                  <tr>
                    <th>Sec</th>
                    <th>Producto</th>
                    <th>Marca/Modelo</th>
                    <th>NICO/Fracción</th>
                    <th>Cantidad</th>
                    <th>Prec. Compra (USD)</th>
                    <th>Valor Aduana (MXN)</th>
                    <th>Total (USD)</th>
                    <th class="text-center">X</th>
                  </tr>
                </thead>
                <tbody>
                  {#each nuevoPedimento.productos as prod, index}
                    <tr>
                      <td><strong>{prod.sec}</strong></td>
                      <td>
                        <div class="font-bold">{prod.nombre}</div>
                        <div class="text-muted text-small">{prod.codigo || 'S/C'}</div>
                      </td>
                      <td>
                        <div class="text-small">{prod.marca || 'S/M'}</div>
                        <div class="text-small text-muted">{prod.modelo || 'S/Mod'}</div>
                      </td>
                      <td>
                        <div class="font-mono text-small">{prod.fraccion_arancelaria || 'S/F'}</div>
                        <div class="text-small text-muted">NICO: {prod.nico}</div>
                      </td>
                      <td>{prod.cantidad} {prod.unidad_medida}</td>
                      <td>${prod.precio_compra_usd.toFixed(2)}</td>
                      <td>{formatMoney(prod.valor_aduana_partida_mxn)}</td>
                      <td>${(prod.cantidad * prod.precio_compra_usd).toFixed(2)}</td>
                      <td class="text-center">
                        <button class="btn btn-danger-icon btn-sm" on:click={() => removerProductoDeLista(index)}>
                          <i class="material-icons text-small">close</i>
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>

          <div class="text-end">
            <button class="btn btn-masivo py-3 font-bold" style="width: auto; padding: 12px 36px;" on:click={guardarPedimento}>
              <i class="material-icons text-medium">cloud_upload</i> Registrar Pedimento en Tránsito
            </button>
          </div>
        </div>
      </div>

    <!-- SECCIÓN 3: CÁLCULO DE COSTOS FISCALES -->
    {:else if activeTab === "calculate" && pedimentoSeleccionado}
      <div class="section-title d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Cálculo de Precios Fiscales Unitarios</h2>
          <p class="subtitulo">Aplica prorrateo a los gastos indirectos para calcular el costo de adquisición de cada pieza.</p>
        </div>
        <button class="btn btn-refresh" on:click={() => (activeTab = "list")}>
          <i class="material-icons">arrow_back</i> Regresar
        </button>
      </div>

      <div class="row mb-4">
        <!-- Resumen del Pedimento -->
        <div class="col-md-4 mb-4 mb-md-0">
          <div class="card p-4 h-100 bg-glass text-light gradient-blue-card">
            <h4 class="font-bold border-bottom pb-2 mb-3">Detalle Pedimento</h4>
            <div class="mb-2"><strong>Número:</strong> {pedimentoSeleccionado.numero_pedimento}</div>
            <div class="mb-2"><strong>Clave SAT:</strong> {pedimentoSeleccionado.clave_pedimento}</div>
            <div class="mb-2"><strong>Tipo de Cambio:</strong> {pedimentoSeleccionado.tipo_cambio.toFixed(4)} MXN</div>
            <div class="mb-2"><strong>Total Indirectos:</strong> {formatMoney(sumarGastosIndirectos(pedimentoSeleccionado))}</div>
            <div class="mb-3">
              <strong>Estatus:</strong> 
              {#if pedimentoSeleccionado.status === 'transito'}
                <span class="badge bg-warning text-dark">En tránsito</span>
              {:else}
                <span class="badge bg-success">Arribado</span>
              {/if}
            </div>
            
            <h5 class="font-bold border-bottom pb-1 mb-2">Gastos Desglosados:</h5>
            <div class="text-small mb-1">Impuestos: {formatMoney(pedimentoSeleccionado.gastos_importacion.Impuesto_Aduanal)}</div>
            <div class="text-small mb-1">Fletes: {formatMoney(pedimentoSeleccionado.gastos_importacion.Flete)}</div>
            <div class="text-small mb-1">Agente: {formatMoney(pedimentoSeleccionado.gastos_importacion.Agente_Aduanal)}</div>
            <div class="text-small mb-2">Seguridad: {formatMoney(pedimentoSeleccionado.gastos_importacion.Seguridad)}</div>
          </div>
        </div>

        <!-- Panel de Prorrateo -->
        <div class="col-md-8">
          <div class="card p-4 h-100">
            <h4 class="font-bold text-dark mb-4">Metodología de Prorrateo Fiscal</h4>
            
            <div class="mb-4">
              <label class="form-label font-bold">Fórmula / Metodología de cálculo:</label>
              <select class="form-select custom-select" bind:value={metodologiaSeleccionada}>
                <option value="ad-valorem">Opción A: Prorrateo Ad-Valorem (Por valor de importación - SAT)</option>
                <option value="unitario">Opción B: Prorrateo Unitario (Equitativo por cantidad de piezas)</option>
                <option value="mixto">Opción C: Prorrateo Mixto (Impuestos por Valor + Flete por Cantidad)</option>
                <option value="fijo">Opción D: Porcentaje Fijo de Incremento Manual</option>
              </select>
            </div>

            {#if metodologiaSeleccionada === 'fijo'}
              <div class="mb-4" transition:fade={{ duration: 100 }}>
                <label class="form-label font-bold">Porcentaje de incremento fijo (%):</label>
                <input 
                  type="number" 
                  class="form-control" 
                  placeholder="ej. 15" 
                  bind:value={factorFijo}
                />
              </div>
            {/if}

            <div class="p-3 bg-light border-start border-4 border-info mb-4">
              {#if metodologiaSeleccionada === 'ad-valorem'}
                <strong>Información:</strong> Los gastos indirectos se dividen de manera proporcional al precio unitario de cada producto. Los artículos más caros asumen una parte mayor del flete y los aranceles.
              {:else if metodologiaSeleccionada === 'unitario'}
                <strong>Información:</strong> Todos los gastos logísticos y arancelarios se dividen por igual entre la cantidad de piezas importadas, sin importar el valor unitario de compra de cada una.
              {:else if metodologiaSeleccionada === 'mixto'}
                <strong>Información:</strong> Los impuestos aduanales y honorarios se distribuyen según el precio (Ad-Valorem) mientras que el flete y la seguridad se dividen equitativamente por pieza física.
              {:else if metodologiaSeleccionada === 'fijo'}
                <strong>Información:</strong> Se le añadirá un porcentaje fijo manual al precio de compra base convertido a pesos. No se utiliza el valor de gastos indirectos capturado.
              {/if}
            </div>

            <div class="text-end">
              <button class="btn btn-masivo w-100 py-3" on:click={guardarCalculoFiscal}>
                <i class="material-icons text-medium">save</i> Calcular y Guardar Precios Fiscales
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resultados del cálculo -->
      <div class="contenedor_ventana">
        <h4 class="font-bold text-dark mb-3 p-3">Desglose de Costo Fiscal por Partida</h4>
        <div class="table-responsive">
          <table class="table table-custom align-middle">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Fracción</th>
                <th>Cantidad</th>
                <th>Costo USD Unitario</th>
                <th>Costo Base MXN</th>
                <th>Costo Fiscal Unitario MXN</th>
                <th>Costo de Importación Total</th>
              </tr>
            </thead>
            <tbody>
              {#each pedimentoSeleccionado.productos as item}
                <tr>
                  <td>
                    <div class="font-bold text-dark">{item.producto ? item.producto.nombre : 'Desconocido'}</div>
                    <div class="text-muted text-small">{item.producto ? item.producto.codigo : ''}</div>
                  </td>
                  <td class="font-mono">{item.fraccion_arancelaria || 'S/C'}</td>
                  <td>{item.cantidad} {item.unidad_medida}</td>
                  <td>${item.precio_compra_usd.toFixed(2)} USD</td>
                  <td>{formatMoney(item.precio_compra_usd * pedimentoSeleccionado.tipo_cambio)}</td>
                  <td>
                    {#if item.costo_fiscal_unitario_mxn > 0}
                      <span class="costo-fiscal-destacado">{formatMoney(item.costo_fiscal_unitario_mxn)}</span>
                    {:else}
                      <span class="badge bg-secondary">Sin Calcular</span>
                    {/if}
                  </td>
                  <td>
                    {#if item.costo_fiscal_unitario_mxn > 0}
                      <strong>{formatMoney(item.costo_fiscal_unitario_mxn * item.cantidad)}</strong>
                    {:else}
                      -
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .vista-pedimentos {
    padding: 24px;
    font-family: inherit;
    color: #2c3e50;
    max-height: calc(100vh - 42px);
    overflow-y: auto;
  }

  .menu-tabs {
    display: flex;
    gap: 8px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0px;
    margin-bottom: 24px;
  }

  .tab {
    padding: 12px 24px;
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-bottom: none;
    font-weight: 600;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .tab:hover {
    background-color: #f1f5f9;
    color: #334155;
  }

  .tab.active {
    background-color: white;
    color: #1a5276;
    border-color: #cbd5e1;
    border-top: 3px solid #1a5276;
    margin-bottom: -2px;
    position: relative;
    z-index: 1;
  }

  .section-title h2 {
    margin: 0;
    font-size: 1.6em;
    font-weight: 700;
    color: #1a5276;
  }

  .subtitulo {
    margin: 4px 0 0 0;
    font-size: 0.9em;
    color: #7f8c8d;
  }

  .contenedor_ventana {
    background: white;
    margin: 0;
    max-height: calc(100vh - 350px) !important;
    padding: 0;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    overflow-y: auto;
  }

  .table-custom {
    margin: 0;
    width: 100%;
    border-collapse: collapse;
  }

  .table-custom th {
    background-color: #f8fafc;
    color: #475569;
    font-weight: 600;
    font-size: 0.9em;
    padding: 16px 20px;
    border-bottom: 1.5px solid #e2e8f0;
  }

  .table-custom td {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .badge {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.8em;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .bg-warning {
    background-color: #fef9c3;
    color: #713f12;
    border: 1px solid #fef08a;
  }

  .bg-success {
    background-color: #dcfce7;
    color: #14532d;
    border: 1px solid #bbf7d0;
  }

  .inline-icon {
    font-size: 14px !important;
  }

  .btn {
    border-radius: 8px;
    font-weight: 500;
    padding: 8px 16px;
    font-size: 0.85em;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .btn-action-blue {
    background-color: #ebf5fb;
    color: #2980b9;
  }

  .btn-action-blue:hover {
    background-color: #2980b9;
    color: white;
  }

  .btn-action-green {
    background-color: #e8f8f5;
    color: #16a085;
  }

  .btn-action-green:hover {
    background-color: #16a085;
    color: white;
  }

  .arribado-label {
    color: #27ae60;
    font-weight: bold;
    display: inline-block;
    padding: 8px;
  }

  /* Grid Form */
  .grid-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  @media (max-width: 992px) {
    .grid-form {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
    padding: 24px 32px !important; /* Incrementamos el padding lateral para crear espacios en los extremos */
  }

  /* Form Layout */
  .secciones-verticales {
    width: 100%;
    max-width: 100%; /* Permitimos que ocupe todo el ancho sin gaps laterales vacíos gigantes */
    margin: 0;
  }

  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 24px; /* Aumentamos el gap a 24px para mejor separación entre columnas */
    align-items: flex-end;
    margin-bottom: 20px;
  }

  .form-group {
    flex: 1;
    min-width: 180px;
    max-width: 320px; /* Evita que los inputs normales se estiren de forma antiestética */
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    margin-bottom: 0;
  }

  .fg-small {
    flex: 0 0 120px;
    max-width: 120px;
  }

  .fg-medium {
    flex: 0 0 220px;
    max-width: 220px;
  }

  .fg-large {
    flex: 1 1 350px;
    max-width: 480px;
  }

  .card-section-title {
    color: #1a5276;
    font-weight: 700;
    border-bottom: 2px solid #ebf5fb;
    padding-bottom: 8px;
  }

  .form-control, .form-select {
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.95em;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .form-control:focus, .form-select:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
  }

  .btn-secondary {
    background-color: #f1f5f9;
    color: #475569;
  }

  .btn-secondary:hover {
    background-color: #e2e8f0;
  }

  .btn-danger-icon {
    background: none;
    color: #e74c3c;
    padding: 6px;
    border-radius: 6px;
  }

  .btn-danger-icon:hover {
    background-color: #fde8e8;
  }

  .btn-masivo {
    background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(26, 82, 118, 0.2);
  }

  .btn-masivo:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(26, 82, 118, 0.3);
    transform: translateY(-1px);
  }

  /* Product Search dropdown */
  .product-selector-container {
    position: relative;
  }

  .custom-dropdown-trigger {
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 14px;
    background: white;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .custom-dropdown-content {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1.5px solid #cbd5e1;
    border-top: none;
    border-radius: 0 0 8px 8px;
    z-index: 10;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
    padding: 10px;
  }

  .dropdown-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .dropdown-item {
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
  }

  .dropdown-item:hover {
    background-color: #ebf5fb;
    color: #2980b9;
  }

  .table-container-fixed {
    max-height: 180px;
    overflow-y: auto;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    margin-top: 10px;
  }

  .truncate-text {
    max-width: 150px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gradient-blue-card {
    background: linear-gradient(135deg, #2c3e50 0%, #1a5276 100%);
    border: none;
  }

  .costo-fiscal-destacado {
    color: #27ae60;
    font-weight: 700;
    font-size: 1.1em;
  }

  /* Paginación */
  .paginacion-area {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .info-paginacion {
    font-size: 0.9em;
    color: #64748b;
  }

  .controles-paginacion {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .btn-page {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #475569;
    padding: 8px;
    border-radius: 8px;
    min-width: 38px;
    min-height: 38px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .btn-page:hover:not(:disabled) {
    background-color: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
  }

  .btn-page:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Loader */
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 999;
  }

  .loader-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background: white;
    padding: 30px 40px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f1f5f9;
    border-top: 4px solid #2980b9;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
