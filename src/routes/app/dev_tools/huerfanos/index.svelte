<script>
  import { onMount } from "svelte";
  import { postData, mensaje_bueno, mensaje_error } from "./../../../stores";
  import { Button, Dialog } from "svelte-mui/src";
  import { fade, slide } from "svelte/transition";

  let huerfanos = [];
  let buscando = "";
  let cargando = true;
  let error_mensaje = "";
  let total_correcciones = 0;

  // Selección múltiple (checks)
  let seleccionados_ids = [];

  // Paginación (Configurable)
  let pagina_actual = 1;
  let items_por_pagina = 10;
  const opciones_items_por_pagina = [
    { valor: 10, etiqueta: "10 por página" },
    { valor: 25, etiqueta: "25 por página" },
    { valor: 50, etiqueta: "50 por página" },
    { valor: 100, etiqueta: "100 por página" },
    { valor: 250, etiqueta: "250 por página" },
    { valor: 999999, etiqueta: "Mostrar todos" }
  ];

  // Diálogos de confirmación
  let visible_dialogo_eliminar_uno = false;
  let visible_dialogo_eliminar_todos = false;
  let visible_dialogo_limpiar_descontar = false;
  let visible_dialogo_limpiar_descontar_todos = false;
  let visible_dialogo_eliminar_seleccionados = false;
  let visible_dialogo_limpiar_descontar_seleccionados = false;

  // Modal de Historial de Correcciones
  let visible_modal_historial = false;
  let cargando_historial = false;
  let historial_correcciones = [];
  let buscando_historial = "";
  let filtro_tipo_historial = "todos"; // 'todos', 'limpiar_descontar', 'solo_limpiar'
  let pagina_historial = 1;
  let items_por_pagina_historial = 15;

  let item_a_eliminar = null;
  let item_a_descontar = null;
  let procesando_accion = false;

  onMount(() => {
    cargar_huerfanos();
  });

  async function cargar_huerfanos() {
    cargando = true;
    error_mensaje = "";
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", { accion: "obtener" });
      if (data && data.ok) {
        huerfanos = data.huerfanos || [];
        total_correcciones = data.total_correcciones || 0;
        pagina_actual = 1;
        // Limpiar seleccionados que ya no existan
        const ids_existentes = new Set(huerfanos.map(h => h.id_unico));
        seleccionados_ids = seleccionados_ids.filter(id => ids_existentes.has(id));
      } else {
        error_mensaje = (data && data.mensaje) ? data.mensaje : "Error al obtener apartados huérfanos";
      }
    } catch (err) {
      console.error("Error al cargar huérfanos:", err);
      error_mensaje = "No se pudieron obtener los apartados huérfanos: " + err.message;
    } finally {
      cargando = false;
    }
  }

  // --- Funciones de Selección Múltiple ---
  function toggle_seleccion(item_o_id) {
    const id = typeof item_o_id === "object" && item_o_id !== null ? item_o_id.id_unico : item_o_id;
    if (!id) return;
    if (seleccionados_ids.includes(id)) {
      seleccionados_ids = seleccionados_ids.filter(i => i !== id);
    } else {
      seleccionados_ids = [...seleccionados_ids, id];
    }
  }

  function toggle_seleccionar_visibles() {
    const ids_visibles = huerfanos_paginados.map(h => h.id_unico);
    const todos_seleccionados = ids_visibles.length > 0 && ids_visibles.every(id => seleccionados_ids.includes(id));
    if (todos_seleccionados) {
      seleccionados_ids = seleccionados_ids.filter(id => !ids_visibles.includes(id));
    } else {
      const nuevos = ids_visibles.filter(id => !seleccionados_ids.includes(id));
      seleccionados_ids = [...seleccionados_ids, ...nuevos];
    }
  }

  function seleccionar_todos_filtrados() {
    seleccionados_ids = huerfanos_filtrados.map(h => h.id_unico);
  }

  function seleccionar_solo_enviados_filtrados() {
    seleccionados_ids = huerfanos_filtrados.filter(h => h.tipo_ubicacion === 'pedido_historico').map(h => h.id_unico);
  }

  function deseleccionar_todos() {
    seleccionados_ids = [];
  }

  // --- Acciones Individuales ---
  function confirmar_eliminar_uno(item) {
    item_a_eliminar = item;
    visible_dialogo_eliminar_uno = true;
  }

  function confirmar_limpiar_descontar(item) {
    item_a_descontar = item;
    visible_dialogo_limpiar_descontar = true;
  }

  async function ejecutar_eliminar_uno() {
    if (!item_a_eliminar) return;
    procesando_accion = true;
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", {
        accion: "eliminar_uno",
        producto_id: item_a_eliminar.producto_id,
        folio: item_a_eliminar.folio
      });
      if (data && data.ok) {
        if (data.total_correcciones != null) total_correcciones = data.total_correcciones;
        mensaje_bueno("Apartado huérfano eliminado correctamente. Corrección registrada.");
        visible_dialogo_eliminar_uno = false;
        seleccionados_ids = seleccionados_ids.filter(id => id !== item_a_eliminar.id_unico);
        cargar_huerfanos();
      } else {
        mensaje_error((data && data.mensaje) ? data.mensaje : "Error al eliminar el apartado");
      }
    } catch (err) {
      mensaje_error("Error de conexión: " + err.message);
    } finally {
      procesando_accion = false;
    }
  }

  async function ejecutar_limpiar_descontar() {
    if (!item_a_descontar) return;
    procesando_accion = true;
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", {
        accion: "limpiar_y_descontar",
        producto_id: item_a_descontar.producto_id,
        folio: item_a_descontar.folio
      });
      if (data && data.ok) {
        if (data.total_correcciones != null) total_correcciones = data.total_correcciones;
        mensaje_bueno("Reserva eliminada, inventario descontado y registrado en producto_snaplogs.");
        visible_dialogo_limpiar_descontar = false;
        seleccionados_ids = seleccionados_ids.filter(id => id !== item_a_descontar.id_unico);
        cargar_huerfanos();
      } else {
        mensaje_error((data && data.mensaje) ? data.mensaje : "Error al procesar el descuento");
      }
    } catch (err) {
      mensaje_error("Error de conexión: " + err.message);
    } finally {
      procesando_accion = false;
    }
  }

  // --- Acciones de Selección Múltiple (Checks) ---
  function confirmar_eliminar_seleccionados() {
    if (items_seleccionados.length === 0) return;
    visible_dialogo_eliminar_seleccionados = true;
  }

  function confirmar_limpiar_descontar_seleccionados() {
    if (seleccionados_enviados.length === 0) return;
    visible_dialogo_limpiar_descontar_seleccionados = true;
  }

  async function ejecutar_eliminar_seleccionados() {
    if (items_seleccionados.length === 0) return;
    procesando_accion = true;
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", {
        accion: "eliminar_seleccionados",
        items: items_seleccionados.map(i => ({ producto_id: i.producto_id, folio: i.folio }))
      });
      if (data && data.ok) {
        if (data.total_correcciones != null) total_correcciones = data.total_correcciones;
        mensaje_bueno(data.mensaje || `Se limpiaron ${data.eliminados || 0} apartados seleccionados.`);
        visible_dialogo_eliminar_seleccionados = false;
        seleccionados_ids = [];
        cargar_huerfanos();
      } else {
        mensaje_error((data && data.mensaje) ? data.mensaje : "Error al eliminar apartados seleccionados");
      }
    } catch (err) {
      mensaje_error("Error de conexión: " + err.message);
    } finally {
      procesando_accion = false;
    }
  }

  async function ejecutar_limpiar_descontar_seleccionados() {
    if (seleccionados_enviados.length === 0) return;
    procesando_accion = true;
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", {
        accion: "limpiar_y_descontar_seleccionados",
        items: seleccionados_enviados.map(i => ({ producto_id: i.producto_id, folio: i.folio }))
      });
      if (data && data.ok) {
        if (data.total_correcciones != null) total_correcciones = data.total_correcciones;
        mensaje_bueno(data.mensaje || `Se descontaron y limpiaron ${data.procesados || 0} apartados seleccionados.`);
        visible_dialogo_limpiar_descontar_seleccionados = false;
        const ids_procesados = new Set(seleccionados_enviados.map(i => i.id_unico));
        seleccionados_ids = seleccionados_ids.filter(id => !ids_procesados.has(id));
        cargar_huerfanos();
      } else {
        mensaje_error((data && data.mensaje) ? data.mensaje : "Error al procesar los apartados seleccionados");
      }
    } catch (err) {
      mensaje_error("Error de conexión: " + err.message);
    } finally {
      procesando_accion = false;
    }
  }

  // --- Acciones Globales (Todos) ---
  async function ejecutar_eliminar_todos() {
    procesando_accion = true;
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", {
        accion: "eliminar_todos"
      });
      if (data && data.ok) {
        if (data.total_correcciones != null) total_correcciones = data.total_correcciones;
        mensaje_bueno(`Se realizaron ${data.eliminados || 0} correcciones exitosamente.`);
        visible_dialogo_eliminar_todos = false;
        seleccionados_ids = [];
        cargar_huerfanos();
      } else {
        mensaje_error((data && data.mensaje) ? data.mensaje : "Error al eliminar apartados huérfanos");
      }
    } catch (err) {
      mensaje_error("Error de conexión: " + err.message);
    } finally {
      procesando_accion = false;
    }
  }

  async function ejecutar_limpiar_descontar_todos_enviados() {
    procesando_accion = true;
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", {
        accion: "limpiar_y_descontar_todos_enviados"
      });
      if (data && data.ok) {
        if (data.total_correcciones != null) total_correcciones = data.total_correcciones;
        mensaje_bueno(`Se realizaron ${data.procesados || 0} correcciones de pedidos enviados exitosamente.`);
        visible_dialogo_limpiar_descontar_todos = false;
        seleccionados_ids = [];
        cargar_huerfanos();
      } else {
        mensaje_error((data && data.mensaje) ? data.mensaje : "Error al procesar los pedidos enviados");
      }
    } catch (err) {
      mensaje_error("Error de conexión: " + err.message);
    } finally {
      procesando_accion = false;
    }
  }

  // --- Historial de Correcciones ---
  function abrir_modal_historial() {
    visible_modal_historial = true;
    cargar_historial();
  }

  async function cargar_historial() {
    cargando_historial = true;
    try {
      const data = await postData("app/dev_tools/huerfanos/obtener_huerfanos", { accion: "obtener_historial" });
      if (data && data.ok) {
        historial_correcciones = data.historial || [];
        pagina_historial = 1;
      } else {
        mensaje_error((data && data.mensaje) ? data.mensaje : "Error al cargar historial");
      }
    } catch (err) {
      mensaje_error("Error al obtener historial: " + err.message);
    } finally {
      cargando_historial = false;
    }
  }

  // --- Reactividad: Filtrado y Paginación Principal ---
  $: huerfanos_filtrados = huerfanos.filter(item => {
    if (!buscando.trim()) return true;
    const term = buscando.toLowerCase();
    return (
      (item.sku && item.sku.toLowerCase().includes(term)) ||
      (item.modelo && item.modelo.toLowerCase().includes(term)) ||
      (item.nombre && item.nombre.toLowerCase().includes(term)) ||
      (item.folio && String(item.folio).toLowerCase().includes(term)) ||
      (item.ubicacion_folio && item.ubicacion_folio.toLowerCase().includes(term)) ||
      (item.cliente && item.cliente.nombre && item.cliente.nombre.toLowerCase().includes(term))
    );
  });

  $: total_paginas = Math.ceil(huerfanos_filtrados.length / items_por_pagina) || 1;
  $: if (pagina_actual > total_paginas) pagina_actual = total_paginas;
  $: if (pagina_actual < 1) pagina_actual = 1;

  $: inicio_indice = (pagina_actual - 1) * items_por_pagina;
  $: fin_indice = Math.min(inicio_indice + items_por_pagina, huerfanos_filtrados.length);
  $: huerfanos_paginados = huerfanos_filtrados.slice(inicio_indice, fin_indice);

  $: piezas_totales_limbo = huerfanos.reduce((sum, item) => sum + (item.cantidad_apartada || 1), 0);
  $: total_huerfanos_enviados = huerfanos.filter(h => h.tipo_ubicacion === 'pedido_historico').length;

  // Reactividad de Selección
  $: items_seleccionados = huerfanos.filter(h => seleccionados_ids.includes(h.id_unico));
  $: seleccionados_enviados = items_seleccionados.filter(h => h.tipo_ubicacion === 'pedido_historico');
  $: piezas_seleccionadas = items_seleccionados.reduce((sum, i) => sum + (i.cantidad_apartada || 1), 0);
  $: piezas_seleccionadas_enviadas = seleccionados_enviados.reduce((sum, i) => sum + (i.cantidad_apartada || 1), 0);
  $: todos_visibles_seleccionados = huerfanos_paginados.length > 0 && huerfanos_paginados.every(h => seleccionados_ids.includes(h.id_unico));
  $: alguno_visible_seleccionado = huerfanos_paginados.some(h => seleccionados_ids.includes(h.id_unico));

  // Reactividad de Historial
  $: historial_filtrado = historial_correcciones.filter(item => {
    if (filtro_tipo_historial !== 'todos' && item.tipo !== filtro_tipo_historial) {
      return false;
    }
    if (!buscando_historial.trim()) return true;
    const t = buscando_historial.toLowerCase();
    return (
      (item.sku && item.sku.toLowerCase().includes(t)) ||
      (item.modelo && item.modelo.toLowerCase().includes(t)) ||
      (item.producto && item.producto.toLowerCase().includes(t)) ||
      (item.folio && String(item.folio).toLowerCase().includes(t)) ||
      (item.cliente && item.cliente.toLowerCase().includes(t)) ||
      (item.usuario && item.usuario.toLowerCase().includes(t))
    );
  });

  $: total_correcciones_descontadas = historial_correcciones.filter(h => h.tipo === 'limpiar_descontar').length;
  $: total_correcciones_solo_limpias = historial_correcciones.filter(h => h.tipo === 'solo_limpiar').length;
  $: total_paginas_historial = Math.ceil(historial_filtrado.length / items_por_pagina_historial) || 1;
  $: if (pagina_historial > total_paginas_historial) pagina_historial = total_paginas_historial;
  $: if (pagina_historial < 1) pagina_historial = 1;
  $: inicio_historial = (pagina_historial - 1) * items_por_pagina_historial;
  $: fin_historial = Math.min(inicio_historial + items_por_pagina_historial, historial_filtrado.length);
  $: historial_paginado = historial_filtrado.slice(inicio_historial, fin_historial);

  function obtener_rango_paginas(actual, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (actual <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (actual >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', actual - 1, actual, actual + 1, '...', total];
  }

  function formatear_fecha(f) {
    if (!f) return "Sin fecha registrada";
    try {
      const d = new Date(f);
      if (isNaN(d.getTime())) return String(f);
      return d.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(f);
    }
  }
</script>

<svelte:head>
  <title>Dev Tools - Apartados Huérfanos</title>
</svelte:head>

<div class="contenedor-principal" in:fade={{ duration: 150 }}>
  <!-- Encabezado superior -->
  <div class="header-dev-tools">
    <div class="titulo-area">
      <div class="badge-dev">DEV TOOLS</div>
      <h1>Apartados Huérfanos</h1>
      <p class="descripcion">
        Muestra los productos con unidades reservadas cuyos pedidos o carritos ya no existen en la base de datos o pertenecen a pedidos ya enviados.
      </p>
    </div>

    <div class="acciones-top">
      <button class="btn-secundario btn-historial" on:click={abrir_modal_historial}>
        <i class="material-icons">history</i>
        Historial ({total_correcciones})
      </button>

      <button class="btn-secundario" on:click={cargar_huerfanos} disabled={cargando}>
        <i class="material-icons {cargando ? 'spinning' : ''}">refresh</i>
        Actualizar
      </button>

      {#if total_huerfanos_enviados > 0}
        <button class="btn-descontar-lote" on:click={() => (visible_dialogo_limpiar_descontar_todos = true)} disabled={cargando}>
          <i class="material-icons">inventory</i>
          Descontar y Limpiar Enviados ({total_huerfanos_enviados})
        </button>
      {/if}

      {#if huerfanos.length > 0}
        <button class="btn-peligro" on:click={() => (visible_dialogo_eliminar_todos = true)} disabled={cargando}>
          <i class="material-icons">delete_sweep</i>
          Solo Limpiar Todos ({huerfanos.length})
        </button>
      {/if}
    </div>
  </div>

  <!-- Métricas rápidas -->
  <div class="grid-metricas">
    <div class="card-metrica">
      <div class="icono-metrica warning">
        <i class="material-icons">report_problem</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{huerfanos.length}</span>
        <span class="etiqueta">Apartados Huérfanos Detectados</span>
      </div>
    </div>

    <div class="card-metrica">
      <div class="icono-metrica danger">
        <i class="material-icons">inventory_2</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{piezas_totales_limbo}</span>
        <span class="etiqueta">Piezas Retenidas en Limbo</span>
      </div>
    </div>

    <div class="card-metrica">
      <div class="icono-metrica info">
        <i class="material-icons">local_shipping</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{total_huerfanos_enviados}</span>
        <span class="etiqueta">Huérfanos en Pedidos Enviados</span>
      </div>
    </div>

    <div class="card-metrica card-clickeable" on:click={abrir_modal_historial} title="Haz clic para ver el registro completo de correcciones">
      <div class="icono-metrica success">
        <i class="material-icons">check_circle</i>
      </div>
      <div class="datos-metrica">
        <div class="fila-valor-historial">
          <span class="valor">{total_correcciones}</span>
          <span class="badge-ver-historial"><i class="material-icons">visibility</i> Ver</span>
        </div>
        <span class="etiqueta">Correcciones Realizadas</span>
      </div>
    </div>
  </div>

  <!-- Barra de Acciones Masivas por Selección -->
  {#if seleccionados_ids.length > 0}
    <div class="barra-seleccion-masiva shadow-sm" in:fade={{ duration: 150 }}>
      <div class="seleccion-info">
        <div class="icono-check-masivo">
          <i class="material-icons">check_box</i>
        </div>
        <div class="textos-seleccion">
          <strong>{seleccionados_ids.length}</strong> registro{seleccionados_ids.length === 1 ? '' : 's'} seleccionado{seleccionados_ids.length === 1 ? '' : 's'}
          <span class="separador-dot">•</span>
          <span class="detalle-piezas">{piezas_seleccionadas} piezas en total</span>
          {#if seleccionados_enviados.length > 0}
            <span class="separador-dot">•</span>
            <span class="detalle-enviados">({seleccionados_enviados.length} pertenecen a pedidos enviados)</span>
          {/if}
        </div>
      </div>

      <div class="seleccion-botones">
        {#if seleccionados_enviados.length > 0}
          <button
            class="btn-masivo descontar"
            on:click={confirmar_limpiar_descontar_seleccionados}
            disabled={procesando_accion}
            title="Descontar existencias y limpiar reserva de los seleccionados que fueron enviados"
          >
            <i class="material-icons">inventory</i>
            Limpiar y Descontar Enviados ({seleccionados_enviados.length})
          </button>
        {/if}

        <button
          class="btn-masivo limpiar"
          on:click={confirmar_eliminar_seleccionados}
          disabled={procesando_accion}
          title="Eliminar únicamente las reservas sin alterar existencias de los {seleccionados_ids.length} seleccionados"
        >
          <i class="material-icons">delete_sweep</i>
          Solo Limpiar Seleccionados ({seleccionados_ids.length})
        </button>

        <button
          class="btn-masivo deseleccionar"
          on:click={deseleccionar_todos}
          disabled={procesando_accion}
          title="Deseleccionar todos"
        >
          <i class="material-icons">close</i>
          Cancelar selección
        </button>
      </div>
    </div>
  {/if}

  <!-- Barra de Búsqueda y Filtros -->
  <div class="barra-filtros">
    <div class="filtros-izq">
      <div class="caja-busqueda">
        <i class="material-icons icono-buscar">search</i>
        <input
          type="text"
          placeholder="Buscar por SKU, modelo, producto, folio, ubicación o cliente..."
          bind:value={buscando}
        />
        {#if buscando}
          <button class="btn-limpiar-busqueda" on:click={() => (buscando = "")}>
            <i class="material-icons">close</i>
          </button>
        {/if}
      </div>

      {#if huerfanos_filtrados.length > 0}
        <div class="dropdown-seleccion-rapida">
          <button class="btn-seleccion-rapida" type="button" title="Opciones de selección rápida">
            <i class="material-icons">checklist</i>
            Selección
            <i class="material-icons flecha-down">arrow_drop_down</i>
          </button>
          <div class="menu-seleccion-rapida shadow-sm">
            <button on:click={toggle_seleccionar_visibles}>
              <i class="material-icons">check_box_outline_blank</i>
              {todos_visibles_seleccionados ? 'Deseleccionar visibles' : `Seleccionar página actual (${huerfanos_paginados.length})`}
            </button>
            <button on:click={seleccionar_todos_filtrados}>
              <i class="material-icons">done_all</i>
              Seleccionar todos filtrados ({huerfanos_filtrados.length})
            </button>
            {#if total_huerfanos_enviados > 0}
              <button on:click={seleccionar_solo_enviados_filtrados}>
                <i class="material-icons">local_shipping</i>
                Seleccionar solo pedidos enviados
              </button>
            {/if}
            {#if seleccionados_ids.length > 0}
              <div class="divisor-menu"></div>
              <button class="opcion-deseleccionar" on:click={deseleccionar_todos}>
                <i class="material-icons">close</i>
                Deseleccionar todo ({seleccionados_ids.length})
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="filtros-der">
      <div class="control-items-pagina">
        <span class="label-items-pagina">Registros por página:</span>
        <select class="select-items-pagina" bind:value={items_por_pagina} on:change={() => (pagina_actual = 1)}>
          {#each opciones_items_por_pagina as opcion}
            <option value={opcion.valor}>{opcion.etiqueta}</option>
          {/each}
        </select>
      </div>

      <div class="info-paginacion-resumen">
        {#if huerfanos_filtrados.length > 0}
          Mostrando <strong>{inicio_indice + 1} - {fin_indice}</strong> de <strong>{huerfanos_filtrados.length}</strong> registros
        {/if}
      </div>
    </div>
  </div>

  <!-- Contenido de Tabla -->
  {#if cargando}
    <div class="estado-cargando">
      <i class="material-icons spinning">sync</i>
      <p>Analizando catálogo de productos y validando pedidos activos...</p>
    </div>
  {:else if error_mensaje}
    <div class="estado-error">
      <i class="material-icons">error_outline</i>
      <p>{error_mensaje}</p>
      <button class="btn-secundario" on:click={cargar_huerfanos}>Reintentar</button>
    </div>
  {:else if huerfanos_filtrados.length === 0}
    <div class="estado-vacio">
      <i class="material-icons icono-exito">check_circle_outline</i>
      <h2>¡No se encontraron apartados huérfanos!</h2>
      <p>Todos los apartados registrados pertenecen a pedidos activos y no hay inconsistencias de inventario.</p>
    </div>
  {:else}
    <div class="contenedor-tabla shadow-sm">
      <table class="tabla-huerfanos">
        <thead>
          <tr>
            <th class="col-check centrado">
              <input
                type="checkbox"
                class="checkbox-custom"
                checked={todos_visibles_seleccionados}
                on:change={toggle_seleccionar_visibles}
                title="Seleccionar o deseleccionar visibles en esta página"
              />
            </th>
            <th>Producto</th>
            <th class="centrado">Cant. Apartada</th>
            <th>Folio Eliminado</th>
            <th>Ubicación del Folio</th>
            <th>Cliente</th>
            <th>Fecha Pedido Inexistente</th>
            <th class="centrado">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each huerfanos_paginados as item (item.id_unico)}
            <tr class={seleccionados_ids.includes(item.id_unico) ? 'fila-seleccionada' : ''}>
              <td class="col-check centrado">
                <input
                  type="checkbox"
                  class="checkbox-custom"
                  checked={seleccionados_ids.includes(item.id_unico)}
                  on:change={() => toggle_seleccion(item.id_unico)}
                  title="Seleccionar para acción por lote"
                />
              </td>

              <td>
                <div class="info-producto">
                  {#if item.imagen}
                    <img src={item.imagen} alt={item.nombre} class="thumb-prod" />
                  {:else}
                    <div class="thumb-placeholder">
                      <i class="material-icons">image</i>
                    </div>
                  {/if}
                  <div class="textos-prod">
                    <div class="nombre-prod">{item.nombre}</div>
                    <div class="tags-prod">
                      <span class="badge-tag">SKU: {item.sku}</span>
                      <span class="badge-tag modelo">Mod: {item.modelo}</span>
                    </div>
                  </div>
                </div>
              </td>

              <td class="centrado">
                <span class="badge-cant">
                  {item.cantidad_apartada} pza(s)
                </span>
              </td>

              <td>
                <span class="badge-folio">
                  #{item.folio}
                </span>
              </td>

              <td>
                {#if item.tipo_ubicacion === 'cancelado'}
                  <span class="badge-ubicacion cancelado" title="El folio existe en Carritos Cancelados">
                    <i class="material-icons icono-ubi">cancel</i> Carrito Cancelado
                  </span>
                {:else if item.tipo_ubicacion === 'pedido_historico'}
                  <span class="badge-ubicacion pedido" title="El folio existe en Pedidos Completados / Históricos">
                    <i class="material-icons icono-ubi">task_alt</i> Pedido (Completado)
                  </span>
                {:else if item.tipo_ubicacion === 'carrito_inactivo'}
                  <span class="badge-ubicacion inactivo" title="El folio existe en Carritos Inactivos">
                    <i class="material-icons icono-ubi">remove_shopping_cart</i> Carrito Inactivo
                  </span>
                {:else}
                  <span class="badge-ubicacion no_existe" title="El folio no existe en ninguna colección de la base de datos">
                    <i class="material-icons icono-ubi">search_off</i> No existe en DB
                  </span>
                {/if}
              </td>

              <td>
                <div class="info-cliente">
                  <div class="nombre-cliente">{item.cliente.nombre}</div>
                  {#if item.cliente.correo}
                    <div class="correo-cliente">{item.cliente.correo}</div>
                  {/if}
                </div>
              </td>

              <td>
                <div class="info-fecha">
                  <i class="material-icons icono-calendar">event</i>
                  <span>{formatear_fecha(item.fecha_pedido_eliminado)}</span>
                </div>
              </td>

              <td class="centrado">
                <div class="grupo-acciones-fila">
                  {#if item.tipo_ubicacion === 'pedido_historico'}
                    <button
                      class="btn-accion-descontar"
                      title="Limpiar reserva, descontar del inventario físico y crear registro en producto_snaplogs"
                      on:click={() => confirmar_limpiar_descontar(item)}
                    >
                      <i class="material-icons">inventory</i>
                      Limpiar y Descontar
                    </button>
                  {/if}

                  <button
                    class="btn-accion-eliminar"
                    title="Eliminar únicamente la reserva del producto sin alterar existencias"
                    on:click={() => confirmar_eliminar_uno(item)}
                  >
                    <i class="material-icons">delete_outline</i>
                    Solo Limpiar
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Paginación Configurable e Inteligente -->
    <div class="paginador-contenedor">
      <div class="info-paginador">
        Página <strong>{pagina_actual}</strong> de <strong>{total_paginas}</strong> ({huerfanos_filtrados.length} registros totales)
      </div>

      <div class="controles-paginador">
        <button
          class="btn-paginador"
          disabled={pagina_actual <= 1}
          on:click={() => pagina_actual--}
          title="Página anterior"
        >
          <i class="material-icons">navigate_before</i> Anterior
        </button>

        {#each obtener_rango_paginas(pagina_actual, total_paginas) as p}
          {#if p === '...'}
            <span class="btn-elipsis">...</span>
          {:else}
            <button
              class="btn-numero-pagina {pagina_actual === p ? 'activa' : ''}"
              on:click={() => (pagina_actual = p)}
            >
              {p}
            </button>
          {/if}
        {/each}

        <button
          class="btn-paginador"
          disabled={pagina_actual >= total_paginas}
          on:click={() => pagina_actual++}
          title="Página siguiente"
        >
          Siguiente <i class="material-icons">navigate_next</i>
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Diálogo para "Limpiar y Descontar" 1 apartado huérfano -->
<Dialog width="500" bind:visible={visible_dialogo_limpiar_descontar}>
  <div class="dialogo-header info">
    <i class="material-icons icono-modal-info">inventory</i>
    <h3>Limpiar y Descontar del Inventario</h3>
  </div>
  <div class="dialogo-body">
    {#if item_a_descontar}
      <p>Este pedido ya fue enviado en su momento. Al confirmar se realizarán las siguientes acciones:</p>
      <ul class="lista-pasos-modal">
        <li>1. Se <strong>descontará {item_a_descontar.cantidad_apartada} pza(s)</strong> de las existencias del producto <strong>{item_a_descontar.nombre}</strong>.</li>
        <li>2. Se registrará el movimiento en la colección <strong>producto_snaplogs</strong> (acción <code>2: descuento de inventario</code>).</li>
        <li>3. Se removerá el apartado huérfano del producto.</li>
      </ul>

      <div class="resumen-item-modal">
        <div><strong>SKU / Modelo:</strong> {item_a_descontar.sku} ({item_a_descontar.modelo})</div>
        <div><strong>Folio Pedido:</strong> #{item_a_descontar.folio}</div>
        <div><strong>Cliente:</strong> {item_a_descontar.cliente.nombre}</div>
        <div><strong>Inventario Actual:</strong> {item_a_descontar.inventario} pza(s) ➔ <strong>Nuevo Stock:</strong> {Math.max(0, item_a_descontar.inventario - item_a_descontar.cantidad_apartada)} pza(s)</div>
      </div>
    {/if}
  </div>
  <div slot="actions" class="dialogo-actions">
    <Button on:click={() => (visible_dialogo_limpiar_descontar = false)} disabled={procesando_accion}>
      Cancelar
    </Button>
    <Button color="primary" raised on:click={ejecutar_limpiar_descontar} disabled={procesando_accion}>
      {procesando_accion ? 'Procesando...' : 'Descontar y Limpiar'}
    </Button>
  </div>
</Dialog>

<!-- Diálogo para eliminar 1 apartado huérfano sin tocar existencias -->
<Dialog width="460" bind:visible={visible_dialogo_eliminar_uno}>
  <div class="dialogo-header">
    <i class="material-icons icono-modal-warn">warning</i>
    <h3>Solo Limpiar Reserva (Sin descontar)</h3>
  </div>
  <div class="dialogo-body">
    {#if item_a_eliminar}
      <p>¿Deseas eliminar únicamente la reserva del producto <strong>{item_a_eliminar.nombre}</strong> (SKU: {item_a_eliminar.sku}) sin modificar su inventario de existencias?</p>
      <div class="resumen-item-modal">
        <div><strong>Folio:</strong> #{item_a_eliminar.folio}</div>
        <div><strong>Ubicación:</strong> {item_a_eliminar.ubicacion_folio}</div>
        <div><strong>Cliente:</strong> {item_a_eliminar.cliente.nombre}</div>
        <div><strong>Cantidad a liberar de reserva:</strong> {item_a_eliminar.cantidad_apartada} pza(s)</div>
      </div>
    {/if}
  </div>
  <div slot="actions" class="dialogo-actions">
    <Button on:click={() => (visible_dialogo_eliminar_uno = false)} disabled={procesando_accion}>
      Cancelar
    </Button>
    <Button color="primary" raised on:click={ejecutar_eliminar_uno} disabled={procesando_accion}>
      {procesando_accion ? 'Eliminando...' : 'Confirmar Solo Limpieza'}
    </Button>
  </div>
</Dialog>

<!-- Diálogo para "Descontar y Limpiar Todos los Enviados" -->
<Dialog width="520" bind:visible={visible_dialogo_limpiar_descontar_todos}>
  <div class="dialogo-header info">
    <i class="material-icons icono-modal-info">inventory</i>
    <h3>Descontar y Limpiar Todos los Enviados</h3>
  </div>
  <div class="dialogo-body">
    <p>Se procesarán masivamente los <strong>{total_huerfanos_enviados}</strong> apartados huérfanos pertenecientes a pedidos ya enviados.</p>
    <p>Para cada uno se descontará la cantidad correspondiente del inventario físico de existencias y se generará su registro en <strong>producto_snaplogs</strong>.</p>
  </div>
  <div slot="actions" class="dialogo-actions">
    <Button on:click={() => (visible_dialogo_limpiar_descontar_todos = false)} disabled={procesando_accion}>
      Cancelar
    </Button>
    <Button color="primary" raised on:click={ejecutar_limpiar_descontar_todos_enviados} disabled={procesando_accion}>
      {procesando_accion ? 'Procesando...' : 'Descontar y Limpiar Todos'}
    </Button>
  </div>
</Dialog>

<!-- Diálogo para eliminar todos los apartados huérfanos -->
<Dialog width="480" bind:visible={visible_dialogo_eliminar_todos}>
  <div class="dialogo-header danger">
    <i class="material-icons icono-modal-danger">delete_forever</i>
    <h3>Solo Limpiar Todos (Sin descontar)</h3>
  </div>
  <div class="dialogo-body">
    <p>Se eliminarán masivamente las reservas de los <strong>{huerfanos.length}</strong> apartados huérfanos detectados sin modificar las existencias del inventario.</p>
  </div>
  <div slot="actions" class="dialogo-actions">
    <Button on:click={() => (visible_dialogo_eliminar_todos = false)} disabled={procesando_accion}>
      Cancelar
    </Button>
    <Button color="accent" raised on:click={ejecutar_eliminar_todos} disabled={procesando_accion}>
      {procesando_accion ? 'Procesando...' : 'Eliminar Todas las Reservas'}
    </Button>
  </div>
</Dialog>

<!-- Diálogo para "Limpiar y Descontar" Seleccionados -->
<Dialog width="540" bind:visible={visible_dialogo_limpiar_descontar_seleccionados}>
  <div class="dialogo-header info">
    <i class="material-icons icono-modal-info">inventory</i>
    <h3>Limpiar y Descontar Seleccionados</h3>
  </div>
  <div class="dialogo-body">
    <p>
      Estás a punto de procesar los <strong>{seleccionados_enviados.length}</strong> apartados huérfanos seleccionados que pertenecen a pedidos enviados
      (un total de <strong>{piezas_seleccionadas_enviadas} pieza(s)</strong>).
    </p>
    <ul class="lista-pasos-modal">
      <li>Se descontará del inventario físico la cantidad de cada producto seleccionado.</li>
      <li>Se creará su registro en <strong>producto_snaplogs</strong> como salida de inventario.</li>
      <li>Se eliminará la reserva huérfana de la base de datos.</li>
    </ul>
  </div>
  <div slot="actions" class="dialogo-actions">
    <Button on:click={() => (visible_dialogo_limpiar_descontar_seleccionados = false)} disabled={procesando_accion}>
      Cancelar
    </Button>
    <Button color="primary" raised on:click={ejecutar_limpiar_descontar_seleccionados} disabled={procesando_accion}>
      {procesando_accion ? 'Procesando...' : `Descontar y Limpiar (${seleccionados_enviados.length})`}
    </Button>
  </div>
</Dialog>

<!-- Diálogo para "Solo Limpiar" Seleccionados (Sin descontar) -->
<Dialog width="500" bind:visible={visible_dialogo_eliminar_seleccionados}>
  <div class="dialogo-header danger">
    <i class="material-icons icono-modal-danger">delete_sweep</i>
    <h3>Solo Limpiar Seleccionados (Sin descontar)</h3>
  </div>
  <div class="dialogo-body">
    <p>
      ¿Deseas eliminar únicamente las reservas de los <strong>{seleccionados_ids.length}</strong> apartados seleccionados
      (totalizando <strong>{piezas_seleccionadas} pieza(s)</strong>) sin modificar las existencias de inventario?
    </p>
    <p class="texto-aviso-secundario">
      Esta acción libera las reservas retenidas en el catálogo para que vuelvan a estar disponibles si era un error de apartados.
    </p>
  </div>
  <div slot="actions" class="dialogo-actions">
    <Button on:click={() => (visible_dialogo_eliminar_seleccionados = false)} disabled={procesando_accion}>
      Cancelar
    </Button>
    <Button color="accent" raised on:click={ejecutar_eliminar_seleccionados} disabled={procesando_accion}>
      {procesando_accion ? 'Procesando...' : `Limpiar (${seleccionados_ids.length}) Reservas`}
    </Button>
  </div>
</Dialog>

<!-- MODAL COMPLETO: REGISTRO DE CORRECCIONES REALIZADAS -->
<Dialog width="1020" bind:visible={visible_modal_historial}>
  <div class="modal-historial-header">
    <div class="titulo-con-icono">
      <div class="icono-historial-wrap">
        <i class="material-icons">history</i>
      </div>
      <div>
        <h3>Registro de Correcciones Realizadas</h3>
        <p class="subtitulo-modal">Historial de apartados huérfanos liberados y stock sincronizado</p>
      </div>
    </div>
    <button class="btn-cerrar-modal" on:click={() => (visible_modal_historial = false)} title="Cerrar modal">
      <i class="material-icons">close</i>
    </button>
  </div>

  <div class="modal-historial-body">
    <!-- Mini KPIs en modal -->
    <div class="kpis-modal-historial">
      <div class="mini-kpi">
        <span class="mini-kpi-val">{historial_correcciones.length}</span>
        <span class="mini-kpi-lbl">Total Correcciones</span>
      </div>
      <div class="mini-kpi descontadas">
        <span class="mini-kpi-val">{total_correcciones_descontadas}</span>
        <span class="mini-kpi-lbl">Descontados del Inventario</span>
      </div>
      <div class="mini-kpi limpias">
        <span class="mini-kpi-val">{total_correcciones_solo_limpias}</span>
        <span class="mini-kpi-lbl">Solo Limpieza de Reserva</span>
      </div>
    </div>

    <!-- Barra de filtros del historial -->
    <div class="barra-filtros-historial">
      <div class="caja-buscar-historial">
        <i class="material-icons">search</i>
        <input
          type="text"
          placeholder="Buscar en historial por producto, SKU, folio, cliente o usuario..."
          bind:value={buscando_historial}
        />
        {#if buscando_historial}
          <button class="btn-clear-hist" on:click={() => (buscando_historial = "")}>
            <i class="material-icons">close</i>
          </button>
        {/if}
      </div>

      <div class="tabs-tipo-historial">
        <button
          class="tab-btn {filtro_tipo_historial === 'todos' ? 'activo' : ''}"
          on:click={() => { filtro_tipo_historial = 'todos'; pagina_historial = 1; }}
        >
          Todos ({historial_correcciones.length})
        </button>
        <button
          class="tab-btn {filtro_tipo_historial === 'limpiar_descontar' ? 'activo' : ''}"
          on:click={() => { filtro_tipo_historial = 'limpiar_descontar'; pagina_historial = 1; }}
        >
          Descontados ({total_correcciones_descontadas})
        </button>
        <button
          class="tab-btn {filtro_tipo_historial === 'solo_limpiar' ? 'activo' : ''}"
          on:click={() => { filtro_tipo_historial = 'solo_limpiar'; pagina_historial = 1; }}
        >
          Solo Limpiados ({total_correcciones_solo_limpias})
        </button>
      </div>

      <button
        class="btn-recargar-historial"
        on:click={cargar_historial}
        disabled={cargando_historial}
        title="Actualizar historial"
      >
        <i class="material-icons {cargando_historial ? 'spinning' : ''}">refresh</i>
      </button>
    </div>

    <!-- Tabla de Historial -->
    {#if cargando_historial}
      <div class="estado-cargando-historial">
        <i class="material-icons spinning">sync</i>
        <p>Cargando registros de correcciones...</p>
      </div>
    {:else if historial_filtrado.length === 0}
      <div class="estado-vacio-historial">
        <i class="material-icons">history_toggle_off</i>
        <p>No se encontraron registros de correcciones que coincidan con la búsqueda.</p>
      </div>
    {:else}
      <div class="tabla-historial-contenedor shadow-sm">
        <table class="tabla-historial">
          <thead>
            <tr>
              <th>Tipo de Acción</th>
              <th>Producto</th>
              <th>Folio</th>
              <th>Cliente</th>
              <th class="centrado">Cantidad</th>
              <th>Fecha y Hora</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {#each historial_paginado as item, i (item.id || i)}
              <tr>
                <td>
                  {#if item.tipo === 'limpiar_descontar'}
                    <span class="badge-tipo-historial descontar" title="Se descontó del inventario y se limpió la reserva">
                      <i class="material-icons">inventory</i> Descontado y Limpio
                    </span>
                  {:else}
                    <span class="badge-tipo-historial limpiar" title="Solo se liberó la reserva sin modificar inventario">
                      <i class="material-icons">cleaning_services</i> Solo Limpieza
                    </span>
                  {/if}
                </td>

                <td>
                  <div class="hist-info-prod">
                    <div class="hist-nombre-prod">{item.producto || 'Producto sin nombre'}</div>
                    <div class="hist-tags-prod">
                      {#if item.sku}<span class="badge-tag-mini">SKU: {item.sku}</span>{/if}
                      {#if item.modelo}<span class="badge-tag-mini mod">Mod: {item.modelo}</span>{/if}
                    </div>
                  </div>
                </td>

                <td>
                  <span class="badge-folio-hist">
                    {item.folio ? `#${item.folio}` : 'S/F'}
                  </span>
                </td>

                <td>
                  <span class="hist-cliente" title={item.cliente || 'No especificado'}>
                    {item.cliente || '—'}
                  </span>
                </td>

                <td class="centrado">
                  <span class="badge-cant-hist">
                    {item.cantidad || 1} pza(s)
                  </span>
                </td>

                <td>
                  <div class="hist-fecha">
                    <i class="material-icons icono-cal-mini">schedule</i>
                    <span>{formatear_fecha(item.fecha)}</span>
                  </div>
                </td>

                <td>
                  <span class="hist-usuario" title={item.usuario}>
                    <i class="material-icons icono-user-mini">person</i>
                    {item.usuario ? item.usuario.split('@')[0] : 'Sistema'}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Paginación del Historial -->
      <div class="paginador-historial">
        <div class="info-paginador-hist">
          Mostrando <strong>{inicio_historial + 1} - {fin_historial}</strong> de <strong>{historial_filtrado.length}</strong> correcciones
        </div>

        <div class="controles-paginador-hist">
          <button
            class="btn-pag-hist"
            disabled={pagina_historial <= 1}
            on:click={() => pagina_historial--}
          >
            <i class="material-icons">chevron_left</i> Anterior
          </button>

          {#each obtener_rango_paginas(pagina_historial, total_paginas_historial) as p}
            {#if p === '...'}
              <span class="btn-elipsis-hist">...</span>
            {:else}
              <button
                class="btn-num-hist {pagina_historial === p ? 'activa' : ''}"
                on:click={() => (pagina_historial = p)}
              >
                {p}
              </button>
            {/if}
          {/each}

          <button
            class="btn-pag-hist"
            disabled={pagina_historial >= total_paginas_historial}
            on:click={() => pagina_historial++}
          >
            Siguiente <i class="material-icons">chevron_right</i>
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div slot="actions" class="dialogo-actions">
    <Button on:click={() => (visible_modal_historial = false)}>
      Cerrar
    </Button>
  </div>
</Dialog>

<style>
  .contenedor-principal {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .header-dev-tools {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    background: #ffffff;
    padding: 20px 24px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .badge-dev {
    display: inline-block;
    background-color: #3182ce;
    color: white;
    font-size: 0.7em;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
  }

  .titulo-area h1 {
    margin: 0 0 6px 0;
    font-size: 1.6em;
    color: #1a202c;
  }

  .descripcion {
    margin: 0;
    color: #718096;
    font-size: 0.9em;
  }

  .acciones-top {
    display: flex;
    gap: 10px;
  }

  .btn-secundario {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #edf2f7;
    color: #2d3748;
    border: 1px solid #cbd5e0;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.88em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secundario:hover:not(:disabled) {
    background: #e2e8f0;
    color: #1a202c;
  }

  .btn-descontar-lote {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #3182ce;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.88em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-descontar-lote:hover:not(:disabled) {
    background: #2b6cb0;
  }

  .btn-peligro {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #e53e3e;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.88em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-peligro:hover:not(:disabled) {
    background: #c53030;
  }

  .grid-metricas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .card-metrica {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #ffffff;
    padding: 16px 20px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .icono-metrica {
    width: 46px;
    height: 46px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icono-metrica.warning {
    background-color: #feebc8;
    color: #dd6b20;
  }

  .icono-metrica.danger {
    background-color: #fed7d7;
    color: #e53e3e;
  }

  .icono-metrica.info {
    background-color: #ebf8ff;
    color: #3182ce;
  }

  .icono-metrica.success {
    background-color: #c6f6d5;
    color: #276749;
  }

  .datos-metrica {
    display: flex;
    flex-direction: column;
  }

  .datos-metrica .valor {
    font-size: 1.4em;
    font-weight: 700;
    color: #2d3748;
  }

  .datos-metrica .etiqueta {
    font-size: 0.82em;
    color: #718096;
    font-weight: 500;
  }

  .barra-filtros {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 16px;
  }

  .caja-busqueda {
    position: relative;
    flex-grow: 1;
    max-width: 500px;
  }

  .caja-busqueda input {
    width: 100%;
    padding: 9px 36px 9px 38px;
    border: 1px solid #cbd5e0;
    border-radius: 8px;
    font-size: 0.9em;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .caja-busqueda input:focus {
    border-color: #3182ce;
    box-shadow: 0 0 0 3px rgba(49,130,206,0.15);
  }

  .icono-buscar {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #a0aec0;
    font-size: 20px;
  }

  .btn-limpiar-busqueda {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: #a0aec0;
    cursor: pointer;
    padding: 2px;
  }

  .info-paginacion-resumen {
    font-size: 0.86em;
    color: #4a5568;
  }

  .contenedor-tabla {
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    overflow-x: auto;
  }

  .tabla-huerfanos {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
  }

  .tabla-huerfanos th {
    background-color: #f7fafc;
    color: #4a5568;
    text-transform: uppercase;
    font-size: 0.75em;
    letter-spacing: 0.05em;
    font-weight: 700;
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  .tabla-huerfanos td {
    padding: 12px 16px;
    border-bottom: 1px solid #edf2f7;
    color: #2d3748;
    vertical-align: middle;
  }

  .tabla-huerfanos tr:hover {
    background-color: #f8fafc;
  }

  .info-producto {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .thumb-prod {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .thumb-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background: #edf2f7;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a0aec0;
  }

  .nombre-prod {
    font-weight: 600;
    color: #1a202c;
    line-height: 1.3;
  }

  .tags-prod {
    display: flex;
    gap: 6px;
    margin-top: 2px;
  }

  .badge-tag {
    font-size: 0.75em;
    background: #edf2f7;
    color: #4a5568;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .badge-tag.modelo {
    background: #e2e8f0;
  }

  .badge-cant {
    display: inline-block;
    background: #feebc8;
    color: #9c4221;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85em;
  }

  .badge-folio {
    display: inline-block;
    background: #e1f5fe;
    color: #0277bd;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.85em;
  }

  .badge-ubicacion {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82em;
    font-weight: 600;
    padding: 4px 9px;
    border-radius: 6px;
  }

  .badge-ubicacion.cancelado {
    background: #fff5f5;
    color: #c53030;
    border: 1px solid #feb2b2;
  }

  .badge-ubicacion.pedido {
    background: #f0fff4;
    color: #276749;
    border: 1px solid #9ae6b4;
  }

  .badge-ubicacion.inactivo {
    background: #fffaf0;
    color: #dd6b20;
    border: 1px solid #fbd38d;
  }

  .badge-ubicacion.no_existe {
    background: #edf2f7;
    color: #4a5568;
    border: 1px solid #cbd5e0;
  }

  .icono-ubi {
    font-size: 14px;
  }

  .info-cliente .nombre-cliente {
    font-weight: 600;
    color: #2d3748;
  }

  .info-cliente .correo-cliente {
    font-size: 0.8em;
    color: #718096;
  }

  .info-fecha {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #4a5568;
    font-size: 0.85em;
  }

  .icono-calendar {
    font-size: 16px;
    color: #a0aec0;
  }

  .grupo-acciones-fila {
    display: flex;
    gap: 6px;
    justify-content: center;
  }

  .btn-accion-descontar {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #ebf8ff;
    color: #2b6cb0;
    border: 1px solid #90cdf4;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.82em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-accion-descontar:hover {
    background: #3182ce;
    color: white;
    border-color: #3182ce;
  }

  .btn-accion-eliminar {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #fff5f5;
    color: #e53e3e;
    border: 1px solid #feb2b2;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.82em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-accion-eliminar:hover {
    background: #e53e3e;
    color: white;
    border-color: #e53e3e;
  }

  .centrado {
    text-align: center;
  }

  .paginador-contenedor {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    background: #ffffff;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .info-paginador {
    font-size: 0.88em;
    color: #4a5568;
  }

  .controles-paginador {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .btn-paginador {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #ffffff;
    border: 1px solid #cbd5e0;
    color: #2d3748;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85em;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-paginador:hover:not(:disabled) {
    background: #edf2f7;
    border-color: #a0aec0;
  }

  .btn-paginador:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-numero-pagina {
    background: #ffffff;
    border: 1px solid #cbd5e0;
    color: #2d3748;
    min-width: 32px;
    height: 32px;
    border-radius: 6px;
    font-size: 0.85em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-numero-pagina:hover {
    background: #edf2f7;
  }

  .btn-numero-pagina.activa {
    background: #3182ce;
    color: white;
    border-color: #3182ce;
  }

  .estado-cargando, .estado-vacio, .estado-error {
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    padding: 48px 24px;
    text-align: center;
    color: #718096;
  }

  .estado-cargando i {
    font-size: 36px;
    color: #3182ce;
    margin-bottom: 12px;
  }

  .icono-exito {
    font-size: 54px;
    color: #38a169;
    margin-bottom: 12px;
  }

  .estado-vacio h2 {
    color: #2d3748;
    margin: 0 0 8px 0;
  }

  .dialogo-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    border-bottom: 1px solid #edf2f7;
  }

  .dialogo-header h3 {
    margin: 0;
    font-size: 1.15em;
    color: #2d3748;
  }

  .dialogo-header.info {
    background: #ebf8ff;
  }

  .icono-modal-info {
    color: #3182ce;
  }

  .icono-modal-warn {
    color: #dd6b20;
  }

  .icono-modal-danger {
    color: #e53e3e;
  }

  .dialogo-body {
    padding: 20px;
    font-size: 0.92em;
    color: #4a5568;
    line-height: 1.5;
  }

  .lista-pasos-modal {
    margin: 10px 0;
    padding-left: 18px;
    line-height: 1.6;
  }

  .resumen-item-modal {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 12px;
    font-size: 0.9em;
  }

  .dialogo-actions {
    padding: 12px 20px;
    border-top: 1px solid #edf2f7;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  /* --- Nuevos Estilos: Historial, Selección Masiva y Paginador Extendido --- */

  .btn-historial {
    background: #f7fafc;
    border-color: #cbd5e0;
    color: #2b6cb0;
  }

  .btn-historial:hover:not(:disabled) {
    background: #ebf8ff;
    color: #2b6cb0;
    border-color: #bee3f8;
  }

  .card-clickeable {
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .card-clickeable:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(49, 130, 206, 0.12);
    border-color: #68d391;
  }

  .fila-valor-historial {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .badge-ver-historial {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.72em;
    font-weight: 600;
    background: #ebf8ff;
    color: #3182ce;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #bee3f8;
  }

  .badge-ver-historial i {
    font-size: 13px;
  }

  /* Barra de Selección Masiva */
  .barra-seleccion-masiva {
    background: #2d3748;
    color: #ffffff;
    border-radius: 10px;
    padding: 14px 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
  }

  .seleccion-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icono-check-masivo {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #63b3ed;
  }

  .textos-seleccion {
    font-size: 0.92em;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .separador-dot {
    color: #a0aec0;
  }

  .detalle-piezas {
    color: #e2e8f0;
  }

  .detalle-enviados {
    color: #90cdf4;
    font-weight: 500;
  }

  .seleccion-botones {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .btn-masivo {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 0.85em;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-masivo.descontar {
    background: #3182ce;
    color: white;
  }

  .btn-masivo.descontar:hover:not(:disabled) {
    background: #2b6cb0;
  }

  .btn-masivo.limpiar {
    background: #e53e3e;
    color: white;
  }

  .btn-masivo.limpiar:hover:not(:disabled) {
    background: #c53030;
  }

  .btn-masivo.deseleccionar {
    background: rgba(255, 255, 255, 0.15);
    color: #e2e8f0;
  }

  .btn-masivo.deseleccionar:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }

  /* Filtros organizados */
  .filtros-izq {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-grow: 1;
  }

  .filtros-der {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  /* Dropdown Selección Rápida */
  .dropdown-seleccion-rapida {
    position: relative;
    display: inline-block;
  }

  .btn-seleccion-rapida {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #ffffff;
    border: 1px solid #cbd5e0;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.86em;
    font-weight: 600;
    color: #4a5568;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-seleccion-rapida:hover {
    background: #edf2f7;
    border-color: #a0aec0;
  }

  .flecha-down {
    font-size: 18px;
    color: #718096;
  }

  .menu-seleccion-rapida {
    display: none;
    position: absolute;
    left: 0;
    top: calc(100% + 4px);
    background: white;
    min-width: 260px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    z-index: 50;
    padding: 6px 0;
    box-shadow: 0 4px 14px rgba(0,0,0,0.1);
  }

  .dropdown-seleccion-rapida:hover .menu-seleccion-rapida,
  .dropdown-seleccion-rapida:focus-within .menu-seleccion-rapida {
    display: block;
  }

  .menu-seleccion-rapida button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 14px;
    background: transparent;
    border: none;
    text-align: left;
    font-size: 0.86em;
    color: #2d3748;
    cursor: pointer;
    transition: background 0.15s;
  }

  .menu-seleccion-rapida button:hover {
    background: #f7fafc;
    color: #3182ce;
  }

  .menu-seleccion-rapida button i {
    font-size: 18px;
    color: #718096;
  }

  .divisor-menu {
    height: 1px;
    background: #edf2f7;
    margin: 4px 0;
  }

  .menu-seleccion-rapida button.opcion-deseleccionar {
    color: #e53e3e;
  }

  .menu-seleccion-rapida button.opcion-deseleccionar i {
    color: #e53e3e;
  }

  /* Selector de registros por página */
  .control-items-pagina {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label-items-pagina {
    font-size: 0.85em;
    color: #718096;
    font-weight: 500;
  }

  .select-items-pagina {
    background: #ffffff;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 0.86em;
    color: #2d3748;
    cursor: pointer;
    outline: none;
    font-weight: 600;
    transition: border-color 0.2s;
  }

  .select-items-pagina:focus {
    border-color: #3182ce;
    box-shadow: 0 0 0 2px rgba(49,130,206,0.15);
  }

  /* Checkboxes de Tabla */
  .col-check {
    width: 44px;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  .checkbox-custom {
    width: 17px;
    height: 17px;
    cursor: pointer;
    accent-color: #3182ce;
    margin: 0 auto;
    display: block;
  }

  .fila-seleccionada {
    background-color: #ebf8ff !important;
  }

  .fila-seleccionada:hover {
    background-color: #e1f2fe !important;
  }

  .btn-elipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 32px;
    color: #a0aec0;
    font-weight: 700;
  }

  .texto-aviso-secundario {
    font-size: 0.86em;
    color: #718096;
    margin-top: 6px;
  }

  /* --- Estilos del Modal de Historial --- */
  .modal-historial-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .titulo-con-icono {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icono-historial-wrap {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #ebf8ff;
    color: #3182ce;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icono-historial-wrap i {
    font-size: 24px;
  }

  .modal-historial-header h3 {
    margin: 0 0 2px 0;
    font-size: 1.25em;
    color: #1a202c;
  }

  .subtitulo-modal {
    margin: 0;
    font-size: 0.85em;
    color: #718096;
  }

  .btn-cerrar-modal {
    background: transparent;
    border: none;
    color: #a0aec0;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .btn-cerrar-modal:hover {
    background: #edf2f7;
    color: #4a5568;
  }

  .modal-historial-body {
    padding: 20px 24px;
    max-height: 72vh;
    overflow-y: auto;
    background: #f7fafc;
  }

  /* KPIs del Modal */
  .kpis-modal-historial {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 18px;
  }

  .mini-kpi {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }

  .mini-kpi-val {
    font-size: 1.45em;
    font-weight: 700;
    color: #2d3748;
  }

  .mini-kpi-lbl {
    font-size: 0.78em;
    color: #718096;
    font-weight: 500;
    margin-top: 2px;
  }

  .mini-kpi.descontadas {
    border-left: 4px solid #3182ce;
  }

  .mini-kpi.descontadas .mini-kpi-val {
    color: #2b6cb0;
  }

  .mini-kpi.limpias {
    border-left: 4px solid #e53e3e;
  }

  .mini-kpi.limpias .mini-kpi-val {
    color: #c53030;
  }

  /* Barra de Filtros Historial */
  .barra-filtros-historial {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .caja-buscar-historial {
    position: relative;
    flex-grow: 1;
    min-width: 260px;
  }

  .caja-buscar-historial input {
    width: 100%;
    padding: 8px 32px 8px 34px;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    font-size: 0.88em;
    outline: none;
    box-sizing: border-box;
    background: white;
  }

  .caja-buscar-historial input:focus {
    border-color: #3182ce;
  }

  .caja-buscar-historial i {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
    color: #a0aec0;
  }

  .btn-clear-hist {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: #a0aec0;
    cursor: pointer;
  }

  .tabs-tipo-historial {
    display: flex;
    gap: 4px;
    background: #edf2f7;
    padding: 3px;
    border-radius: 6px;
  }

  .tab-btn {
    border: none;
    background: transparent;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.82em;
    font-weight: 600;
    color: #4a5568;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab-btn:hover {
    color: #1a202c;
  }

  .tab-btn.activo {
    background: #ffffff;
    color: #3182ce;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .btn-recargar-historial {
    background: #ffffff;
    border: 1px solid #cbd5e0;
    padding: 7px 10px;
    border-radius: 6px;
    color: #4a5568;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-recargar-historial:hover:not(:disabled) {
    background: #edf2f7;
  }

  /* Tabla Historial */
  .tabla-historial-contenedor {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow-x: auto;
  }

  .tabla-historial {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.86em;
  }

  .tabla-historial th {
    background: #edf2f7;
    color: #4a5568;
    font-size: 0.74em;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  .tabla-historial td {
    padding: 10px 14px;
    border-bottom: 1px solid #edf2f7;
    color: #2d3748;
    vertical-align: middle;
  }

  .tabla-historial tr:hover {
    background-color: #f8fafc;
  }

  .badge-tipo-historial {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78em;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    white-space: nowrap;
  }

  .badge-tipo-historial.descontar {
    background: #ebf8ff;
    color: #2b6cb0;
    border: 1px solid #90cdf4;
  }

  .badge-tipo-historial.limpiar {
    background: #fff5f5;
    color: #c53030;
    border: 1px solid #feb2b2;
  }

  .badge-tipo-historial i {
    font-size: 14px;
  }

  .hist-info-prod {
    max-width: 260px;
  }

  .hist-nombre-prod {
    font-weight: 600;
    color: #1a202c;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hist-tags-prod {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }

  .badge-tag-mini {
    font-size: 0.72em;
    background: #edf2f7;
    color: #4a5568;
    padding: 1px 5px;
    border-radius: 3px;
  }

  .badge-tag-mini.mod {
    background: #e2e8f0;
  }

  .badge-folio-hist {
    display: inline-block;
    background: #e1f5fe;
    color: #0277bd;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.84em;
  }

  .hist-cliente {
    display: inline-block;
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
    color: #4a5568;
  }

  .badge-cant-hist {
    background: #feebc8;
    color: #9c4221;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.82em;
  }

  .hist-fecha {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82em;
    color: #4a5568;
    white-space: nowrap;
  }

  .icono-cal-mini {
    font-size: 14px;
    color: #a0aec0;
  }

  .hist-usuario {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82em;
    color: #4a5568;
    background: #edf2f7;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .icono-user-mini {
    font-size: 14px;
    color: #718096;
  }

  /* Estados vacíos y carga del historial */
  .estado-cargando-historial,
  .estado-vacio-historial {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 36px 20px;
    text-align: center;
    color: #718096;
  }

  .estado-cargando-historial i,
  .estado-vacio-historial i {
    font-size: 36px;
    color: #a0aec0;
    margin-bottom: 8px;
  }

  /* Paginador del Historial */
  .paginador-historial {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding: 10px 14px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }

  .info-paginador-hist {
    font-size: 0.82em;
    color: #4a5568;
  }

  .controles-paginador-hist {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn-pag-hist {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: #ffffff;
    border: 1px solid #cbd5e0;
    color: #2d3748;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.8em;
    cursor: pointer;
  }

  .btn-pag-hist:hover:not(:disabled) {
    background: #edf2f7;
  }

  .btn-pag-hist:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-num-hist {
    min-width: 28px;
    height: 28px;
    background: #ffffff;
    border: 1px solid #cbd5e0;
    color: #2d3748;
    border-radius: 4px;
    font-size: 0.8em;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-num-hist:hover {
    background: #edf2f7;
  }

  .btn-num-hist.activa {
    background: #3182ce;
    color: white;
    border-color: #3182ce;
  }

  .btn-elipsis-hist {
    color: #a0aec0;
    padding: 0 4px;
    font-weight: 700;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .spinning {
    display: inline-block;
    animation: spin 1.2s linear infinite;
  }
</style>
