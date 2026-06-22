<script>
  import { onMount } from "svelte";
  import { postData, mensaje_bueno, mensaje_error, usuario_db } from "../../stores";
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
    importe_precio_pagado_mxn: 0,
    fraccion_arancelaria: "",
    unidad_medida: "pza",
    // Campos SAT por partida
    sec: 1,
    nico: "00",
    marca: "",
    modelo: "",
    valor_aduana_partida_mxn: 0
  };

  const UNIDADES_PEDIMENTO_SAT = [
    { codigo: "6", nombre: "Pieza (6)", abreviatura: "pza" },
    { codigo: "1", nombre: "Kilogramo (1)", abreviatura: "kg" },
    { codigo: "3", nombre: "Metro Lineal (3)", abreviatura: "m" },
    { codigo: "4", nombre: "Metro Cuadrado (4)", abreviatura: "m²" },
    { codigo: "5", nombre: "Metro Cúbico (5)", abreviatura: "m³" },
    { codigo: "7", nombre: "Cabeza (7)", abreviatura: "cab" },
    { codigo: "8", nombre: "Litro (8)", abreviatura: "L" },
    { codigo: "9", nombre: "Par (9)", abreviatura: "par" },
    { codigo: "10", nombre: "Docena (10)", abreviatura: "doc" },
    { codigo: "11", nombre: "Centenar (11)", abreviatura: "cen" },
    { codigo: "12", nombre: "Millar (12)", abreviatura: "mil" },
    { codigo: "13", nombre: "Millón de Unidades (13)", abreviatura: "millon" },
    { codigo: "14", nombre: "Docena de Docenas (14)", abreviatura: "doc-doc" },
    { codigo: "15", nombre: "Decilitro (15)", abreviatura: "dl" },
    { codigo: "16", nombre: "Hectolitro (16)", abreviatura: "hl" },
    { codigo: "17", nombre: "Kilovatio-Hora (17)", abreviatura: "kWh" },
    { codigo: "99", nombre: "Otras Unidades (99)", abreviatura: "otro" }
  ];

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
    if (tempProduct.importe_precio_pagado_mxn < 0) {
      mensaje_error("El importe de precio pagado no puede ser negativo");
      return;
    }

    const prodOriginal = allProducts.find(p => p._id === tempProduct.producto_id);

    // Calcular precio de compra unitario en USD automáticamente a partir del total en pesos del pedimento
    const totalPesos = parseFloat(tempProduct.importe_precio_pagado_mxn) || 0;
    const cantidad = parseFloat(tempProduct.cantidad) || 1;
    const tipoCambio = parseFloat(nuevoPedimento.tipo_cambio) || 1;
    const precioUnitarioUSD = (totalPesos / cantidad) / tipoCambio;

    nuevoPedimento.productos = [
      ...nuevoPedimento.productos,
      {
        producto: tempProduct.producto_id,
        nombre: prodOriginal ? prodOriginal.nombre : "Desconocido",
        codigo: prodOriginal ? prodOriginal.codigo : "",
        fraccion_arancelaria: tempProduct.fraccion_arancelaria,
        cantidad: tempProduct.cantidad,
        unidad_medida: tempProduct.unidad_medida,
        precio_compra_usd: precioUnitarioUSD,
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
      importe_precio_pagado_mxn: 0,
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

  // Variables para modal de arribo y captura de folios
  let showArriboModal = false;
  let pedimentoArribo = null;
  let foliosCapturados = {};
  let productosParaArribo = [];
  let actualizarExistencias = true;

  function abrirModalArribo(ped) {
    pedimentoArribo = ped;
    foliosCapturados = {};
    actualizarExistencias = true;
    productosParaArribo = ped.productos.map(item => {
      const pId = item.producto && item.producto._id ? item.producto._id : item.producto;
      foliosCapturados[pId] = "";
      
      const prodOriginal = allProducts.find(p => p._id === pId);
      const stockActual = prodOriginal && prodOriginal.existencia ? (prodOriginal.existencia.actual || 0) : 0;
      
      return {
        ...item,
        pId: pId,
        nombre: prodOriginal ? prodOriginal.nombre : (item.producto && item.producto.nombre ? item.producto.nombre : "Producto Desconocido"),
        codigo: prodOriginal ? prodOriginal.codigo : (item.producto && item.producto.codigo ? item.producto.codigo : ""),
        stockActual: stockActual
      };
    });
    showArriboModal = true;
  }

  async function confirmarArribo() {
    const folios_productos = {};
    for (const item of productosParaArribo) {
      const rawText = foliosCapturados[item.pId] || "";
      const listFolios = rawText
        .split(/[\n,]+/)
        .map(f => f.trim())
        .filter(f => f.length > 0);
      folios_productos[item.pId] = listFolios;
    }

    loading = true;
    showArriboModal = false;
    try {
      const res = await postData("app/pedimentos/arribar", { 
        id_pedimento: pedimentoArribo._id,
        folios_productos: folios_productos,
        actualizar_existencias: actualizarExistencias
      });
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        await cargarPedimentos();
        await cargarProductos();
      } else {
        mensaje_error(res.mensaje || "Error al registrar arribo.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de red al registrar arribo.");
    } finally {
      loading = false;
      pedimentoArribo = null;
    }
  }

  function irACalcularCostos(ped) {
    pedimentoSeleccionado = ped;
    activeTab = "calculate";
  }

  // --- VARIABLES Y FUNCIONES PARA EDICIÓN DE PEDIMENTOS (FASE 4+) ---
  let showEditModal = false;
  let pedimentoEditar = {
    _id: "",
    numero_pedimento: "",
    clave_pedimento: "A1",
    fecha_pedimento: "",
    tipo_cambio: 20.00,
    aduana_despacho: "160",
    patente: "3387",
    regimen: "IMD",
    peso_bruto: 0,
    valor_dolares: 0,
    valor_aduana_mxn: 0,
    cove: "",
    proveedor: { nombre: "", tax_id: "", pais: "CHN" },
    incrementables_sat: { fletes: 0, seguros: 0, otros: 0 },
    contribuciones_sat: { dta: 0, prv: 0, igi: 0, iva: 0, total_efectivo: 0 },
    gastos_importacion: { Impuesto_Aduanal: 0, Flete: 0, Agente_Aduanal: 0, Seguridad: 0, otros: [] },
    productos: [],
    status: "transito",
    fecha_arribo: ""
  };

  let searchEditProductQuery = "";
  let filteredEditProducts = [];
  let showEditProductDropdown = false;
  let selectedEditProductName = "Selecciona un producto...";
  let tempEditProduct = {
    producto_id: "",
    cantidad: 1,
    importe_precio_pagado_mxn: 0,
    fraccion_arancelaria: "",
    unidad_medida: "pza",
    sec: 1,
    nico: "00",
    marca: "",
    modelo: "",
    valor_aduana_partida_mxn: 0
  };

  $: {
    if (searchEditProductQuery.trim() === "") {
      filteredEditProducts = allProducts;
    } else {
      const q = searchEditProductQuery.toLowerCase();
      filteredEditProducts = allProducts.filter(
        (p) =>
          (p.nombre && p.nombre.toLowerCase().includes(q)) ||
          (p.codigo && p.codigo.toLowerCase().includes(q))
      );
    }
  }

  function abrirModalEditar(ped) {
    pedimentoEditar = JSON.parse(JSON.stringify(ped));
    if (pedimentoEditar.fecha_pedimento) {
      pedimentoEditar.fecha_pedimento = new Date(pedimentoEditar.fecha_pedimento).toISOString().substring(0, 10);
    }
    if (pedimentoEditar.fecha_arribo) {
      pedimentoEditar.fecha_arribo = new Date(pedimentoEditar.fecha_arribo).toISOString().substring(0, 10);
    } else {
      pedimentoEditar.fecha_arribo = "";
    }
    
    pedimentoEditar.productos = pedimentoEditar.productos.map(item => {
      const pId = item.producto && item.producto._id ? item.producto._id : item.producto;
      const prodOriginal = allProducts.find(p => p._id === pId);
      return {
        ...item,
        producto: pId,
        nombre: prodOriginal ? prodOriginal.nombre : (item.producto && item.producto.nombre ? item.producto.nombre : "Producto Desconocido"),
        codigo: prodOriginal ? prodOriginal.codigo : (item.producto && item.producto.codigo ? item.producto.codigo : "")
      };
    });

    tempEditProduct = {
      producto_id: "",
      cantidad: 1,
      importe_precio_pagado_mxn: 0,
      fraccion_arancelaria: "",
      unidad_medida: "pza",
      sec: pedimentoEditar.productos.length + 1,
      nico: "00",
      marca: "",
      modelo: "",
      valor_aduana_partida_mxn: 0
    };
    selectedEditProductName = "Selecciona un producto...";
    searchEditProductQuery = "";
    showEditModal = true;
  }

  function selectEditProduct(p) {
    tempEditProduct.producto_id = p._id;
    selectedEditProductName = `${p.codigo || 'S/C'} - ${p.nombre}`;
    showEditProductDropdown = false;
    searchEditProductQuery = "";
  }

  function agregarProductoAListaEdicion() {
    if (!tempEditProduct.producto_id) {
      mensaje_error("Por favor selecciona un producto");
      return;
    }
    if (tempEditProduct.cantidad <= 0) {
      mensaje_error("La cantidad debe ser mayor que 0");
      return;
    }
    if (tempEditProduct.importe_precio_pagado_mxn < 0) {
      mensaje_error("El importe de precio pagado no puede ser negativo");
      return;
    }

    const prodOriginal = allProducts.find(p => p._id === tempEditProduct.producto_id);

    const totalPesos = parseFloat(tempEditProduct.importe_precio_pagado_mxn) || 0;
    const cantidad = parseFloat(tempEditProduct.cantidad) || 1;
    const tipoCambio = parseFloat(pedimentoEditar.tipo_cambio) || 1;
    const precioUnitarioUSD = (totalPesos / cantidad) / tipoCambio;

    pedimentoEditar.productos = [
      ...pedimentoEditar.productos,
      {
        producto: tempEditProduct.producto_id,
        nombre: prodOriginal ? prodOriginal.nombre : "Desconocido",
        codigo: prodOriginal ? prodOriginal.codigo : "",
        fraccion_arancelaria: tempEditProduct.fraccion_arancelaria,
        cantidad: tempEditProduct.cantidad,
        unidad_medida: tempEditProduct.unidad_medida,
        precio_compra_usd: precioUnitarioUSD,
        costo_fiscal_unitario_mxn: 0,
        sec: tempEditProduct.sec,
        nico: tempEditProduct.nico,
        marca: tempEditProduct.marca,
        modelo: tempEditProduct.modelo,
        valor_aduana_partida_mxn: tempEditProduct.valor_aduana_partida_mxn
      }
    ];

    tempEditProduct = {
      producto_id: "",
      cantidad: 1,
      importe_precio_pagado_mxn: 0,
      fraccion_arancelaria: "",
      unidad_medida: "pza",
      sec: pedimentoEditar.productos.length + 1,
      nico: "00",
      marca: "",
      modelo: "",
      valor_aduana_partida_mxn: 0
    };
    selectedEditProductName = "Selecciona un producto...";
  }

  function removerProductoDeListaEdicion(index) {
    pedimentoEditar.productos.splice(index, 1);
    pedimentoEditar.productos = pedimentoEditar.productos;
  }

  function agregarOtrosGastosEdicion() {
    pedimentoEditar.gastos_importacion.otros = [
      ...pedimentoEditar.gastos_importacion.otros,
      { concepto: "", monto: 0 }
    ];
  }

  function removerOtrosGastosEdicion(index) {
    pedimentoEditar.gastos_importacion.otros.splice(index, 1);
    pedimentoEditar.gastos_importacion.otros = pedimentoEditar.gastos_importacion.otros;
  }

  function sincronizarGastosSatEdicion() {
    const c = pedimentoEditar.contribuciones_sat;
    const inc = pedimentoEditar.incrementables_sat;
    
    const totalImpuestosSat = (c.igi || 0) + (c.iva || 0) + (c.dta || 0) + (c.prv || 0);
    pedimentoEditar.gastos_importacion.Impuesto_Aduanal = totalImpuestosSat;
    pedimentoEditar.gastos_importacion.Flete = inc.fletes || 0;
    
    mensaje_bueno("Gastos e impuestos del SAT sincronizados para prorrateo.");
  }

  async function guardarEdicionPedimento() {
    if (!pedimentoEditar.numero_pedimento) {
      mensaje_error("Por favor ingresa el número de pedimento");
      return;
    }
    if (pedimentoEditar.productos.length === 0) {
      mensaje_error("El pedimento debe tener al menos un producto");
      return;
    }

    loading = true;
    showEditModal = false;
    try {
      const res = await postData("app/pedimentos/editar", {
        id_pedimento: pedimentoEditar._id,
        ...pedimentoEditar
      });
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        await cargarPedimentos();
        await cargarProductos();
      } else {
        mensaje_error(res.mensaje || "Error al actualizar pedimento.");
        showEditModal = true;
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de comunicación con el servidor.");
      showEditModal = true;
    } finally {
      loading = false;
    }
  }


  let showPreviewModal = false;
  let productosParaPreview = [];

  async function previsualizarCalculoFiscal() {
    loading = true;
    try {
      const res = await postData("app/pedimentos/calcular_fiscales", {
        id_pedimento: pedimentoSeleccionado._id,
        metodologia: metodologiaSeleccionada,
        factor_fijo: factorFijo,
        preview: true
      });
      if (res.ok) {
        // Mapear los productos calculados para previsualización con su comparación
        productosParaPreview = res.pedimento.productos.map(item => {
          const itemAnterior = pedimentoSeleccionado.productos.find(p => {
            const idAnt = p.producto && p.producto._id ? p.producto._id : p.producto;
            const idNvo = item.producto && item.producto._id ? item.producto._id : item.producto;
            return idAnt === idNvo;
          });
          const costoAnterior = itemAnterior ? itemAnterior.costo_fiscal_unitario_mxn : 0;
          const diff = item.costo_fiscal_unitario_mxn - costoAnterior;
          return {
            ...item,
            costoAnterior,
            diff
          };
        });
        showPreviewModal = true;
      } else {
        mensaje_error(res.mensaje || "Error al calcular la previsualización.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de comunicación con el servidor.");
    } finally {
      loading = false;
    }
  }

  async function confirmarGuardarCalculoFiscal() {
    loading = true;
    showPreviewModal = false;
    try {
      const res = await postData("app/pedimentos/calcular_fiscales", {
        id_pedimento: pedimentoSeleccionado._id,
        metodologia: metodologiaSeleccionada,
        factor_fijo: factorFijo,
        preview: false
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
      mensaje_error("Error al guardar el cálculo fiscal.");
    } finally {
      loading = false;
      productosParaPreview = [];
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
                        title="Calcular Costos Fiscales"
                      >
                        <i class="material-icons text-medium">calculate</i> Costos
                      </button>

                      <button 
                        class="btn btn-action-orange me-2" 
                        on:click={() => abrirModalEditar(ped)}
                        title="Editar Pedimento"
                      >
                        <i class="material-icons text-medium">edit</i> Editar
                      </button>

                      {#if ped.status === 'transito'}
                        <button 
                          class="btn btn-action-green" 
                          on:click={() => abrirModalArribo(ped)}
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
            
            <div class="form-group fg-medium">
              <label class="form-label font-bold">U. Medida (SAT):</label>
              <select class="form-select custom-select" bind:value={tempProduct.unidad_medida}>
                {#each UNIDADES_PEDIMENTO_SAT as u}
                  <option value={u.abreviatura}>{u.nombre}</option>
                {/each}
              </select>
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
              <label class="form-label font-bold">Imp. Precio Pagado (MXN - Total):</label>
              <input 
                type="number" 
                class="form-control" 
                placeholder="IMP. PRECIO PAG. del PDF"
                bind:value={tempProduct.importe_precio_pagado_mxn}
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
                    <th>P. Unitario (USD)</th>
                    <th>Imp. Precio Pagado (MXN)</th>
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
                      <td>${prod.precio_compra_usd.toFixed(4)} USD</td>
                      <td>{formatMoney(prod.precio_compra_usd * prod.cantidad * nuevoPedimento.tipo_cambio)}</td>
                      <td>{formatMoney(prod.valor_aduana_partida_mxn)}</td>
                      <td>${(prod.cantidad * prod.precio_compra_usd).toFixed(2)} USD</td>
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

      <div class="prorrateo-grid mb-4">
        <!-- Resumen del Pedimento -->
        <div class="detalle-pedimento-card">
          <div class="detalle-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <h4>Detalle Pedimento</h4>
          </div>
          <div class="detalle-body">
            <div class="detalle-row">
              <span class="label">Número:</span>
              <span class="value font-mono font-bold">{pedimentoSeleccionado.numero_pedimento}</span>
            </div>
            <div class="detalle-row">
              <span class="label">Clave SAT:</span>
              <span class="value badge-sat">{pedimentoSeleccionado.clave_pedimento}</span>
            </div>
            <div class="detalle-row">
              <span class="label">Tipo de Cambio:</span>
              <span class="value">{pedimentoSeleccionado.tipo_cambio.toFixed(4)} MXN</span>
            </div>
            <div class="detalle-row highlight">
              <span class="label">Total Indirectos:</span>
              <span class="value price">{formatMoney(sumarGastosIndirectos(pedimentoSeleccionado))}</span>
            </div>
            <div class="detalle-row">
              <span class="label">Estatus:</span>
              <span class="value">
                {#if pedimentoSeleccionado.status === 'transito'}
                  <span class="status-badge transito">En tránsito</span>
                {:else}
                  <span class="status-badge arribado">Arribado</span>
                {/if}
              </span>
            </div>

            <div class="detalle-seccion-titulo">Gastos Desglosados:</div>
            <div class="detalle-row mini">
              <span class="label">Impuestos:</span>
              <span class="value">{formatMoney(pedimentoSeleccionado.gastos_importacion.Impuesto_Aduanal)}</span>
            </div>
            <div class="detalle-row mini">
              <span class="label">Fletes:</span>
              <span class="value">{formatMoney(pedimentoSeleccionado.gastos_importacion.Flete)}</span>
            </div>
            <div class="detalle-row mini">
              <span class="label">Agente:</span>
              <span class="value">{formatMoney(pedimentoSeleccionado.gastos_importacion.Agente_Aduanal)}</span>
            </div>
            <div class="detalle-row mini">
              <span class="label">Seguridad:</span>
              <span class="value">{formatMoney(pedimentoSeleccionado.gastos_importacion.Seguridad)}</span>
            </div>
          </div>
        </div>

        <!-- Panel de Prorrateo -->
        <div class="card p-4">
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
            <button class="btn btn-masivo w-100 py-3" on:click={previsualizarCalculoFiscal}>
              <i class="material-icons text-medium">preview</i> Calcular y Previsualizar Precios Fiscales
            </button>
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
                    <div class="font-bold text-dark">{(item.producto && item.producto.nombre) ? item.producto.nombre : 'Producto Desconocido'}</div>
                    <div class="text-muted text-small">{(item.producto && item.producto.codigo) ? item.producto.codigo : 'S/C'}</div>
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

<!-- Modal de Arribo y Captura de Folios -->
{#if showArriboModal && pedimentoArribo}
  <div class="modal-arribo-backdrop" on:click={() => showArriboModal = false}>
    <div class="modal-arribo-container" on:click|stopPropagation>
      <div class="modal-arribo-header">
        <div class="modal-arribo-title-container">
          <div class="modal-arribo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div>
            <h3>Registrar Arribo al Almacén</h3>
            <span class="pedimento-numero-badge">Pedimento: {pedimentoArribo.numero_pedimento}</span>
          </div>
        </div>
        <button class="btn-close-modal" on:click={() => showArriboModal = false} aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="modal-arribo-body">
        <div class="alert alert-info-custom mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div>
            <strong>Confirmación de Arribo:</strong> Revisa el estado del stock a continuación y configura el arribo de la mercancía.
          </div>
        </div>

        <div class="actualizar-existencias-option mb-4">
          <label class="custom-control-label d-flex align-items-start">
            <input 
              type="checkbox" 
              class="form-check-input me-2 mt-1" 
              bind:checked={actualizarExistencias}
            />
            <div>
              <strong>Actualizar existencias en almacén</strong>
              <span class="text-muted d-block text-small mt-1">Si se desmarca, el pedimento pasará a estado arribado y se liberará de los productos en tránsito, pero no se alterarán las cantidades de stock del inventario.</span>
            </div>
          </label>
        </div>

        <p class="modal-desc-sub font-bold text-dark text-small mb-2">
          Productos del Pedimento e Inventario:
        </p>

        <div class="lista-productos-arribo">
          {#each productosParaArribo as item}
            <div class="producto-arribo-row">
              <div class="producto-arribo-info">
                <div class="producto-nombre">{item.nombre}</div>
                <div class="producto-meta-flex">
                  <span class="meta-item font-mono"><span class="label">Código:</span> {item.codigo || 'S/C'}</span>
                  <span class="meta-item"><span class="label">Unidades:</span> <strong class="text-primary">{item.cantidad} {item.unidad_medida}</strong></span>
                </div>

                <!-- Comparativa visual de existencias -->
                <div class="stock-comparativa mt-2">
                  {#if actualizarExistencias}
                    <span class="stock-badge bg-secondary-light">Actual: <strong>{item.stockActual}</strong></span>
                    <span class="stock-arrow">&rarr;</span>
                    <span class="stock-badge bg-primary-light">Esperado: <strong>{item.stockActual + item.cantidad}</strong></span>
                  {:else}
                    <span class="stock-badge bg-secondary-light">Stock sin cambio: <strong>{item.stockActual}</strong></span>
                  {/if}
                </div>
              </div>
              <div class="producto-arribo-input">
                <textarea
                  id="folios-{item.pId}"
                  placeholder="Ingrese folios (ej. SN1234, SN1235...)"
                  bind:value={foliosCapturados[item.pId]}
                  rows="3"
                ></textarea>
                <div class="textarea-help">Separados por comas o saltos de línea</div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="modal-arribo-footer">
        <button class="btn btn-secondary-custom" on:click={() => showArriboModal = false}>Cancelar</button>
        <button class="btn btn-primary-custom" on:click={confirmarArribo}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Confirmar y Registrar Arribo
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal de Previsualización de Cálculo Fiscal -->
{#if showPreviewModal}
  <div class="modal-arribo-backdrop" on:click={() => showPreviewModal = false}>
    <div class="modal-arribo-container" style="max-width: 800px;" on:click|stopPropagation>
      <div class="modal-arribo-header">
        <div class="modal-arribo-title-container">
          <div class="modal-arribo-icon" style="background: #e0f2fe; color: #0284c7;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </div>
          <div>
            <h3>Previsualizar Costos Fiscales</h3>
            <span class="pedimento-numero-badge" style="background: #1a5276;">Método: {metodologiaSeleccionada.toUpperCase()}</span>
          </div>
        </div>
        <button class="btn-close-modal" on:click={() => showPreviewModal = false} aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="modal-arribo-body">
        <div class="alert alert-info-custom" style="background: #ecfdf5; border-color: #a7f3d0; color: #065f46;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon" style="color: #059669; width: 20px; height: 20px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div>
            <strong>Revisión de Cálculos:</strong> Compara los costos fiscales unitarios actuales contra los nuevos proyectados. Si está de acuerdo, confirme para guardarlos.
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-custom align-middle">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center">Cantidad</th>
                <th class="text-center">Costo USD</th>
                <th class="text-center">Costo Anterior</th>
                <th class="text-center">Nuevo Costo</th>
                <th class="text-center">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {#each productosParaPreview as item}
                <tr>
                  <td>
                    <div class="font-bold text-dark">{(item.producto && item.producto.nombre) ? item.producto.nombre : 'Producto Desconocido'}</div>
                    <div class="text-muted text-small">{(item.producto && item.producto.codigo) ? item.producto.codigo : 'S/C'}</div>
                  </td>
                  <td class="text-center">{item.cantidad} {item.unidad_medida}</td>
                  <td class="text-center">${item.precio_compra_usd.toFixed(2)} USD</td>
                  <td class="text-center text-muted">
                    {item.costoAnterior > 0 ? formatMoney(item.costoAnterior) : 'Sin calcular'}
                  </td>
                  <td class="text-center font-bold text-success" style="font-size: 1.05rem;">
                    {formatMoney(item.costo_fiscal_unitario_mxn)}
                  </td>
                  <td class="text-center">
                    {#if item.diff > 0}
                      <span class="text-danger">+{formatMoney(item.diff)}</span>
                    {:else if item.diff < 0}
                      <span class="text-success">{formatMoney(item.diff)}</span>
                    {:else}
                      <span class="text-muted">=</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-arribo-footer">
        <button class="btn btn-secondary-custom" on:click={() => showPreviewModal = false}>Cancelar</button>
        <button class="btn btn-primary-custom" style="background: #10b981;" on:click={confirmarGuardarCalculoFiscal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Confirmar y Guardar Precios
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal de Edición de Pedimento -->
{#if showEditModal && pedimentoEditar}
  <div class="modal-arribo-backdrop" on:click={() => showEditModal = false}>
    <div class="modal-arribo-container" style="max-width: 900px;" on:click|stopPropagation>
      <div class="modal-arribo-header">
        <div class="modal-arribo-title-container">
          <div class="modal-arribo-icon" style="background: #fff7ed; color: #ea580c;">
            <i class="material-icons">edit</i>
          </div>
          <div>
            <h3>Editar Pedimento</h3>
            <span class="pedimento-numero-badge" style="background: #ea580c;">ID: {pedimentoEditar.numero_pedimento}</span>
          </div>
        </div>
        <button class="btn-close-modal" on:click={() => showEditModal = false} aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="modal-arribo-body">
        <div class="secciones-verticales">
          <!-- 1. Datos Generales y Aduanales -->
          <div class="card p-4 mb-4">
            <h5 class="font-bold text-dark mb-3">1. Datos Generales y Aduanales (SAT)</h5>
            
            <div class="form-row">
              <div class="form-group fg-large">
                <label class="form-label font-bold text-small">Número de Pedimento:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.numero_pedimento}
                />
              </div>
              <div class="form-group fg-small">
                <label class="form-label font-bold text-small">Clave SAT:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.clave_pedimento}
                />
              </div>
              <div class="form-group fg-small">
                <label class="form-label font-bold text-small">Régimen:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.regimen}
                />
              </div>
              <div class="form-group fg-small">
                <label class="form-label font-bold text-small">Patente:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.patente}
                />
              </div>
              <div class="form-group fg-small">
                <label class="form-label font-bold text-small">Aduana E/S:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.aduana_despacho}
                />
              </div>
            </div>

            <div class="form-row mt-3">
              <div class="form-group fg-medium">
                <label class="form-label font-bold text-small">Tipo de Cambio (MXN):</label>
                <input 
                  type="number" 
                  step="0.0001" 
                  class="form-control" 
                  bind:value={pedimentoEditar.tipo_cambio}
                />
              </div>
              <div class="form-group fg-medium">
                <label class="form-label font-bold text-small">Fecha de Pago/Registro:</label>
                <input 
                  type="date" 
                  class="form-control" 
                  bind:value={pedimentoEditar.fecha_pedimento}
                />
              </div>
              <div class="form-group fg-medium">
                <label class="form-label font-bold text-small">Peso Bruto (kg):</label>
                <input 
                  type="number" 
                  step="0.001" 
                  class="form-control" 
                  bind:value={pedimentoEditar.peso_bruto}
                />
              </div>
              <div class="form-group fg-medium">
                <label class="form-label font-bold text-small">COVE / Factura:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.cove}
                />
              </div>
            </div>

            {#if pedimentoEditar.status === 'arribado'}
              <div class="form-row mt-3">
                <div class="form-group fg-medium">
                  <label class="form-label font-bold text-small text-danger">Fecha de Arribo al Almacén:</label>
                  <input 
                    type="date" 
                    class="form-control border-danger" 
                    bind:value={pedimentoEditar.fecha_arribo}
                  />
                  <span class="text-muted text-small d-block mt-1">Importante para el orden cronológico del cálculo de utilidades.</span>
                </div>
              </div>
            {/if}

            <h5 class="mt-4 mb-2 text-dark border-bottom pb-1 font-bold text-medium">Datos del Proveedor Extranjero</h5>
            <div class="form-row">
              <div class="form-group fg-large">
                <label class="form-label font-bold text-small">Razón Social Proveedor:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.proveedor.nombre}
                />
              </div>
              <div class="form-group fg-medium">
                <label class="form-label font-bold text-small">Tax ID / ID Fiscal:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.proveedor.tax_id}
                />
              </div>
              <div class="form-group fg-small">
                <label class="form-label font-bold text-small">País Origen:</label>
                <input 
                  type="text" 
                  class="form-control" 
                  bind:value={pedimentoEditar.proveedor.pais}
                />
              </div>
            </div>
          </div>

          <!-- 2. Incrementables y Contribuciones SAT -->
          <div class="card p-4 mb-4">
            <h5 class="font-bold text-dark mb-3">2. Incrementables y Contribuciones SAT</h5>
            
            <h6 class="font-bold text-dark text-small mb-2">A. Incrementables Oficiales SAT (MXN)</h6>
            <div class="form-row mb-4">
              <div class="form-group">
                <label class="form-label font-bold text-small">Fletes SAT:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.incrementables_sat.fletes}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">Seguros SAT:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.incrementables_sat.seguros}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">Otros Incrementables SAT:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.incrementables_sat.otros}
                />
              </div>
            </div>

            <h6 class="font-bold text-dark text-small mb-2">B. Contribuciones Liquidadas SAT (MXN)</h6>
            <div class="form-row mb-3">
              <div class="form-group">
                <label class="form-label font-bold text-small">IGI / IGE SAT:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.contribuciones_sat.igi}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">IVA Aduana SAT:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.contribuciones_sat.iva}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">DTA SAT:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.contribuciones_sat.dta}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">PRV SAT:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.contribuciones_sat.prv}
                />
              </div>
            </div>

            <div class="d-flex justify-content-end mb-4">
              <button class="btn btn-secondary-custom btn-sm" on:click={sincronizarGastosSatEdicion}>
                <i class="material-icons text-small">sync</i> Sincronizar al Prorrateo
              </button>
            </div>

            <h6 class="font-bold text-dark text-small mb-2 border-top pt-3">C. Gastos de Prorrateo Fiscal (MXN)</h6>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label font-bold text-small">Impuesto Aduanal (Total):</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.gastos_importacion.Impuesto_Aduanal}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">Flete Logístico (MXN):</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.gastos_importacion.Flete}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">Agente Aduanal:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.gastos_importacion.Agente_Aduanal}
                />
              </div>
              <div class="form-group">
                <label class="form-label font-bold text-small">Seguridad y Custodia:</label>
                <input 
                  type="number" 
                  class="form-control" 
                  bind:value={pedimentoEditar.gastos_importacion.Seguridad}
                />
              </div>
            </div>

            <!-- Otros Gastos Indirectos -->
            <div class="mt-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label font-bold text-small mb-0">Otros Gastos Indirectos:</label>
                <button class="btn btn-secondary-custom btn-sm" on:click={agregarOtrosGastosEdicion}>
                  + Agregar Concepto
                </button>
              </div>
              {#each pedimentoEditar.gastos_importacion.otros as otro, index}
                <div class="form-row mb-2 align-items-center" transition:fade={{ duration: 100 }}>
                  <div class="form-group fg-large">
                    <input 
                      type="text" 
                      class="form-control form-control-sm" 
                      placeholder="Concepto (ej. Maniobras, Almacenaje)" 
                      bind:value={otro.concepto}
                    />
                  </div>
                  <div class="form-group fg-medium">
                    <input 
                      type="number" 
                      class="form-control form-control-sm" 
                      placeholder="Monto (MXN)" 
                      bind:value={otro.monto}
                    />
                  </div>
                  <button class="btn-remove-row mt-1" on:click={() => removerOtrosGastosEdicion(index)} title="Eliminar">&times;</button>
                </div>
              {/each}
            </div>
          </div>

          <!-- 3. Partidas de Productos -->
          <div class="card p-4">
            <h5 class="font-bold text-dark mb-3">3. Partidas de Productos del Pedimento</h5>

            <!-- Agregar Productos (Solo Administrador) -->
            {#if $usuario_db.rol === 'administrador'}
              <div class="bg-light p-3 border rounded mb-4">
                <h6 class="font-bold text-dark text-small mb-2">Agregar Partida al Pedimento:</h6>
                <div class="search-product-container mb-3">
                  <div class="form-group">
                    <label class="form-label font-bold text-small">Seleccionar Producto:</label>
                    <div class="dropdown-wrapper">
                      <button 
                        class="form-control text-start d-flex justify-content-between align-items-center" 
                        on:click={() => (showEditProductDropdown = !showEditProductDropdown)}
                      >
                        <span>{selectedEditProductName}</span>
                        <i class="material-icons">arrow_drop_down</i>
                      </button>
                      {#if showEditProductDropdown}
                        <div class="dropdown-menu-custom">
                          <input 
                            type="text" 
                            class="form-control mb-2" 
                            placeholder="Buscar por nombre o código..." 
                            bind:value={searchEditProductQuery}
                          />
                          <div class="dropdown-items-list">
                            {#each filteredEditProducts as prod}
                              <div class="dropdown-item-custom" on:click={() => selectEditProduct(prod)}>
                                <strong>{prod.codigo || 'S/C'}</strong> - {prod.nombre}
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group fg-small">
                    <label class="form-label font-bold text-small">Partida SAT (Sec):</label>
                    <input type="number" class="form-control" bind:value={tempEditProduct.sec} />
                  </div>
                  <div class="form-group fg-small">
                    <label class="form-label font-bold text-small">NICO:</label>
                    <input type="text" class="form-control" bind:value={tempEditProduct.nico} />
                  </div>
                  <div class="form-group fg-small">
                    <label class="form-label font-bold text-small">Marca:</label>
                    <input type="text" class="form-control" bind:value={tempEditProduct.marca} />
                  </div>
                  <div class="form-group fg-small">
                    <label class="form-label font-bold text-small">Modelo:</label>
                    <input type="text" class="form-control" bind:value={tempEditProduct.modelo} />
                  </div>
                  <div class="form-group fg-medium">
                    <label class="form-label font-bold text-small">Val. Aduana Partida (MXN):</label>
                    <input type="number" class="form-control" bind:value={tempEditProduct.valor_aduana_partida_mxn} />
                  </div>
                </div>

                <div class="form-row mt-3 align-items-end">
                  <div class="form-group fg-medium">
                    <label class="form-label font-bold text-small">Fracción Arancelaria:</label>
                    <input type="text" class="form-control" bind:value={tempEditProduct.fraccion_arancelaria} />
                  </div>
                  <div class="form-group fg-small">
                    <label class="form-label font-bold text-small">U. Medida SAT:</label>
                    <select class="form-select custom-select" bind:value={tempEditProduct.unidad_medida}>
                      {#each UNIDADES_PEDIMENTO_SAT as u}
                        <option value={u.abreviatura}>{u.nombre}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="form-group fg-small">
                    <label class="form-label font-bold text-small">Cantidad:</label>
                    <input type="number" min="1" class="form-control" bind:value={tempEditProduct.cantidad} />
                  </div>
                  <div class="form-group fg-medium">
                    <label class="form-label font-bold text-small">Imp. Precio Pagado (MXN):</label>
                    <input type="number" class="form-control" bind:value={tempEditProduct.importe_precio_pagado_mxn} />
                  </div>
                  <div class="fg-small">
                    <button class="btn btn-primary-custom w-100 py-2" on:click={agregarProductoAListaEdicion}>
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Tabla de Partidas del Pedimento -->
            <div class="table-responsive">
              <table class="table table-custom align-middle">
                <thead>
                  <tr>
                    <th>Partida / Producto</th>
                    <th>SAT Info</th>
                    <th class="text-center" style="width: 100px;">Cantidad</th>
                    <th class="text-center" style="width: 130px;">Costo Compra (USD)</th>
                    <th class="text-center">Costo Fiscal MXN</th>
                    {#if $usuario_db.rol === 'administrador'}
                      <th class="text-center">Acciones</th>
                    {/if}
                  </tr>
                </thead>
                <tbody>
                  {#each pedimentoEditar.productos as item, index}
                    <tr>
                      <td>
                        <div class="font-bold text-dark">{item.nombre}</div>
                        <div class="text-muted text-small">{item.codigo || 'S/C'}</div>
                        <div class="text-muted text-small mt-1">Fracción: <input type="text" class="input-inline" bind:value={item.fraccion_arancelaria} /></div>
                      </td>
                      <td>
                        <div class="text-small">Sec: <input type="number" class="input-inline" style="width: 40px;" bind:value={item.sec} /></div>
                        <div class="text-small">NICO: <input type="text" class="input-inline" style="width: 40px;" bind:value={item.nico} /></div>
                        <div class="text-small">Marca: <input type="text" class="input-inline" style="width: 80px;" bind:value={item.marca} /></div>
                        <div class="text-small">Modelo: <input type="text" class="input-inline" style="width: 80px;" bind:value={item.modelo} /></div>
                        <div class="text-small">Val. Aduana: $<input type="number" class="input-inline" style="width: 80px;" bind:value={item.valor_aduana_partida_mxn} /></div>
                      </td>
                      <td class="text-center">
                        <input type="number" min="1" class="form-control text-center p-1" bind:value={item.cantidad} />
                        <span class="text-muted text-small">{item.unidad_medida}</span>
                      </td>
                      <td class="text-center">
                        <div class="d-flex align-items-center">
                          <span class="text-muted me-1">$</span>
                          <input type="number" step="0.01" class="form-control text-center p-1" bind:value={item.precio_compra_usd} />
                        </div>
                      </td>
                      <td class="text-center text-muted font-bold">
                        {item.costo_fiscal_unitario_mxn > 0 ? formatMoney(item.costo_fiscal_unitario_mxn) : 'Sin calcular'}
                      </td>
                      {#if $usuario_db.rol === 'administrador'}
                        <td class="text-center">
                          <button class="btn btn-action-red" on:click={() => removerProductoDeListaEdicion(index)} title="Eliminar partida">
                            <i class="material-icons text-medium">delete</i>
                          </button>
                        </td>
                      {/if}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-arribo-footer">
        <button class="btn btn-secondary-custom" on:click={() => showEditModal = false}>Cancelar</button>
        <button class="btn btn-primary-custom" style="background: #ea580c;" on:click={guardarEdicionPedimento}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .input-inline {
    border: none;
    border-bottom: 1.5px dashed #cbd5e1;
    background: transparent;
    padding: 1px 4px;
    font-size: inherit;
    outline: none;
    color: #475569;
  }
  
  .input-inline:focus {
    border-bottom: 1.5px solid #ea580c;
    color: #1e293b;
  }
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

  .btn-action-orange {
    background-color: #fff7ed;
    color: #ea580c;
  }

  .btn-action-orange:hover {
    background-color: #ea580c;
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

  /* MODAL DE ARRIBO CON FOLIOS (FASE 4) */
  .modal-arribo-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    animation: fadeIn 0.25s ease-out;
  }

  .modal-arribo-container {
    background: #ffffff;
    width: 90%;
    max-width: 700px;
    max-height: 85vh;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .modal-arribo-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
  }

  .modal-arribo-title-container {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .modal-arribo-icon {
    background: #e0f2fe;
    color: #0284c7;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal-arribo-icon svg {
    width: 20px;
    height: 20px;
  }

  .modal-arribo-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
  }

  .pedimento-numero-badge {
    display: inline-block;
    font-size: 0.75rem;
    background: #3b82f6;
    color: white;
    padding: 2px 8px;
    border-radius: 9999px;
    margin-top: 4px;
    font-weight: 600;
  }

  .btn-close-modal {
    background: none;
    border: none;
    font-size: 1.75rem;
    cursor: pointer;
    color: #64748b;
    line-height: 1;
    transition: color 0.15s;
    padding: 4px 8px;
  }

  .btn-close-modal:hover {
    color: #1e293b;
  }

  .modal-arribo-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .alert-info-custom {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    color: #0369a1;
    padding: 12px 16px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    font-size: 0.9rem;
  }

  .alert-info-custom .info-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .modal-desc-sub {
    color: #64748b;
    font-size: 0.875rem;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .lista-productos-arribo {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .producto-arribo-row {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  .producto-arribo-row:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .producto-nombre {
    font-weight: 700;
    color: #1e293b;
    font-size: 0.95rem;
    margin-bottom: 4px;
  }

  .producto-meta-flex {
    display: flex;
    gap: 16px;
    font-size: 0.825rem;
    color: #475569;
  }

  .meta-item .label {
    color: #64748b;
  }

  .producto-arribo-input {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .producto-arribo-input textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.875rem;
    resize: vertical;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .producto-arribo-input textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .textarea-help {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .modal-arribo-footer {
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: #f8fafc;
  }

  .btn-secondary-custom {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #475569;
    padding: 10px 18px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary-custom:hover {
    background: #f1f5f9;
    color: #1e293b;
    border-color: #94a3b8;
  }

  .btn-primary-custom {
    background: #1a5276;
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .btn-primary-custom:hover {
    background: #154360;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(26, 82, 118, 0.2);
  }

  .btn-primary-custom:active {
    transform: translateY(0);
  }

  .btn-icon {
    width: 16px;
    height: 16px;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* NUEVO LAYOUT DE PRORRATEO (DETALLE DEL PEDIMENTO) */
  .prorrateo-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: stretch;
  }

  @media (max-width: 900px) {
    .prorrateo-grid {
      grid-template-columns: 1fr;
    }
  }

  .detalle-pedimento-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 12px;
    padding: 24px;
    color: #f1f5f9;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .detalle-header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 16px;
  }

  .detalle-header h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #ffffff;
  }

  .card-icon {
    width: 22px;
    height: 22px;
    color: #38bdf8;
  }

  .detalle-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .detalle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    padding: 4px 0;
  }

  .detalle-row.highlight {
    background: rgba(56, 189, 248, 0.1);
    border-radius: 6px;
    padding: 8px 12px;
    margin: 4px 0;
    border-left: 3px solid #38bdf8;
  }

  .detalle-row.mini {
    font-size: 0.825rem;
    color: #cbd5e1;
    padding: 2px 0;
  }

  .detalle-row .label {
    color: #94a3b8;
  }

  .detalle-row.mini .label {
    color: #64748b;
  }

  .detalle-row .value {
    font-weight: 500;
    color: #f8fafc;
  }

  .detalle-row .value.price {
    color: #38bdf8;
    font-weight: 700;
    font-size: 1rem;
  }

  .badge-sat {
    background: rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-badge {
    padding: 3px 8px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-badge.transito {
    background: #fef3c7;
    color: #d97706;
  }

  .status-badge.arribado {
    background: #dcfce7;
    color: #15803d;
  }

  .detalle-seccion-titulo {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-top: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 6px;
    font-weight: 600;
  }

  /* NUEVOS ESTILOS ARRIBO Y EDICION (FASE 4+) */
  .actualizar-existencias-option {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    padding: 14px 18px;
    border-radius: 12px;
  }
  
  .actualizar-existencias-option .custom-control-label {
    cursor: pointer;
    user-select: none;
  }

  .actualizar-existencias-option .form-check-input {
    width: 18px;
    height: 18px;
    vertical-align: text-bottom;
  }

  .stock-comparativa {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85em;
  }

  .stock-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 500;
  }

  .bg-secondary-light {
    background-color: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .bg-primary-light {
    background-color: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  .stock-arrow {
    color: #64748b;
    font-weight: bold;
  }
</style>
