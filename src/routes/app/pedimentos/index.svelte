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

  // Eliminar pedimentos solo se ofrece cuando se corre en localhost.
  const esLocal = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  async function eliminarPedimento(ped) {
    if (!confirm(`¿Eliminar el pedimento ${ped.numero_pedimento}? Esta acción no se puede deshacer.`)) return;
    loading = true;
    try {
      const res = await postData("app/pedimentos/eliminar", { id_pedimento: ped._id });
      if (res.ok) {
        mensaje_bueno("Pedimento eliminado.");
        await cargarPedimentos();
      } else {
        mensaje_error(res.mensaje || "No se pudo eliminar.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de conexión al eliminar.");
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

  let totalPiezasNuevas = 0;
  let totalPrecioPagadoMxn = 0;
  let totalValorAduanaMxn = 0;
  let totalUsdNuevas = 0;
  let partidasSinVincularCount = 0;

  $: {
    if (nuevoPedimento && nuevoPedimento.productos) {
      totalPiezasNuevas = nuevoPedimento.productos.reduce((acc, p) => acc + (parseFloat(p.cantidad) || 0), 0);
      totalPrecioPagadoMxn = nuevoPedimento.productos.reduce((acc, p) => acc + ((parseFloat(p.precio_compra_usd) || 0) * (parseFloat(p.cantidad) || 0) * (parseFloat(nuevoPedimento.tipo_cambio) || 1)), 0);
      totalValorAduanaMxn = nuevoPedimento.productos.reduce((acc, p) => acc + (parseFloat(p.valor_aduana_partida_mxn) || 0), 0);
      totalUsdNuevas = nuevoPedimento.productos.reduce((acc, p) => acc + ((parseFloat(p.cantidad) || 0) * (parseFloat(p.precio_compra_usd) || 0)), 0);
      partidasSinVincularCount = nuevoPedimento.productos.filter(p => !p.producto).length;
    } else {
      totalPiezasNuevas = 0;
      totalPrecioPagadoMxn = 0;
      totalValorAduanaMxn = 0;
      totalUsdNuevas = 0;
      partidasSinVincularCount = 0;
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
    
    // Sumar contribuciones deducibles (IGI + DTA + PRV) excluyendo el IVA (100% acreditable según LIVA y NIF C-4)
    const totalImpuestosSat = (c.igi || 0) + (c.dta || 0) + (c.prv || 0);
    nuevoPedimento.gastos_importacion.Impuesto_Aduanal = totalImpuestosSat;
    nuevoPedimento.gastos_importacion.Flete = inc.fletes || 0;
    nuevoPedimento.gastos_importacion.Seguro = inc.seguros || 0;
    
    mensaje_bueno("Gastos e impuestos del SAT sincronizados para prorrateo (IVA acreditable excluido del costo).");
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

  // --- Gastos indirectos adicionales (generales del pedimento o propios de una partida) ---
  // contexto: "nuevo" (alta) | "edicion"; partida: índice de la partida, o null si el gasto es general.
  let gastoModal = { abierto: false, contexto: "nuevo", partida: null, indice: null, datos: {} };

  function fechaHoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function pedimentoDeContexto(contexto) {
    return contexto === "edicion" ? pedimentoEditar : nuevoPedimento;
  }

  function listaDeGastos(ped, partida) {
    if (!ped) return [];
    if (partida === null || partida === undefined) {
      if (!ped.gastos_importacion) ped.gastos_importacion = { Impuesto_Aduanal: 0, Flete: 0, Agente_Aduanal: 0, Seguridad: 0, Seguro: 0, otros: [] };
      if (!ped.gastos_importacion.otros) ped.gastos_importacion.otros = [];
      return ped.gastos_importacion.otros;
    }
    if (!ped.productos || !ped.productos[partida]) return [];
    if (!ped.productos[partida].gastos_adicionales) ped.productos[partida].gastos_adicionales = [];
    return ped.productos[partida].gastos_adicionales;
  }

  function abrirGastoModal(contexto, partida = null, indice = null) {
    const ped = pedimentoDeContexto(contexto);
    let datos = { concepto: "", monto: 0, fecha_gasto: fechaHoyISO(), uuid_cfdi: "", proveedor: "", rfc: "", factura: "", observaciones: "" };
    if (indice !== null) {
      const g = listaDeGastos(ped, partida)[indice];
      if (g) {
        datos = {
          concepto: g.concepto || "",
          monto: g.monto || 0,
          fecha_gasto: g.fecha_gasto ? String(g.fecha_gasto).slice(0, 10) : "",
          uuid_cfdi: g.uuid_cfdi || (g.factura ? g.factura.uuid : "") || "",
          proveedor: g.proveedor ? (g.proveedor.nombre || "") : "",
          rfc: g.proveedor ? (g.proveedor.rfc || "") : "",
          factura: g.factura ? (g.factura.numero || "") : "",
          observaciones: g.observaciones || ""
        };
      }
    }
    gastoModal = { abierto: true, contexto, partida, indice, datos };
  }

  function cerrarGastoModal() {
    gastoModal = { ...gastoModal, abierto: false };
  }

  function guardarGasto() {
    const d = gastoModal.datos;
    const monto = parseFloat(d.monto);
    if (!d.concepto || !d.concepto.trim()) {
      mensaje_error("Escribe el concepto del gasto.");
      return;
    }
    if (isNaN(monto) || monto === 0) {
      mensaje_error("El monto debe ser diferente de cero (positivo para gastos/honorarios, negativo para devoluciones o reembolsos de anticipo).");
      return;
    }
    const ped = pedimentoDeContexto(gastoModal.contexto);
    const lista = listaDeGastos(ped, gastoModal.partida);
    const uuidLimpio = (d.uuid_cfdi || "").trim().toUpperCase();
    const gasto = {
      concepto: d.concepto.trim(),
      monto,
      fecha_gasto: d.fecha_gasto || null,
      uuid_cfdi: uuidLimpio,
      proveedor: {
        nombre: (d.proveedor || "").trim(),
        rfc: (d.rfc || "").trim().toUpperCase()
      },
      factura: {
        numero: (d.factura || "").trim(),
        uuid: uuidLimpio,
        fecha_emision: d.fecha_gasto || null
      },
      observaciones: d.observaciones || ""
    };
    if (gastoModal.indice === null) lista.push(gasto);
    else lista[gastoModal.indice] = gasto;
    asignarPedimentoContexto(gastoModal.contexto, gastoModal.partida);
    cerrarGastoModal();
  }

  function quitarGasto(contexto, partida, indice) {
    const lista = listaDeGastos(pedimentoDeContexto(contexto), partida);
    lista.splice(indice, 1);
    asignarPedimentoContexto(contexto, partida);
  }

  // Reasigna para que Svelte detecte el cambio en las listas anidadas (reactividad forzada).
  function asignarPedimentoContexto(contexto, partida = null) {
    if (contexto === "edicion") {
      if (partida === null || partida === undefined) {
        if (!pedimentoEditar.gastos_importacion) pedimentoEditar.gastos_importacion = {};
        pedimentoEditar.gastos_importacion.otros = [...(pedimentoEditar.gastos_importacion.otros || [])];
      } else if (pedimentoEditar.productos && pedimentoEditar.productos[partida]) {
        pedimentoEditar.productos[partida].gastos_adicionales = [...(pedimentoEditar.productos[partida].gastos_adicionales || [])];
        pedimentoEditar.productos = [...pedimentoEditar.productos];
      }
      pedimentoEditar = { ...pedimentoEditar };
    } else {
      if (partida === null || partida === undefined) {
        if (!nuevoPedimento.gastos_importacion) nuevoPedimento.gastos_importacion = {};
        nuevoPedimento.gastos_importacion.otros = [...(nuevoPedimento.gastos_importacion.otros || [])];
      } else if (nuevoPedimento.productos && nuevoPedimento.productos[partida]) {
        nuevoPedimento.productos[partida].gastos_adicionales = [...(nuevoPedimento.productos[partida].gastos_adicionales || [])];
        nuevoPedimento.productos = [...nuevoPedimento.productos];
      }
      nuevoPedimento = { ...nuevoPedimento };
    }
    // El modal de gastos de partida lee los datos por función; hay que invalidarlo.
    gastosPartidaModal = { ...gastosPartidaModal };
  }

  function sumarGastosPartidas(ped) {
    return ((ped && ped.productos) || []).reduce((acc, p) => acc + sumarGastosLista(p.gastos_adicionales), 0);
  }

  function sumarGastosLista(lista) {
    return (lista || []).reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
  }

  // --- Menú de acciones por partida y modal con sus gastos ---
  // El menú se dibuja con posición fija para que la tabla con scroll no lo recorte.
  let menuPartida = { abierto: false, contexto: "nuevo", partida: null, x: 0, y: 0 };
  let gastosPartidaModal = { abierto: false, contexto: "nuevo", partida: null };

  function abrirMenuPartida(evento, contexto, partida) {
    evento.stopPropagation();
    if (menuPartida.abierto && menuPartida.partida === partida && menuPartida.contexto === contexto) {
      menuPartida = { ...menuPartida, abierto: false };
      return;
    }
    const caja = evento.currentTarget.getBoundingClientRect();
    const alto = 170;
    const y = caja.bottom + alto > window.innerHeight ? caja.top - alto : caja.bottom + 4;
    menuPartida = { abierto: true, contexto, partida, x: Math.max(8, caja.right - 230), y };
  }

  function cerrarMenuPartida() {
    if (menuPartida.abierto) menuPartida = { ...menuPartida, abierto: false };
  }

  function gastosDePartida(contexto, partida) {
    if (partida === null) return [];
    const prod = pedimentoDeContexto(contexto).productos[partida];
    return (prod && prod.gastos_adicionales) || [];
  }

  function accionMenu(accion) {
    const { contexto, partida } = menuPartida;
    cerrarMenuPartida();
    if (accion === "agregar") abrirGastoModal(contexto, partida);
    else if (accion === "ver") gastosPartidaModal = { abierto: true, contexto, partida };
    else if (accion === "eliminar") {
      if (contexto === "edicion") removerProductoDeListaEdicion(partida);
      else removerProductoDeLista(partida);
    }
  }

  // --- Menú desplegable de opciones para pedimentos en la lista principal ---
  let menuPedimento = { abierto: false, ped: null, x: 0, y: 0 };
  let showCargosModal = false;
  let pedimentoCargos = null;

  function abrirMenuPedimento(evento, ped) {
    evento.stopPropagation();
    if (menuPedimento.abierto && menuPedimento.ped && menuPedimento.ped._id === ped._id) {
      menuPedimento = { ...menuPedimento, abierto: false };
      return;
    }
    const caja = evento.currentTarget.getBoundingClientRect();
    const alto = 220;
    const y = caja.bottom + alto > window.innerHeight ? caja.top - alto : caja.bottom + 4;
    menuPedimento = { abierto: true, ped, x: Math.max(8, caja.right - 240), y };
  }

  function cerrarMenuPedimento() {
    if (menuPedimento.abierto) menuPedimento = { ...menuPedimento, abierto: false };
  }

  function cerrarTodosLosMenus() {
    cerrarMenuPartida();
    cerrarMenuPedimento();
  }

  function ejecutarAccionPedimento(accion) {
    const ped = menuPedimento.ped;
    cerrarMenuPedimento();
    if (!ped) return;
    if (accion === "costos") {
      irACalcularCostos(ped);
    } else if (accion === "ver_cargos") {
      abrirModalCargos(ped);
    } else if (accion === "editar") {
      abrirModalEditar(ped);
    } else if (accion === "arribar") {
      abrirModalArribo(ped);
    } else if (accion === "eliminar") {
      eliminarPedimento(ped);
    }
  }

  function abrirModalCargos(ped) {
    pedimentoCargos = ped;
    showCargosModal = true;
  }

  function contarTotalCargosExtra(ped) {
    if (!ped) return 0;
    const otrosCount = (ped.gastos_importacion && Array.isArray(ped.gastos_importacion.otros)) ? ped.gastos_importacion.otros.length : 0;
    const partidasCount = (ped.productos || []).reduce((acc, p) => acc + ((p.gastos_adicionales && Array.isArray(p.gastos_adicionales)) ? p.gastos_adicionales.length : 0), 0);
    return otrosCount + partidasCount;
  }

  function obtenerPartidasConCargos(ped) {
    if (!ped || !Array.isArray(ped.productos)) return [];
    return ped.productos.filter(p => p.gastos_adicionales && Array.isArray(p.gastos_adicionales) && p.gastos_adicionales.length > 0);
  }

  function removerProductoDeLista(index) {
    nuevoPedimento.productos.splice(index, 1);
    nuevoPedimento.productos = nuevoPedimento.productos;
  }

  function vincularProductoAPartida(prod, prodId) {
    if (!prodId || prodId === "null") {
      prod.producto = null;
      nuevoPedimento.productos = nuevoPedimento.productos;
      return;
    }
    const selected = allProducts.find(p => String(p._id) === String(prodId));
    if (selected) {
      prod.producto = selected._id;
      prod.nombre = selected.nombre;
      prod.codigo = selected.codigo;
      nuevoPedimento.productos = nuevoPedimento.productos;
    }
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

    const sinVincular = nuevoPedimento.productos.filter(p => !p.producto);
    if (sinVincular.length > 0) {
      const secs = sinVincular.map(p => `#${p.sec}`).join(', ');
      mensaje_error(`Atención: La(s) partida(s) ${secs} no tienen un producto de Xenon vinculado. Por favor selecciona el producto correspondiente en la tabla antes de guardar.`);
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

  let showFormulaModal = false;

  async function handleM3FileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    loading = true;
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const fileContent = evt.target.result;
        const res = await postData("app/pedimentos/parse", { file_content: fileContent });
        
        if (res.ok && res.data) {
          const d = res.data;
          nuevoPedimento.numero_pedimento = d.numero_pedimento || nuevoPedimento.numero_pedimento;
          nuevoPedimento.clave_pedimento = d.clave_pedimento || nuevoPedimento.clave_pedimento;
          nuevoPedimento.fecha_pedimento = d.fecha_pedimento || nuevoPedimento.fecha_pedimento;
          nuevoPedimento.tipo_cambio = d.tipo_cambio || nuevoPedimento.tipo_cambio;
          nuevoPedimento.cove = d.cove || nuevoPedimento.cove;
          nuevoPedimento.proveedor = d.proveedor || nuevoPedimento.proveedor;
          nuevoPedimento.incrementables_sat = d.incrementables_sat || nuevoPedimento.incrementables_sat;
          nuevoPedimento.contribuciones_sat = d.contribuciones_sat || nuevoPedimento.contribuciones_sat;
          nuevoPedimento.gastos_importacion = d.gastos_importacion || nuevoPedimento.gastos_importacion;
          nuevoPedimento.productos = d.productos || [];

          mensaje_bueno(res.mensaje || "Archivo M3 cargado y procesado con éxito.");
        } else {
          mensaje_error(res.mensaje || "Error al procesar el archivo M3.");
        }
        loading = false;
      };

      reader.readAsText(file, "UTF-8");
    } catch (err) {
      console.error(err);
      mensaje_error("Error al leer el archivo M3.");
      loading = false;
    }
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
    
    if (!pedimentoEditar.gastos_importacion) {
      pedimentoEditar.gastos_importacion = { Impuesto_Aduanal: 0, Flete: 0, Agente_Aduanal: 0, Seguridad: 0, Seguro: 0, otros: [] };
    }
    if (!pedimentoEditar.gastos_importacion.otros) {
      pedimentoEditar.gastos_importacion.otros = [];
    }
    if (!pedimentoEditar.contribuciones_sat) {
      pedimentoEditar.contribuciones_sat = { dta: 0, prv: 0, igi: 0, iva: 0, total_efectivo: 0 };
    }
    if (!pedimentoEditar.incrementables_sat) {
      pedimentoEditar.incrementables_sat = { fletes: 0, seguros: 0, otros: 0 };
    }

    pedimentoEditar.productos = (pedimentoEditar.productos || []).map(item => {
      const pId = item.producto && item.producto._id ? item.producto._id : item.producto;
      const prodOriginal = allProducts.find(p => p._id === pId);
      return {
        ...item,
        producto: pId,
        nombre: prodOriginal ? prodOriginal.nombre : (item.producto && item.producto.nombre ? item.producto.nombre : "Producto Desconocido"),
        codigo: prodOriginal ? prodOriginal.codigo : (item.producto && item.producto.codigo ? item.producto.codigo : ""),
        gastos_adicionales: item.gastos_adicionales || []
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
    
    // Sumar contribuciones deducibles (IGI + DTA + PRV) excluyendo el IVA (100% acreditable según LIVA y NIF C-4)
    const totalImpuestosSat = (c.igi || 0) + (c.dta || 0) + (c.prv || 0);
    pedimentoEditar.gastos_importacion.Impuesto_Aduanal = totalImpuestosSat;
    pedimentoEditar.gastos_importacion.Flete = inc.fletes || 0;
    pedimentoEditar.gastos_importacion.Seguro = inc.seguros || 0;
    
    mensaje_bueno("Gastos e impuestos del SAT sincronizados para prorrateo (IVA acreditable excluido del costo).");
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

  function calcularCostoBase(item, tc) {
    if (!item) return 0;
    const cant = parseFloat(item.cantidad) || 1;
    const vAduana = parseFloat(item.valor_aduana_partida_mxn);
    if (vAduana > 0 && cant > 0) {
      return vAduana / cant;
    }
    const vPagado = parseFloat(item.importe_precio_pagado_mxn);
    if (vPagado > 0 && cant > 0) {
      return vPagado / cant;
    }
    return (parseFloat(item.precio_compra_usd) || 0) * (parseFloat(tc) || 1);
  }

  function calcularGastoDirecto(item) {
    if (!item || !item.cantidad) return 0;
    return sumarGastosLista(item.gastos_adicionales) / item.cantidad;
  }

  function calcularGastoIndirecto(item, tc) {
    if (!item || !item.costo_fiscal_unitario_mxn || item.costo_fiscal_unitario_mxn <= 0) return 0;
    const base = calcularCostoBase(item, tc);
    const directo = calcularGastoDirecto(item);
    return Math.max(0, item.costo_fiscal_unitario_mxn - base - directo);
  }

  // --- Funciones de Desglose Fiscal Exacto (Excluyendo IVA según Art. 4-5 LIVA y NIF C-4) ---
  function obtenerImpuestosDeducibles(ped) {
    if (!ped) return 0;
    const g = ped.gastos_importacion || {};
    const imp = ped.impuestos || {};
    const cont = ped.contribuciones_sat || {};
    let total = (imp.dta || cont.dta || 0) + (imp.prv || cont.prv || 0) + (imp.igi || cont.igi || 0) + (imp.cnt || 0);
    if (total === 0 && (g.Impuesto_Aduanal || 0) > 0) {
      total = g.Impuesto_Aduanal || 0;
    }
    return total;
  }

  function obtenerFletes(ped) {
    if (!ped) return 0;
    const g = ped.gastos_importacion || {};
    const inc = ped.incrementables_sat || {};
    if (g.gastos_costo && Array.isArray(g.gastos_costo) && g.gastos_costo.length > 0) {
      const f = g.gastos_costo.filter(x => x.tipo === 'FLETE').reduce((acc, x) => acc + (parseFloat(x.importe) || 0), 0);
      if (f > 0) return f;
    }
    return g.Flete || inc.fletes || 0;
  }

  function obtenerSeguros(ped) {
    if (!ped) return 0;
    const g = ped.gastos_importacion || {};
    const inc = ped.incrementables_sat || {};
    if (g.gastos_costo && Array.isArray(g.gastos_costo) && g.gastos_costo.length > 0) {
      const s = g.gastos_costo.filter(x => x.tipo === 'SEGUROS').reduce((acc, x) => acc + (parseFloat(x.importe) || 0), 0);
      if (s > 0) return s;
    }
    return g.Seguro || g.Seguridad || inc.seguros || 0;
  }

  function obtenerHonorarios(ped) {
    if (!ped) return 0;
    const g = ped.gastos_importacion || {};
    if (g.honorarios_agente && Array.isArray(g.honorarios_agente) && g.honorarios_agente.length > 0) {
      return g.honorarios_agente.reduce((acc, h) => acc + (parseFloat(h.importe) || 0), 0);
    }
    return g.Agente_Aduanal || 0;
  }

  function obtenerOtrosIndirectos(ped) {
    if (!ped) return 0;
    const g = ped.gastos_importacion || {};
    const inc = ped.incrementables_sat || {};
    let suma = 0;
    if (g.gastos_costo && Array.isArray(g.gastos_costo) && g.gastos_costo.length > 0) {
      suma += g.gastos_costo.filter(x => x.tipo !== 'FLETE' && x.tipo !== 'SEGUROS').reduce((acc, x) => acc + (parseFloat(x.importe) || 0), 0);
    }
    if (g.otros && Array.isArray(g.otros) && g.otros.length > 0) {
      suma += g.otros.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);
    } else if (suma === 0) {
      suma = inc.otros || 0;
    }
    return suma;
  }

  function obtenerGastosPositivosIndirectos(ped) {
    if (!ped || !ped.gastos_importacion || !Array.isArray(ped.gastos_importacion.otros)) return 0;
    return ped.gastos_importacion.otros.filter(x => (parseFloat(x.monto) || 0) > 0).reduce((acc, x) => acc + (parseFloat(x.monto) || 0), 0);
  }

  function obtenerDevolucionesIndirectas(ped) {
    if (!ped || !ped.gastos_importacion || !Array.isArray(ped.gastos_importacion.otros)) return 0;
    return ped.gastos_importacion.otros.filter(x => (parseFloat(x.monto) || 0) < 0).reduce((acc, x) => acc + (parseFloat(x.monto) || 0), 0);
  }

  function tieneDevolucionesIndirectas(ped) {
    return obtenerDevolucionesIndirectas(ped) < 0;
  }

  function obtenerIvaAcreditable(ped) {
    if (!ped) return 0;
    const imp = ped.impuestos || {};
    const cont = ped.contribuciones_sat || {};
    const ivaImp = (imp.iva && imp.iva.monto) ? parseFloat(imp.iva.monto) : 0;
    return ivaImp || parseFloat(cont.iva) || parseFloat(cont.iva_acreditable) || 0;
  }

  // Sumatoria total de gastos indirectos de un pedimento a prorratear (SIN IVA)
  function sumarGastosIndirectos(ped) {
    if (!ped) return 0;
    return (
      obtenerImpuestosDeducibles(ped) +
      obtenerFletes(ped) +
      obtenerSeguros(ped) +
      obtenerHonorarios(ped) +
      obtenerOtrosIndirectos(ped)
    );
  }


</script>

<svelte:window on:click={cerrarTodosLosMenus} />

<svelte:head>
  <title>Pedimentos de Importación - Admin</title>
</svelte:head>

<!-- Overlay y loader de carga -->
{#if loading}
  <div class="overlay" transition:fade|local={{ duration: 150 }}></div>
  <div class="loader-container" transition:fade|local={{ duration: 150 }}>
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
                        class="btn-acciones" 
                        on:click={(e) => abrirMenuPedimento(e, ped)} 
                        title="Opciones del pedimento"
                      >
                        Acciones <i class="material-icons">arrow_drop_down</i>
                        {#if contarTotalCargosExtra(ped) > 0}
                          <span class="badge-gastos" title="{contarTotalCargosExtra(ped)} cargo(s)/devolución(es) extra">
                            {contarTotalCargosExtra(ped)}
                          </span>
                        {/if}
                      </button>
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
        <p class="subtitulo">Ingresa los datos generales, desglosa los gastos de flete e impuestos o carga el archivo plano M3 del SAT.</p>
      </div>

      <!-- Banner de Carga Masiva M3 SAT -->
      <div class="card p-4 mb-4" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; border-radius: 12px; border: 1px solid #334155;">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h4 class="m-0 font-bold" style="color: #38bdf8; font-size: 1.1rem;">
              <i class="material-icons vertical-align-middle me-1">cloud_upload</i> Carga Masiva desde Archivo Plano M3 (SAT Anexo 22)
            </h4>
            <p class="text-small m-0 mt-1" style="color: #94a3b8; font-size: 0.85rem;">
              Sube el archivo plano de la agencia aduanal (.338, .034, .txt o .m3) para auto-completar los datos del pedimento, contribuciones y vincular las partidas con tus productos registrados en Xenon.
            </p>
          </div>
          <div>
            <label class="btn font-bold cursor-pointer" style="background: #0284c7; color: white; border-radius: 8px; padding: 10px 20px; font-size: 0.9rem;">
              <i class="material-icons text-medium vertical-align-middle me-1">folder_open</i> Seleccionar Archivo M3
              <input type="file" accept=".338,.034,.txt,.m3" style="display: none;" on:change={handleM3FileUpload} />
            </label>
          </div>
        </div>
      </div>

      <div class="secciones-verticales">
        <!-- 1. Datos Generales y Aduanales -->
        <div class="card p-4 mb-4 card-sec card-sec-azul">
          <div class="sec-header sec-azul">
            <span class="sec-icon"><i class="material-icons">description</i></span>
            <div class="sec-titulo">
              <span class="sec-num">1</span>
              <h4>Datos generales y aduanales</h4>
              <span class="sec-sub">Pedimento, aduana, proveedor y valores declarados ante el SAT</span>
            </div>
          </div>

          
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
        <div class="card p-4 mb-4 card-sec card-sec-violeta">
          <div class="sec-header sec-violeta">
            <span class="sec-icon"><i class="material-icons">account_balance</i></span>
            <div class="sec-titulo">
              <span class="sec-num">2</span>
              <h4>Incrementables y contribuciones SAT</h4>
              <span class="sec-sub">Valores oficiales declarados; se cargan al prorrateo con un clic</span>
            </div>
          </div>

          
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

        </div>

        <!-- 3. Gastos indirectos de importación -->
        <div class="card p-4 mb-4 card-sec card-sec-ambar">
          <div class="sec-header sec-ambar">
            <span class="sec-icon"><i class="material-icons">local_shipping</i></span>
            <div class="sec-titulo">
              <span class="sec-num">3</span>
              <h4>Gastos indirectos de importación (MXN)</h4>
              <span class="sec-sub">Costos fiscales que se prorratean entre las partidas</span>
            </div>
            <span class="sec-total" title="Incluye gastos generales y gastos por partida">
              <small>Total indirectos</small>
              <strong>{formatMoney(sumarGastosIndirectos(nuevoPedimento))}</strong>
            </span>
          </div>

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

          <!-- Gastos indirectos adicionales -->
          <div class="gastos-adicionales mt-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>Gastos indirectos adicionales e inesperados</strong>
                <div class="text-muted text-small">Maniobras, almacenajes, demoras, licencias o fletes secundarios. Se reparten entre todos los productos.</div>
              </div>
              <button class="btn btn-secondary btn-sm" on:click={() => abrirGastoModal("nuevo")}>
                <i class="material-icons text-small">add</i> Agregar gasto adicional
              </button>
            </div>
            {#if nuevoPedimento.gastos_importacion.otros.length === 0}
              <div class="text-muted text-small">No hay gastos adicionales registrados.</div>
            {:else}
              <table class="table table-sm">
                <thead><tr><th>Concepto</th><th class="text-end">Monto (MXN)</th><th>Fecha</th><th>Notas</th><th class="text-center">Acciones</th></tr></thead>
                <tbody>
                  {#each nuevoPedimento.gastos_importacion.otros as otro, index}
                    <tr>
                      <td>{otro.concepto}</td>
                      <td class="text-end font-mono">{formatMoney(otro.monto)}</td>
                      <td>{otro.fecha_gasto ? String(otro.fecha_gasto).slice(0, 10) : ""}</td>
                      <td class="text-muted text-small">{otro.observaciones || ""}</td>
                      <td class="text-center">
                        <button class="btn btn-sm" on:click={() => abrirGastoModal("nuevo", null, index)} title="Editar"><i class="material-icons text-small">edit</i></button>
                        <button class="btn btn-danger-icon" on:click={() => quitarGasto("nuevo", null, index)} title="Eliminar"><i class="material-icons">delete</i></button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
              <div class="d-flex justify-content-end align-items-center gap-3 text-small mt-2 pt-2 border-top">
                {#if tieneDevolucionesIndirectas(nuevoPedimento)}
                  <span class="text-muted">Gastos brutos: <strong class="font-mono">{formatMoney(obtenerGastosPositivosIndirectos(nuevoPedimento))}</strong></span>
                  <span class="text-danger font-bold">(-) Devoluciones: <strong class="font-mono">{formatMoney(obtenerDevolucionesIndirectas(nuevoPedimento))}</strong></span>
                {/if}
                <span>Subtotal neto adicionales: <strong class="font-mono text-primary">{formatMoney(sumarGastosLista(nuevoPedimento.gastos_importacion.otros))}</strong></span>
              </div>
            {/if}
          </div>
        </div>

        <!-- 4. Productos en el Cargamento -->
        <div class="card p-4 mb-4 card-sec card-sec-verde">
          <div class="sec-header sec-verde">
            <span class="sec-icon"><i class="material-icons">inventory_2</i></span>
            <div class="sec-titulo">
              <span class="sec-num">4</span>
              <h4>Productos en el cargamento (partidas)</h4>
              <span class="sec-sub">Agrega las partidas; el botón de cada fila registra gastos propios de esa partida</span>
            </div>
          </div>


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
                <div class="custom-dropdown-content" transition:fade|local={{ duration: 100 }}>
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

          <!-- Tabla de Productos Agregados (Partidas) -->
          <div class="partidas-table-wrapper card shadow-sm border mb-4">
            <div class="card-header bg-white py-3 px-4 d-flex align-items-center justify-content-between border-bottom">
              <div class="d-flex align-items-center gap-2">
                <i class="material-icons text-primary" style="font-size: 22px;">format_list_bulleted</i>
                <h5 class="m-0 font-bold text-dark">Lista de Partidas ({nuevoPedimento.productos.length})</h5>
              </div>
              {#if nuevoPedimento.productos.length > 0}
                <div class="d-flex gap-2 align-items-center">
                  {#if partidasSinVincularCount > 0}
                    <span class="badge bg-danger text-white font-mono px-3 py-2 animate-pulse">
                      ⚠️ {partidasSinVincularCount} partida(s) sin vincular
                    </span>
                  {/if}
                  <span class="badge bg-light text-dark font-mono px-3 py-2 border">
                    Total Piezas: <strong class="text-primary">{totalPiezasNuevas.toLocaleString()}</strong>
                  </span>
                  <span class="badge bg-light text-dark font-mono px-3 py-2 border">
                    Total USD: <strong class="text-success">${totalUsdNuevas.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</strong>
                  </span>
                </div>
              {/if}
            </div>

            <div class="table-responsive partidas-scroll-container">
              {#if nuevoPedimento.productos.length === 0}
                <div class="p-4 text-center text-muted">
                  <i class="material-icons text-muted" style="font-size: 36px;">inventory_2</i>
                  <p class="m-0 mt-2 text-small">No hay productos ni partidas agregadas a este pedimento.</p>
                </div>
              {:else}
                <table class="table table-custom-partidas align-middle mb-0">
                  <thead>
                    <tr>
                      <th class="text-center" style="width: 50px;">Sec</th>
                      <th>Producto</th>
                      <th>Marca / Modelo</th>
                      <th>Fracción / NICO</th>
                      <th class="text-end" style="width: 110px;">Cantidad</th>
                      <th class="text-end" style="width: 140px;">P. Unit. (USD)</th>
                      <th class="text-end" style="width: 160px;">Imp. Pagado (MXN)</th>
                      <th class="text-end" style="width: 150px;">Val. Aduana (MXN)</th>
                      <th class="text-end" style="width: 140px;">Total (USD)</th>
                      <th class="text-center" style="width: 110px;">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each nuevoPedimento.productos as prod, index}
                      <tr class={!prod.producto ? 'bg-warning-subtle' : ''}>
                        <td class="text-center">
                          <span class="sec-badge">{prod.sec}</span>
                        </td>
                        <td>
                          {#if prod.producto}
                            <div class="font-bold text-dark">{prod.nombre}</div>
                            <span class="sku-tag">{prod.codigo || 'S/C'}</span>
                          {:else}
                            <div class="d-flex align-items-center gap-1 mb-1">
                              <span class="badge bg-danger text-white text-small" style="font-size: 0.72rem;">⚠️ Sin Vincular</span>
                              <span class="text-small text-muted font-bold" title={prod.nombre}>
                                SAT: {prod.nombre.length > 25 ? prod.nombre.substring(0,25) + '...' : prod.nombre}
                              </span>
                            </div>
                            <select 
                              class="form-select form-select-sm border-danger text-small py-1 px-2" 
                              style="max-width: 280px; background-color: #fff1f2; font-size: 0.8rem;"
                              bind:value={prod.producto}
                              on:change={(e) => vincularProductoAPartida(prod, e.target.value)}
                            >
                              <option value={null}>-- Seleccionar Producto Xenon --</option>
                              {#each allProducts as p}
                                <option value={p._id}>[{p.codigo || 'S/C'}] {p.nombre}</option>
                              {/each}
                            </select>
                          {/if}
                        </td>
                        <td>
                          <div class="badge-marca">{prod.marca || 'S/M'}</div>
                          <div class="text-muted text-small font-mono">{prod.modelo || 'S/Mod'}</div>
                        </td>
                        <td>
                          <div class="fraccion-code">{prod.fraccion_arancelaria || 'S/F'}</div>
                          <span class="nico-badge">NICO: {prod.nico || '00'}</span>
                        </td>
                        <td class="text-end font-mono">
                          <strong class="text-dark">{prod.cantidad.toLocaleString()}</strong> <span class="text-muted text-small">{prod.unidad_medida}</span>
                        </td>
                        <td class="text-end font-mono text-small">
                          ${prod.precio_compra_usd.toFixed(4)}
                        </td>
                        <td class="text-end font-mono font-bold text-dark">
                          {formatMoney(prod.precio_compra_usd * prod.cantidad * nuevoPedimento.tipo_cambio)}
                        </td>
                        <td class="text-end font-mono text-secondary">
                          {formatMoney(prod.valor_aduana_partida_mxn)}
                        </td>
                        <td class="text-end font-mono font-bold text-success">
                          ${(prod.cantidad * prod.precio_compra_usd).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td class="text-center">
                          <button class="btn-acciones" on:click={(e) => abrirMenuPartida(e, "nuevo", index)} title="Acciones de la partida">
                            Acciones <i class="material-icons">arrow_drop_down</i>
                            {#if sumarGastosLista(prod.gastos_adicionales) > 0}<span class="badge-gastos">{(prod.gastos_adicionales || []).length}</span>{/if}
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                  {#if nuevoPedimento.productos.length > 0}
                    <tfoot class="table-foot-summary">
                      <tr>
                        <td colspan="4" class="text-end font-bold text-dark">Totales del Cargamento:</td>
                        <td class="text-end font-bold text-dark font-mono">{totalPiezasNuevas.toLocaleString()}</td>
                        <td class="text-end text-muted font-mono">-</td>
                        <td class="text-end font-bold text-primary font-mono">{formatMoney(totalPrecioPagadoMxn)}</td>
                        <td class="text-end font-bold text-secondary font-mono">{formatMoney(totalValorAduanaMxn)}</td>
                        <td class="text-end font-bold text-success font-mono">${totalUsdNuevas.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  {/if}
                </table>
              {/if}
            </div>
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
            <div class="detalle-row">
              <span class="label">Valuación:</span>
              <span class="value badge" style="background: #e0e7ff; color: #3730a3; font-weight: 700;">PEPS (LISR Art. 41)</span>
            </div>
            <div class="detalle-row highlight">
              <span class="label">Total a Prorratear:</span>
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

            <div class="detalle-seccion-titulo">Gastos Indirectos (a Prorratear):</div>
            <div class="detalle-row mini">
              <span class="label">Impuestos Deducibles:</span>
              <span class="value">{formatMoney(obtenerImpuestosDeducibles(pedimentoSeleccionado))}</span>
            </div>
            <div class="detalle-row mini">
              <span class="label">Fletes:</span>
              <span class="value">{formatMoney(obtenerFletes(pedimentoSeleccionado))}</span>
            </div>
            <div class="detalle-row mini">
              <span class="label">Seguros:</span>
              <span class="value">{formatMoney(obtenerSeguros(pedimentoSeleccionado))}</span>
            </div>
            <div class="detalle-row mini">
              <span class="label">Agente Aduanal:</span>
              <span class="value">{formatMoney(obtenerHonorarios(pedimentoSeleccionado))}</span>
            </div>
            {#if tieneDevolucionesIndirectas(pedimentoSeleccionado)}
              <div class="detalle-row mini">
                <span class="label">Otros gastos brutos:</span>
                <span class="value font-mono">{formatMoney(obtenerGastosPositivosIndirectos(pedimentoSeleccionado))}</span>
              </div>
              <div class="detalle-row mini" style="color: #dc2626;">
                <span class="label font-bold">(-) Devoluciones / Reembolsos:</span>
                <span class="value font-bold font-mono">{formatMoney(obtenerDevolucionesIndirectas(pedimentoSeleccionado))}</span>
              </div>
              <div class="detalle-row mini" style="border-top: 1px dashed #cbd5e1; padding-top: 2px;">
                <span class="label font-bold">Otros indirectos (neto):</span>
                <span class="value font-bold font-mono">{formatMoney(obtenerOtrosIndirectos(pedimentoSeleccionado))}</span>
              </div>
            {:else}
              <div class="detalle-row mini">
                <span class="label">Otros indirectos:</span>
                <span class="value">{formatMoney(obtenerOtrosIndirectos(pedimentoSeleccionado))}</span>
              </div>
            {/if}
            <div class="detalle-row mini" style="background: #f0fdf4; border-radius: 4px; padding: 4px 6px; margin-top: 6px;">
              <span class="label" style="color: #166534; font-weight: 600;">IVA Importación (Acreditable):</span>
              <span class="value font-mono" style="color: #166534; font-weight: 700;">
                {formatMoney(obtenerIvaAcreditable(pedimentoSeleccionado))}
              </span>
            </div>
            <div style="font-size: 0.72rem; color: #16a34a; margin-top: 2px; text-align: right;">
              100% acreditable (excluido del costo fiscal)
            </div>
            {#if sumarGastosPartidas(pedimentoSeleccionado) > 0}
              <div class="detalle-row mini" style="border-top: 1px dashed #cbd5e1; margin-top: 6px; padding-top: 4px;">
                <span class="label">Gastos por partida (directos):</span>
                <span class="value text-warning font-bold">{formatMoney(sumarGastosPartidas(pedimentoSeleccionado))}</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Panel de Prorrateo -->
        <div class="card p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="font-bold text-dark m-0">Metodología de Prorrateo Fiscal</h4>
            <button class="btn btn-outline-info btn-sm font-bold" style="border-radius: 8px; font-size: 0.82rem; padding: 6px 14px;" on:click={() => (showFormulaModal = true)}>
              <i class="material-icons text-small vertical-align-middle me-1">help_outline</i> Información de Fórmulas
            </button>
          </div>
          
          <div class="mb-4">
            <label class="form-label font-bold">Fórmula / Metodología de cálculo:</label>
            <select class="form-select custom-select" bind:value={metodologiaSeleccionada}>
              <option value="ad-valorem">Opción A: Prorrateo Ad-Valorem (Por valor de importación - SAT)</option>
              <option value="unitario">Opción B: Prorrateo Unitario (Equitativo por cantidad de piezas)</option>
            </select>
          </div>

          {#if metodologiaSeleccionada === 'fijo'}
            <div class="mb-4" transition:fade|local={{ duration: 100 }}>
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
              <strong>Información:</strong> Se le añadirá un porcentaje fijo manual al precio de compra base convertido a pesos. No se utilizan los gastos indirectos generales; los gastos adicionales propios de cada partida sí se suman a su costo.
            {/if}
            {#if sumarGastosPartidas(pedimentoSeleccionado) > 0}
              <div class="mt-2"><strong>Gastos por partida:</strong> los gastos adicionales registrados en cada producto ({formatMoney(sumarGastosPartidas(pedimentoSeleccionado))}) no se prorratean: se dividen entre las piezas de esa partida y se suman a su costo fiscal unitario, con cualquier metodología.</div>
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
        <div class="d-flex justify-content-between align-items-center p-3 mb-2">
          <div>
            <h4 class="font-bold text-dark m-0">Desglose de Costo Fiscal por Partida</h4>
            <span class="text-muted text-small">Valuación PEPS (LISR Art. 41) • IVA de Importación 100% Acreditable Excluido del Costo</span>
          </div>
          <span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 6px 12px; font-size: 0.85rem;">
            {metodologiaSeleccionada === 'ad-valorem' ? 'Prorrateo Ad-Valorem (SAT)' : (metodologiaSeleccionada === 'unitario' ? 'Prorrateo Unitario' : (metodologiaSeleccionada === 'mixto' ? 'Prorrateo Mixto' : 'Factor Fijo'))}
          </span>
        </div>
        <div class="table-responsive">
          <table class="table table-custom align-middle">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Fracción</th>
                <th>Cantidad</th>
                <th>Costo USD Unitario</th>
                <th>Costo Base MXN</th>
                <th>Gasto Indirecto / pza</th>
                <th>Gasto Directo / pza</th>
                <th>Costo Fiscal Unitario MXN</th>
                <th>Costo Importación Total</th>
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
                  <td>{formatMoney(calcularCostoBase(item, pedimentoSeleccionado.tipo_cambio))}</td>
                  <td>
                    {#if item.costo_fiscal_unitario_mxn > 0}
                      <span class="text-primary font-bold">+{formatMoney(calcularGastoIndirecto(item, pedimentoSeleccionado.tipo_cambio))}</span>
                    {:else}
                      <span class="text-muted">-</span>
                    {/if}
                  </td>
                  <td>
                    {#if sumarGastosLista(item.gastos_adicionales) > 0}
                      <span class="text-warning font-bold">+{formatMoney(calcularGastoDirecto(item))}</span>
                      <div class="text-muted text-small">{formatMoney(sumarGastosLista(item.gastos_adicionales))} en {item.gastos_adicionales.length} gasto(s)</div>
                    {:else}
                      <span class="text-muted">-</span>
                    {/if}
                  </td>
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
                      <span class="text-muted">-</span>
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

<!-- Menú desplegable de acciones de una partida -->
{#if menuPartida.abierto}
  <div class="menu-acciones" style="left: {menuPartida.x}px; top: {menuPartida.y}px;" on:click|stopPropagation>
    <button on:click={() => accionMenu("agregar")}>
      <i class="material-icons">post_add</i> Agregar gasto adicional
    </button>
    {#if gastosDePartida(menuPartida.contexto, menuPartida.partida).length > 0}
      <button on:click={() => accionMenu("ver")}>
        <i class="material-icons">receipt_long</i> Ver gastos ({gastosDePartida(menuPartida.contexto, menuPartida.partida).length})
      </button>
    {/if}
    {#if menuPartida.contexto === "nuevo" || $usuario_db.rol === "administrador"}
      <button class="peligro" on:click={() => accionMenu("eliminar")}>
        <i class="material-icons">delete</i> Eliminar partida
      </button>
    {/if}
  </div>
{/if}

<!-- Menú desplegable de opciones para un pedimento en la lista principal -->
{#if menuPedimento.abierto && menuPedimento.ped}
  <div class="menu-acciones" style="left: {menuPedimento.x}px; top: {menuPedimento.y}px;" on:click|stopPropagation>
    <button on:click={() => ejecutarAccionPedimento("costos")}>
      <i class="material-icons" style="color: #0284c7;">calculate</i> Calcular Costos Fiscales
    </button>
    <button on:click={() => ejecutarAccionPedimento("ver_cargos")}>
      <i class="material-icons" style="color: #7c3aed;">receipt_long</i> Ver Cargos y Devoluciones
      {#if contarTotalCargosExtra(menuPedimento.ped) > 0}
        <span class="badge rounded-pill bg-warning text-dark ms-auto" style="font-size: 0.72rem; padding: 2px 7px;">
          {contarTotalCargosExtra(menuPedimento.ped)}
        </span>
      {/if}
    </button>
    <button on:click={() => ejecutarAccionPedimento("editar")}>
      <i class="material-icons" style="color: #ea580c;">edit</i> Editar Pedimento
    </button>
    {#if menuPedimento.ped.status === 'transito'}
      <button on:click={() => ejecutarAccionPedimento("arribar")}>
        <i class="material-icons" style="color: #10b981;">warehouse</i> Registrar Arribo
      </button>
    {/if}
    {#if esLocal}
      <button class="peligro" on:click={() => ejecutarAccionPedimento("eliminar")}>
        <i class="material-icons">delete</i> Eliminar Pedimento
      </button>
    {/if}
  </div>
{/if}

<!-- Modal con los gastos adicionales de una partida -->
{#if gastosPartidaModal.abierto}
  <div class="modal-arribo-backdrop modal-capa-alta" on:click={() => (gastosPartidaModal = { ...gastosPartidaModal, abierto: false })}>
    <div class="modal-arribo-container" style="max-width: 760px;" on:click|stopPropagation>
      <div class="modal-arribo-header">
        <div>
          <h3>Gastos adicionales de la partida</h3>
          <span class="pedimento-numero-badge">{(pedimentoDeContexto(gastosPartidaModal.contexto).productos && pedimentoDeContexto(gastosPartidaModal.contexto).productos[gastosPartidaModal.partida] && pedimentoDeContexto(gastosPartidaModal.contexto).productos[gastosPartidaModal.partida].nombre) || "Partida"}</span>
        </div>
        <button class="btn-close-modal" on:click={() => (gastosPartidaModal = { ...gastosPartidaModal, abierto: false })} aria-label="Cerrar modal">&times;</button>
      </div>
      <div class="modal-arribo-body">
        {#if gastosDePartida(gastosPartidaModal.contexto, gastosPartidaModal.partida).length === 0}
          <div class="text-muted text-center p-3">Esta partida ya no tiene gastos adicionales.</div>
        {:else}
          <table class="table table-sm">
            <thead><tr><th>Concepto</th><th class="text-end">Monto (MXN)</th><th>Fecha</th><th>Notas</th><th class="text-center">Acciones</th></tr></thead>
            <tbody>
              {#each gastosDePartida(gastosPartidaModal.contexto, gastosPartidaModal.partida) as g, i}
                <tr>
                  <td>{g.concepto}</td>
                  <td class="text-end font-mono">{formatMoney(g.monto)}</td>
                  <td>{g.fecha_gasto ? String(g.fecha_gasto).slice(0, 10) : ""}</td>
                  <td class="text-muted text-small">{g.observaciones || ""}</td>
                  <td class="text-center">
                    <button class="btn btn-sm" title="Editar" on:click={() => abrirGastoModal(gastosPartidaModal.contexto, gastosPartidaModal.partida, i)}><i class="material-icons text-small">edit</i></button>
                    <button class="btn btn-danger-icon" title="Eliminar" on:click={() => quitarGasto(gastosPartidaModal.contexto, gastosPartidaModal.partida, i)}><i class="material-icons">delete</i></button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <div class="text-end text-small">Total de la partida: <strong class="font-mono">{formatMoney(sumarGastosLista(gastosDePartida(gastosPartidaModal.contexto, gastosPartidaModal.partida)))}</strong></div>
        {/if}
      </div>
      <div class="modal-arribo-footer">
        <button class="btn btn-secondary-custom" on:click={() => abrirGastoModal(gastosPartidaModal.contexto, gastosPartidaModal.partida)}>+ Agregar gasto</button>
        <button class="btn btn-primary-custom" on:click={() => (gastosPartidaModal = { ...gastosPartidaModal, abierto: false })}>Cerrar</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal de gasto adicional (general o por partida) -->
{#if gastoModal.abierto}
  <div class="modal-arribo-backdrop modal-capa-alta modal-capa-tope" on:click={cerrarGastoModal}>
    <div class="modal-arribo-container" style="max-width: 520px;" on:click|stopPropagation>
      <div class="modal-arribo-header">
        <div>
          <h3>{gastoModal.indice === null ? "Registrar" : "Editar"} gasto adicional</h3>
          <span class="pedimento-numero-badge">
            {#if gastoModal.partida === null}
              Se reparte entre todos los productos
            {:else}
              Solo para: {(pedimentoDeContexto(gastoModal.contexto).productos && pedimentoDeContexto(gastoModal.contexto).productos[gastoModal.partida] && pedimentoDeContexto(gastoModal.contexto).productos[gastoModal.partida].nombre) || "la partida"}
            {/if}
          </span>
        </div>
        <button class="btn-close-modal" on:click={cerrarGastoModal} aria-label="Cerrar modal">&times;</button>
      </div>
      <div class="modal-arribo-body">
        <label class="form-label font-bold">Concepto
          <input type="text" class="form-control" placeholder="Ej. Re-etiquetado, maniobras, almacenaje" bind:value={gastoModal.datos.concepto} />
        </label>
        <label class="form-label font-bold mt-2">Monto (MXN)
          <input type="number" step="0.01" class="form-control" placeholder="Ej. 15000 ó -29252.07" bind:value={gastoModal.datos.monto} />
          <span class="text-muted d-block" style="font-size: 0.76rem; font-weight: normal; margin-top: 2px;">
            Ingresa un monto positivo para gastos/honorarios, o negativo si es una devolución/reembolso de anticipo.
          </span>
        </label>
        <label class="form-label font-bold mt-2">Fecha del gasto
          <input type="date" class="form-control" bind:value={gastoModal.datos.fecha_gasto} />
        </label>
        <div class="row g-2 mt-1">
          <div class="col-7">
            <label class="form-label font-bold text-small">UUID CFDI / Folio Fiscal
              <input type="text" class="form-control font-mono text-small" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" bind:value={gastoModal.datos.uuid_cfdi} />
            </label>
          </div>
          <div class="col-5">
            <label class="form-label font-bold text-small">N° Factura
              <input type="text" class="form-control text-small" placeholder="FAC-001" bind:value={gastoModal.datos.factura} />
            </label>
          </div>
        </div>
        <div class="row g-2 mt-1">
          <div class="col-7">
            <label class="form-label font-bold text-small">Proveedor / Agente
              <input type="text" class="form-control text-small" placeholder="Nombre o Razón Social" bind:value={gastoModal.datos.proveedor} />
            </label>
          </div>
          <div class="col-5">
            <label class="form-label font-bold text-small">RFC Proveedor
              <input type="text" class="form-control text-small font-mono text-uppercase" placeholder="AAA010101AAA" bind:value={gastoModal.datos.rfc} />
            </label>
          </div>
        </div>
        <label class="form-label font-bold mt-2">Notas / observaciones
          <textarea class="form-control" rows="2" bind:value={gastoModal.datos.observaciones}></textarea>
        </label>
      </div>
      <div class="modal-arribo-footer">
        <button class="btn btn-secondary-custom" on:click={cerrarGastoModal}>Cancelar</button>
        <button class="btn btn-primary-custom" on:click={guardarGasto}>Guardar gasto</button>
      </div>
    </div>
  </div>
{/if}

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
            <strong>Revisión de Cálculos Fiscales (Valuación PEPS):</strong> Compara los costos fiscales unitarios actuales contra los nuevos proyectados. Los gastos indirectos se prorratearon excluyendo el 100% del IVA acreditable (Art. 4-5 LIVA y NIF C-4).
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-custom align-middle">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center">Cantidad</th>
                <th class="text-center">Costo USD</th>
                <th class="text-center">Costo Base MXN</th>
                <th class="text-center">Indirecto / pza</th>
                <th class="text-center">Costo Anterior</th>
                <th class="text-center">Nuevo Costo Fiscal</th>
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
                  <td class="text-center text-muted font-mono">{formatMoney(calcularCostoBase(item, pedimentoSeleccionado.tipo_cambio))}</td>
                  <td class="text-center text-primary font-bold font-mono">+{formatMoney(calcularGastoIndirecto(item, pedimentoSeleccionado.tipo_cambio))}</td>
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



<!-- Modal Informativo: Cargos Adicionales y Devoluciones Extra -->
{#if showCargosModal && pedimentoCargos}
  <div class="modal-arribo-backdrop" on:click={() => showCargosModal = false}>
    <div class="modal-arribo-container" style="max-width: 980px;" on:click|stopPropagation>
      <div class="modal-arribo-header">
        <div class="modal-arribo-title-container">
          <div class="modal-arribo-icon" style="background: #f5f3ff; color: #7c3aed;">
            <i class="material-icons">receipt_long</i>
          </div>
          <div>
            <h3>Cargos Adicionales y Devoluciones Extra</h3>
            <div class="d-flex align-items-center gap-2 mt-1">
              <span class="pedimento-numero-badge" style="background: #1e293b;">Pedimento: {pedimentoCargos.numero_pedimento}</span>
              <span class="badge bg-light text-dark border">Clave: {pedimentoCargos.clave_pedimento || 'A1'}</span>
              <span class="badge bg-light text-dark border">TC: {pedimentoCargos.tipo_cambio} MXN</span>
              {#if pedimentoCargos.status === 'transito'}
                <span class="badge bg-warning text-dark"><i class="material-icons inline-icon">sailing</i> En Tránsito</span>
              {:else}
                <span class="badge bg-success"><i class="material-icons inline-icon">check_circle</i> Arribado</span>
              {/if}
            </div>
          </div>
        </div>
        <button class="btn-close-modal" on:click={() => showCargosModal = false} aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="modal-arribo-body" style="max-height: calc(85vh - 140px); overflow-y: auto;">
        <!-- Tarjetas de resumen rápido -->
        <div class="row g-2 mb-4">
          <div class="col-md-3">
            <div class="p-3 bg-light rounded border text-center">
              <div class="text-muted text-small font-bold">CARGOS GENERALES BRUTOS</div>
              <div class="font-bold text-dark font-mono fs-5 mt-1">{formatMoney(obtenerGastosPositivosIndirectos(pedimentoCargos))}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-light rounded border text-center" style="background: #fef2f2 !important; border-color: #fecaca !important;">
              <div class="text-danger text-small font-bold">(-) DEVOLUCIONES / REEMBOLSOS</div>
              <div class="font-bold text-danger font-mono fs-5 mt-1">{formatMoney(obtenerDevolucionesIndirectas(pedimentoCargos))}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-light rounded border text-center" style="background: #f0fdf4 !important; border-color: #bbf7d0 !important;">
              <div class="text-success text-small font-bold">NETO GENERALES (A PRORRATEAR)</div>
              <div class="font-bold text-success font-mono fs-5 mt-1">{formatMoney(sumarGastosLista(pedimentoCargos.gastos_importacion && pedimentoCargos.gastos_importacion.otros))}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-light rounded border text-center" style="background: #fffbeb !important; border-color: #fde68a !important;">
              <div class="text-warning text-small font-bold">DIRECTOS POR PARTIDA</div>
              <div class="font-bold text-warning font-mono fs-5 mt-1">{formatMoney(sumarGastosPartidas(pedimentoCargos))}</div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 1: CARGOS GENERALES E INDIRECTOS -->
        <div class="card p-3 mb-4 shadow-sm border">
          <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
            <div>
              <h5 class="font-bold text-dark m-0 d-flex align-items-center gap-2">
                <i class="material-icons text-primary">public</i> 1. Cargos y Devoluciones Generales (Indirectos)
              </h5>
              <span class="text-muted text-small">Se prorratean entre todas las partidas según la metodología fiscal elegida.</span>
            </div>
            <span class="badge bg-primary-subtle text-primary border font-mono">
              {(pedimentoCargos.gastos_importacion && pedimentoCargos.gastos_importacion.otros ? pedimentoCargos.gastos_importacion.otros.length : 0)} registro(s)
            </span>
          </div>

          {#if !pedimentoCargos.gastos_importacion || !pedimentoCargos.gastos_importacion.otros || pedimentoCargos.gastos_importacion.otros.length === 0}
            <div class="p-3 text-center text-muted bg-light rounded">
              <i class="material-icons vertical-align-middle me-1">info</i> No se han registrado cargos ni devoluciones generales adicionales en este pedimento.
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>#</th>
                    <th>Concepto</th>
                    <th class="text-center">Tipo</th>
                    <th class="text-end">Monto (MXN)</th>
                    <th>Fecha</th>
                    <th>CFDI / Factura</th>
                    <th>Proveedor / RFC</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {#each pedimentoCargos.gastos_importacion.otros as g, idx}
                    <tr>
                      <td class="text-muted font-mono">{idx + 1}</td>
                      <td><strong>{g.concepto}</strong></td>
                      <td class="text-center">
                        {#if g.monto < 0}
                          <span class="badge bg-danger">Devolución</span>
                        {:else}
                          <span class="badge bg-secondary">Gasto Extra</span>
                        {/if}
                      </td>
                      <td class="text-end font-mono font-bold {g.monto < 0 ? 'text-danger' : 'text-dark'}">
                        {formatMoney(g.monto)}
                      </td>
                      <td class="text-small">{g.fecha_gasto ? String(g.fecha_gasto).slice(0, 10) : '-'}</td>
                      <td class="text-small">
                        {#if g.uuid_cfdi}
                          <div class="font-mono text-uppercase" style="font-size: 0.75rem;" title="UUID CFDI">{g.uuid_cfdi}</div>
                        {/if}
                        {#if g.factura && g.factura.numero}
                          <div class="text-muted" style="font-size: 0.75rem;">Factura: {g.factura.numero}</div>
                        {/if}
                        {#if !g.uuid_cfdi && (!g.factura || !g.factura.numero)}
                          <span class="text-muted">-</span>
                        {/if}
                      </td>
                      <td class="text-small">
                        {#if g.proveedor && (g.proveedor.nombre || g.proveedor.rfc)}
                          <div>{g.proveedor.nombre || ''}</div>
                          <div class="text-muted font-mono" style="font-size: 0.72rem;">{g.proveedor.rfc || ''}</div>
                        {:else}
                          <span class="text-muted">-</span>
                        {/if}
                      </td>
                      <td class="text-small text-muted">{g.observaciones || '-'}</td>
                    </tr>
                  {/each}
                </tbody>
                <tfoot class="table-light">
                  <tr>
                    <th colspan="3" class="text-end">Total Neto Cargos Generales:</th>
                    <th class="text-end font-mono font-bold text-primary">
                      {formatMoney(sumarGastosLista(pedimentoCargos.gastos_importacion.otros))}
                    </th>
                    <th colspan="4"></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          {/if}
        </div>

        <!-- SECCIÓN 2: CARGOS POR PARTIDA (DIRECTOS) -->
        <div class="card p-3 shadow-sm border">
          <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
            <div>
              <h5 class="font-bold text-dark m-0 d-flex align-items-center gap-2">
                <i class="material-icons text-warning">inventory_2</i> 2. Cargos Directos por Partida de Producto
              </h5>
              <span class="text-muted text-small">Se imputan exclusivamente al costo unitario del producto correspondiente.</span>
            </div>
            <span class="badge bg-warning-subtle text-warning border font-mono">
              {obtenerPartidasConCargos(pedimentoCargos).length} partida(s) con cargos
            </span>
          </div>

          {#if obtenerPartidasConCargos(pedimentoCargos).length === 0}
            <div class="p-3 text-center text-muted bg-light rounded">
              <i class="material-icons vertical-align-middle me-1">check_circle</i> Este pedimento no tiene cargos directos asignados a partidas individuales.
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Partida / Producto</th>
                    <th>Concepto</th>
                    <th class="text-center">Tipo</th>
                    <th class="text-end">Monto Total</th>
                    <th class="text-end">Impacto / pza</th>
                    <th>Fecha</th>
                    <th>CFDI / Factura</th>
                    <th>Proveedor / RFC</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {#each obtenerPartidasConCargos(pedimentoCargos) as prod}
                    {#each prod.gastos_adicionales as g, gIdx}
                      <tr>
                        <td>
                          {#if gIdx === 0}
                            <div class="font-bold text-dark">{(prod.producto && prod.producto.nombre) ? prod.producto.nombre : (prod.nombre || 'Producto')}</div>
                            <div class="text-muted text-small font-mono">{(prod.producto && prod.producto.codigo) ? prod.producto.codigo : (prod.codigo || 'S/C')} • {prod.cantidad} {prod.unidad_medida}</div>
                          {:else}
                            <div class="text-muted text-small" style="padding-left: 12px;">↳ mismo producto</div>
                          {/if}
                        </td>
                        <td><strong>{g.concepto}</strong></td>
                        <td class="text-center">
                          {#if g.monto < 0}
                            <span class="badge bg-danger">Devolución</span>
                          {:else}
                            <span class="badge bg-warning text-dark">Directo</span>
                          {/if}
                        </td>
                        <td class="text-end font-mono font-bold {g.monto < 0 ? 'text-danger' : 'text-dark'}">
                          {formatMoney(g.monto)}
                        </td>
                        <td class="text-end font-mono text-muted text-small">
                          {prod.cantidad > 0 ? formatMoney(g.monto / prod.cantidad) : '-'}
                        </td>
                        <td class="text-small">{g.fecha_gasto ? String(g.fecha_gasto).slice(0, 10) : '-'}</td>
                        <td class="text-small">
                          {#if g.uuid_cfdi}
                            <div class="font-mono text-uppercase" style="font-size: 0.75rem;">{g.uuid_cfdi}</div>
                          {/if}
                          {#if g.factura && g.factura.numero}
                            <div class="text-muted" style="font-size: 0.75rem;">Factura: {g.factura.numero}</div>
                          {/if}
                          {#if !g.uuid_cfdi && (!g.factura || !g.factura.numero)}
                            <span class="text-muted">-</span>
                          {/if}
                        </td>
                        <td class="text-small">
                          {#if g.proveedor && (g.proveedor.nombre || g.proveedor.rfc)}
                            <div>{g.proveedor.nombre || ''}</div>
                            <div class="text-muted font-mono" style="font-size: 0.72rem;">{g.proveedor.rfc || ''}</div>
                          {:else}
                            <span class="text-muted">-</span>
                          {/if}
                        </td>
                        <td class="text-small text-muted">{g.observaciones || '-'}</td>
                      </tr>
                    {/each}
                  {/each}
                </tbody>
                <tfoot class="table-light">
                  <tr>
                    <th colspan="3" class="text-end">Total Cargos Directos por Partida:</th>
                    <th class="text-end font-mono font-bold text-warning">
                      {formatMoney(sumarGastosPartidas(pedimentoCargos))}
                    </th>
                    <th colspan="5"></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          {/if}
        </div>
      </div>

      <div class="modal-arribo-footer d-flex justify-content-between align-items-center">
        <button class="btn btn-secondary-custom" on:click={() => showCargosModal = false}>
          Cerrar
        </button>
        <button class="btn btn-action-orange" on:click={() => { showCargosModal = false; abrirModalEditar(pedimentoCargos); }}>
          <i class="material-icons text-small">edit</i> Editar Pedimento
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
            <div class="sec-header sec-azul">
            <span class="sec-icon"><i class="material-icons">description</i></span>
            <div class="sec-titulo">
              <span class="sec-num">1</span>
              <h4>Datos generales y aduanales</h4>
              <span class="sec-sub">Pedimento, aduana, proveedor y valores SAT</span>
            </div>
          </div>
            
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
            <div class="sec-header sec-violeta">
            <span class="sec-icon"><i class="material-icons">account_balance</i></span>
            <div class="sec-titulo">
              <span class="sec-num">2</span>
              <h4>Incrementables y contribuciones SAT</h4>
              <span class="sec-sub">Valores oficiales y gastos indirectos</span>
            </div>
          </div>
            
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

            <!-- Gastos indirectos adicionales -->
            <div class="gastos-adicionales mt-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <strong class="text-small">Gastos indirectos adicionales e inesperados</strong>
                  <div class="text-muted text-small">Maniobras, almacenajes, demoras, licencias o fletes secundarios. Se reparten entre todos los productos.</div>
                </div>
                <button class="btn btn-secondary-custom btn-sm" on:click={() => abrirGastoModal("edicion")}>
                  <i class="material-icons text-small">add</i> Agregar gasto adicional
                </button>
              </div>
              {#if !pedimentoEditar.gastos_importacion.otros || pedimentoEditar.gastos_importacion.otros.length === 0}
                <div class="text-muted text-small p-2 bg-light rounded border text-center">No hay gastos adicionales registrados.</div>
              {:else}
                <table class="table table-sm">
                  <thead><tr><th>Concepto</th><th class="text-end">Monto (MXN)</th><th>Fecha</th><th>Notas</th><th class="text-center">Acciones</th></tr></thead>
                  <tbody>
                    {#each pedimentoEditar.gastos_importacion.otros as otro, index}
                      <tr>
                        <td><strong>{otro.concepto}</strong></td>
                        <td class="text-end font-mono">{formatMoney(otro.monto)}</td>
                        <td>{otro.fecha_gasto ? String(otro.fecha_gasto).slice(0, 10) : ""}</td>
                        <td class="text-muted text-small">{otro.observaciones || ""}</td>
                        <td class="text-center">
                          <button class="btn btn-sm" on:click={() => abrirGastoModal("edicion", null, index)} title="Editar"><i class="material-icons text-small">edit</i></button>
                          <button class="btn btn-danger-icon" on:click={() => quitarGasto("edicion", null, index)} title="Eliminar"><i class="material-icons">delete</i></button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
                <div class="d-flex justify-content-end align-items-center gap-3 text-small mt-2 pt-2 border-top">
                  {#if tieneDevolucionesIndirectas(pedimentoEditar)}
                    <span class="text-muted">Gastos brutos: <strong class="font-mono">{formatMoney(obtenerGastosPositivosIndirectos(pedimentoEditar))}</strong></span>
                    <span class="text-danger font-bold">(-) Devoluciones: <strong class="font-mono">{formatMoney(obtenerDevolucionesIndirectas(pedimentoEditar))}</strong></span>
                  {/if}
                  <span>Subtotal neto adicionales: <strong class="font-mono text-primary">{formatMoney(sumarGastosLista(pedimentoEditar.gastos_importacion.otros))}</strong></span>
                </div>
              {/if}
            </div>
          </div>

          <!-- 3. Partidas de Productos -->
          <div class="card p-4">
            <div class="sec-header sec-verde">
            <span class="sec-icon"><i class="material-icons">inventory_2</i></span>
            <div class="sec-titulo">
              <span class="sec-num">3</span>
              <h4>Partidas del pedimento</h4>
              <span class="sec-sub">Productos, cantidades, costos y gastos por partida</span>
            </div>
          </div>

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
                    <th class="text-center">Acciones</th>
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
                      <td class="text-center">
                        <button class="btn-acciones" on:click={(e) => abrirMenuPartida(e, "edicion", index)} title="Acciones de la partida">
                          Acciones <i class="material-icons">arrow_drop_down</i>
                          {#if sumarGastosLista(item.gastos_adicionales) > 0}<span class="badge-gastos">{(item.gastos_adicionales || []).length}</span>{/if}
                        </button>
                      </td>
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

<!-- Modal de Información de Fórmulas de Prorrateo -->
{#if showFormulaModal}
  <div class="modal-arribo-backdrop" on:click={() => (showFormulaModal = false)}>
    <div class="modal-arribo-container" style="max-width: 900px;" on:click|stopPropagation>
      <div class="modal-arribo-header" style="background: #0f172a; color: white;">
        <div class="modal-arribo-title-container">
          <div class="modal-arribo-icon" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">
            <i class="material-icons">functions</i>
          </div>
          <div>
            <h3 style="color: white; margin: 0;">Fórmulas y Fundamentos Fiscales de Prorrateo</h3>
            <span class="pedimento-numero-badge" style="background: #0284c7;">Lineamientos SAT • LISR • LIVA • NIF C-4</span>
          </div>
        </div>
        <button class="btn-close-modal" style="color: white;" on:click={() => (showFormulaModal = false)} aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="modal-arribo-body" style="max-height: 75vh; overflow-y: auto; padding: 24px;">
        
        <!-- Alerta Crítica: Exclusión de IVA y PEPS -->
        <div class="card p-3 mb-4" style="background: #ecfdf5; border: 1.5px solid #86efac; border-radius: 8px;">
          <div class="d-flex align-items-start">
            <i class="material-icons text-success me-2 mt-1">verified_user</i>
            <div>
              <h5 class="font-bold text-success m-0 mb-1">Reglas Fiscales Obligatorias (Validación Contable)</h5>
              <ul class="mb-0 text-small text-dark ps-3" style="line-height: 1.6;">
                <li>
                  <strong>IVA de Importación 100% Acreditable (Art. 4 y 5 LIVA / NIF C-4):</strong> El IVA pagado al SAT en aduana <u>NO se suma al costo de inventario</u>. Se recupera al 100% contra el IVA trasladado de clientes. Sumarlo al costo inflaría artificialmente el costo unitario y generaría duplicidad contable.
                </li>
                <li>
                  <strong>Método de Valuación PEPS (Art. 41 LISR):</strong> Para el control de inventarios de importación se aplica obligatoriamente <em>Primeras Entradas, Primeras Salidas</em> (PEPS).
                </li>
                <li>
                  <strong>Soporte Fiscal de Gastos (Art. 27 LISR):</strong> Los honorarios de la agencia aduanal, maniobras, fletes y almacenajes complementarios deben estar respaldados con su CFDI (UUID) para ser deducibles e integrables.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="card p-3 mb-4" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h5 class="font-bold text-dark mb-2">Composición del Costo Total de Inventario</h5>
          <div class="p-3 bg-white rounded font-mono text-small border" style="color: #0f172a; line-height: 1.8;">
            <div><strong>Costo Total Inventario</strong> = Valor Comercial en MXN (Valor en Aduana SAT)</div>
            <div class="ps-3">+ Fletes Internacionales y Terrestres (Incrementables SAT)</div>
            <div class="ps-3">+ Seguros de Transporte (Incrementables SAT)</div>
            <div class="ps-3">+ Impuestos Aduanales Deducibles (DTA + PRV + IGI + CNT)</div>
            <div class="ps-3">+ Honorarios y Maniobras de Agencia Aduanal (con CFDI)</div>
            <div class="ps-3">+ Otros Gastos Indirectos Comprobados</div>
            <div class="ps-3">+ Gastos Adicionales Directos por Partida</div>
            <div class="text-danger ps-3"><strong>&minus; EXCLUIDO:</strong> IVA de Importación (100% Acreditable)</div>
          </div>
        </div>

        <!-- Gastos adicionales por partida -->
        <div class="card p-3 mb-3 border-start border-4 border-danger" style="background: #fffbeb;">
          <h5 class="font-bold mb-2" style="color: #b45309;">Gastos Adicionales Específicos por Partida</h5>
          <p class="text-small text-secondary mb-2">
            Los gastos registrados en una partida particular (ej. etiquetado, pruebas NOM, permisos exclusivos) <strong>no se prorratean</strong> a los demás productos. Se dividen únicamente entre las piezas de esa partida y se suman a su costo unitario final.
          </p>
          <div class="p-2 bg-white rounded font-mono text-small border">
            <div><strong>Gasto Partida / Pieza</strong> = &sum; Gastos Partida / Cantidad de Piezas de la Partida</div>
            <div><strong>Costo Fiscal Unitario Final</strong> = Costo Prorrateado (A o B) + Gasto Partida / Pieza</div>
          </div>
        </div>

        <!-- Metodología A -->
        <div class="card p-3 mb-3 border-start border-4 border-primary" style="background: #f8fafc;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <h5 class="font-bold text-primary m-0">1. Opción A: Prorrateo Ad-Valorem (Por Valor Comercial en MXN - Método SAT / NIF C-4)</h5>
            <span class="badge bg-primary">Recomendado</span>
          </div>
          <p class="text-small text-secondary mb-2">
            Distribuye los gastos indirectos en proporción al valor económico de adquisición de cada producto tomado directamente en pesos (MXN) del pedimento. Los artículos de mayor precio asumen una fracción mayor de los fletes, seguros y aranceles. Es el criterio estándar según la NIF C-4.
          </p>
          <div class="p-2 bg-white rounded font-mono text-small border">
            <div><strong>Total Compra Comercial MXN</strong> = &sum; (Valor Aduana Partida MXN del Pedimento SAT)</div>
            <div><strong>Factor Proporcional</strong> = Gastos Indirectos Totales (sin IVA) / Total Compra Comercial MXN</div>
            <div><strong>Costo Fiscal Unitario Base MXN</strong> = (Valor Aduana Partida MXN / Cantidad) &times; (1 + Factor Proporcional)</div>
          </div>
        </div>

        <!-- Metodología B -->
        <div class="card p-3 mb-3 border-start border-4 border-success" style="background: #f8fafc;">
          <h5 class="font-bold text-success mb-2">2. Opción B: Prorrateo Unitario (Equitativo por Cantidad de Piezas)</h5>
          <p class="text-small text-secondary mb-2">
            Divide la totalidad de los gastos indirectos en partes exactamente iguales entre el número total de unidades físicas importadas en el pedimento, sin importar su precio unitario. Recomendado para contenedores con productos homogéneos.
          </p>
          <div class="p-2 bg-white rounded font-mono text-small border">
            <div><strong>Total Piezas</strong> = &sum; Cantidades de todos los productos del pedimento</div>
            <div><strong>Gasto Indirecto por Pieza MXN</strong> = Gastos Indirectos Totales (sin IVA) / Total Piezas</div>
            <div><strong>Costo Fiscal Unitario Base MXN</strong> = (Valor Aduana Partida MXN / Cantidad) + Gasto Indirecto por Pieza MXN</div>
          </div>
        </div>
      </div>

      <div class="modal-arribo-footer">
        <button class="btn btn-primary-custom" on:click={() => (showFormulaModal = false)}>Entendido</button>
      </div>
    </div>
  </div>
{/if}


<style>
  /* Estilos mejorados para la Lista de Partidas */
  .partidas-table-wrapper {
    border-radius: 12px;
    background: #ffffff;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .partidas-scroll-container {
    max-height: 420px;
    overflow-y: auto;
  }

  .table-custom-partidas {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  .table-custom-partidas thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f8fafc;
    color: #475569;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 12px 14px;
    border-bottom: 2px solid #e2e8f0;
    white-space: nowrap;
  }

  .table-custom-partidas tbody tr {
    transition: background-color 0.15s ease-in-out;
  }

  .table-custom-partidas tbody tr:hover {
    background-color: #f1f5f9;
  }

  .table-custom-partidas tbody td {
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    font-size: 0.875rem;
  }

  .table-foot-summary {
    position: sticky;
    bottom: 0;
    z-index: 10;
    background: #f8fafc;
    border-top: 2px solid #cbd5e1;
    box-shadow: 0 -2px 6px rgba(0,0,0,0.03);
  }

  .table-foot-summary td {
    padding: 12px 14px;
    font-size: 0.85rem;
  }

  .sec-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #334155;
    font-weight: 700;
    font-size: 0.78rem;
    font-family: monospace;
  }

  .sku-tag {
    display: inline-block;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.75rem;
    font-family: monospace;
    font-weight: 600;
    margin-top: 2px;
  }

  .badge-marca {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .fraccion-code {
    font-family: monospace;
    font-weight: 700;
    color: #0f172a;
    font-size: 0.82rem;
  }

  .nico-badge {
    display: inline-block;
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 0px 5px;
    font-size: 0.72rem;
    font-family: monospace;
  }

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

  .btn-action-purple {
    background-color: #eef2ff;
    color: #4f46e5;
  }

  .btn-action-purple:hover {
    background-color: #4f46e5;
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

  .btn-action-red {
    background: #fee2e2;
    color: #dc2626;
    border: none;
    margin-left: 8px;
  }
  .btn-action-red:hover {
    background: #fecaca;
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
  /* Modales de gastos: deben quedar sobre el modal de edición (9999). */
  .modal-arribo-backdrop.modal-capa-alta { z-index: 10001; }
  .modal-arribo-backdrop.modal-capa-tope { z-index: 10002; }

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

  /* Secciones del formulario de pedimento: número, ícono y color por sección */
  .card-sec { border-left: 5px solid var(--sec-color, #3498db); }
  .card-sec-azul { --sec-color: #2563eb; --sec-fondo: #dbeafe; }
  .card-sec-violeta { --sec-color: #7c3aed; --sec-fondo: #ede9fe; }
  .card-sec-ambar { --sec-color: #d97706; --sec-fondo: #fef3c7; }
  .card-sec-verde { --sec-color: #059669; --sec-fondo: #d1fae5; }

  .sec-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .sec-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #e2e8f0;
    color: #334155;
  }
  .sec-icon .material-icons { font-size: 24px; }
  .sec-titulo { display: flex; flex-direction: column; flex: 1; position: relative; padding-left: 0; }
  .sec-titulo h4 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; letter-spacing: 0.01em; }
  .sec-sub { font-size: 0.8rem; color: #64748b; margin-top: 2px; }
  .sec-num { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sec-color, #64748b); }
  .sec-num::before { content: "Sección "; }
  .sec-azul .sec-icon { background: #dbeafe; color: #2563eb; }
  .sec-violeta .sec-icon { background: #ede9fe; color: #7c3aed; }
  .sec-ambar .sec-icon { background: #fef3c7; color: #d97706; }
  .sec-verde .sec-icon { background: #d1fae5; color: #059669; }
  .sec-total {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 8px 16px;
    border-radius: 10px;
    background: #0f172a;
    color: #fde68a;
  }
  .sec-total small { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
  .sec-total strong { font-family: monospace; font-size: 1.05rem; }

  .gastos-adicionales {
    margin-top: 20px;
    padding: 16px 18px;
    border-radius: 12px;
    background: #fffbeb;
    border: 1px dashed #f59e0b;
  }

  .btn-acciones {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 6px 8px 6px 12px;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    color: #334155;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-acciones:hover { background: #e2e8f0; }
  .btn-acciones .material-icons { font-size: 20px; }
  .badge-gastos {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 9px;
    background: #d97706;
    color: #fff;
    font-size: 0.68rem;
    text-align: center;
  }
  .menu-acciones {
    position: fixed;
    z-index: 10000;
    width: 230px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
    padding: 6px;
  }
  .menu-acciones button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #1e293b;
    font-size: 0.85rem;
    text-align: left;
    cursor: pointer;
  }
  .menu-acciones button:hover { background: #f1f5f9; }
  .menu-acciones button.peligro { color: #dc2626; }
  .menu-acciones .material-icons { font-size: 20px; }
  .menu-acciones.menu-acciones-pedimento { width: 260px; }
</style>
