<script>
  import { onMount } from "svelte";
  import { postData, mensaje_bueno, mensaje_error } from "./../../../stores";
  import { Button, Dialog } from "svelte-mui/src";
  import { fade } from "svelte/transition";

  let huerfanos = [];
  let buscando = "";
  let cargando = true;
  let error_mensaje = "";
  let total_correcciones = 0;

  // Paginación (Máximo 10 por página)
  let pagina_actual = 1;
  const items_por_pagina = 10;

  // Diálogos de confirmación
  let visible_dialogo_eliminar_uno = false;
  let visible_dialogo_eliminar_todos = false;
  let visible_dialogo_limpiar_descontar = false;
  let visible_dialogo_limpiar_descontar_todos = false;

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

  // Filtrado y paginación
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

    <div class="card-metrica">
      <div class="icono-metrica success">
        <i class="material-icons">check_circle</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{total_correcciones}</span>
        <span class="etiqueta">Correcciones Realizadas</span>
      </div>
    </div>
  </div>

  <!-- Barra de Búsqueda y Filtros -->
  <div class="barra-filtros">
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

    <div class="info-paginacion-resumen">
      {#if huerfanos_filtrados.length > 0}
        Mostrando <strong>{inicio_indice + 1} - {fin_indice}</strong> de <strong>{huerfanos_filtrados.length}</strong> registros
      {/if}
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
            <tr>
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

    <!-- Paginación (Máximo 10 por página) -->
    <div class="paginador-contenedor">
      <div class="info-paginador">
        Página <strong>{pagina_actual}</strong> de <strong>{total_paginas}</strong>
      </div>

      <div class="controles-paginador">
        <button
          class="btn-paginador"
          disabled={pagina_actual <= 1}
          on:click={() => pagina_actual--}
        >
          <i class="material-icons">navigate_before</i> Anterior
        </button>

        {#each Array(total_paginas) as _, index}
          <button
            class="btn-numero-pagina {pagina_actual === index + 1 ? 'activa' : ''}"
            on:click={() => (pagina_actual = index + 1)}
          >
            {index + 1}
          </button>
        {/each}

        <button
          class="btn-paginador"
          disabled={pagina_actual >= total_paginas}
          on:click={() => pagina_actual++}
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

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .spinning {
    display: inline-block;
    animation: spin 1.2s linear infinite;
  }
</style>
