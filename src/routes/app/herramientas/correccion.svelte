<script>
  import { onMount } from "svelte";
  import { postData, mensaje_bueno, mensaje_error } from "../../stores";
  import { fade } from "svelte/transition";

  let colecciones = [
    { value: "Carrito", label: "Carritos" },
    -{ value: "Pedido", label: "Pedidos" },
    { value: "Cliente", label: "Clientes" },
    { value: "Producto", label: "Productos" },
    { value: "Promocion", label: "Promociones" },
    { value: "Inyeccion", label: "Inyecciones a Inventario" },
    { value: "Producto_snaplog", label: "Snaplogs de Productos" },
    { value: "Carrito_publico", label: "Carritos Públicos (Activos)" },
    {
      value: "Carrito_publico_historico",
      label: "Carritos Públicos (Históricos)",
    },
    { value: "Ficha_de_descuento", label: "Fichas de Descuento" },
  ];

  let coleccionSeleccionada = "Carrito";
  let lista = [];
  let totalDocumentos = 0;
  let paginaActual = 1;
  let limite = 10;
  let cargando = false;
  let seleccionados = {}; // mapa de _id -> boolean
  let paginasTotales = 1;
  let relacionesColumnas = [];

  $: if (lista && lista.length > 0) {
    const relsObj = lista[0].relaciones;
    relacionesColumnas = Object.keys(relsObj).map((key) => ({
      path: key,
      label: relsObj[key].label,
    }));
  } else {
    relacionesColumnas = [];
  }

  // Verificar si hay elementos seleccionados y si al menos uno requiere corrección
  let seleccionadosArray = [];
  $: {
    seleccionadosArray = Object.keys(seleccionados).filter(
      (id) => seleccionados[id],
    );
  }

  let puedeCorregirSeleccionados = false;
  $: {
    puedeCorregirSeleccionados = seleccionadosArray.some((id) => {
      const doc = lista.find((item) => item._id === id);
      return doc && tieneCorreccionPendiente(doc.relaciones);
    });
  }

  onMount(() => {
    cargarDatos();
  });

  async function cargarDatos() {
    cargando = true;
    seleccionados = {}; // Resetear selección al cambiar de bloque o colección
    try {
      const res = await postData("app/herramientas/diagnosticar", {
        coleccion: coleccionSeleccionada,
        pagina_actual: paginaActual,
        limite: limite,
      });
      if (res.ok) {
        lista = res.lista;
        totalDocumentos = res.totalDocumentos;
        paginasTotales = Math.ceil(totalDocumentos / limite) || 1;
      } else {
        mensaje_error(res.mensaje || "Error al realizar el diagnóstico.");
        lista = [];
        totalDocumentos = 0;
        paginasTotales = 1;
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de comunicación con el servidor.");
    } finally {
      cargando = false;
    }
  }

  function handleColeccionChange() {
    paginaActual = 1;
    cargarDatos();
  }

  function anterior() {
    if (paginaActual > 1) {
      paginaActual--;
      cargarDatos();
    }
  }

  function siguiente() {
    if (paginaActual < paginasTotales) {
      paginaActual++;
      cargarDatos();
    }
  }

  function tieneCorreccionPendiente(relaciones) {
    return Object.values(relaciones).some(
      (rel) => rel.estado === "requiere_conversion",
    );
  }

  let selectAll = false;
  $: {
    const listIds = lista.map((item) => item._id);
    if (listIds.length > 0) {
      selectAll = listIds.every((id) => seleccionados[id]);
    } else {
      selectAll = false;
    }
  }

  function toggleSelectAll() {
    const newVal = !selectAll;
    lista.forEach((item) => {
      seleccionados[item._id] = newVal;
    });
    seleccionados = seleccionados; // Disparar reactividad
  }

  async function corregirIndividual(id) {
    cargando = true;
    try {
      const res = await postData("app/herramientas/corregir", {
        coleccion: coleccionSeleccionada,
        ids: [id],
      });
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        await cargarDatos();
      } else {
        mensaje_error(res.mensaje || "Error al aplicar corrección.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error al conectar con el servidor.");
    } finally {
      cargando = false;
    }
  }

  async function corregirSeleccionados() {
    if (seleccionadosArray.length === 0) return;

    if (
      !confirm(
        `¿Estás seguro de corregir las relaciones de los ${seleccionadosArray.length} registros seleccionados?`,
      )
    ) {
      return;
    }

    cargando = true;
    try {
      const res = await postData("app/herramientas/corregir", {
        coleccion: coleccionSeleccionada,
        ids: seleccionadosArray,
      });
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        await cargarDatos();
      } else {
        mensaje_error(res.mensaje || "Error al aplicar corrección masiva.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error al conectar con el servidor.");
    } finally {
      cargando = false;
    }
  }

  async function corregirColeccionCompleta() {
    if (
      !confirm(
        `¿Estás seguro de que deseas diagnosticar y corregir la colección completa de ${coleccionSeleccionada}? Esto procesará todos los registros por bloques de 100 y guardará un archivo de logs localmente.`,
      )
    ) {
      return;
    }

    cargando = true;
    try {
      const res = await postData("app/herramientas/corregir", {
        coleccion: coleccionSeleccionada,
        corregirTodo: true,
      });
      if (res.ok) {
        mensaje_bueno(res.mensaje);
        await cargarDatos();
      } else {
        mensaje_error(res.mensaje || "Error al corregir toda la colección.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error al conectar con el servidor.");
    } finally {
      cargando = false;
    }
  }
</script>

<svelte:head>
  <title>Corrección de Relaciones - Admin</title>
</svelte:head>

<!-- Overlay de carga -->
{#if cargando}
  <div class="overlay" transition:fade={{ duration: 150 }}></div>
  <div class="loader-container" transition:fade={{ duration: 150 }}>
    <div class="spinner"></div>
    <div class="cargando-texto">Analizando base de datos...</div>
  </div>
{/if}

<div class="vista-correccion">
  <!-- Cabecera -->
  <div class="header-herramientas">
    <div class="titulo-area">
      <i class="material-icons icon-main">build_circle</i>
      <div>
        <h2>Corrección de Relaciones en Base de Datos</h2>
        <p class="subtitulo">
          Diagnostica y migra los IDs de relación guardados como String a tipo
          ObjectId real de MongoDB.
        </p>
      </div>
    </div>
  </div>

  <!-- Selector y Acciones -->
  <div class="card card-filtros">
    <div class="row align-items-center">
      <div class="col-md-5">
        <label for="select-coleccion" class="form-label font-bold text-dark"
          >Colección o Modelo a evaluar:</label
        >
        <select
          id="select-coleccion"
          class="form-select custom-select"
          bind:value={coleccionSeleccionada}
          on:change={handleColeccionChange}
          disabled={cargando}
        >
          {#each colecciones as col}
            <option value={col.value}>{col.label}</option>
          {/each}
        </select>
      </div>
      <div class="col-md-7 text-md-end text-start mt-3 mt-md-0">
        <button
          class="btn btn-refresh me-2"
          on:click={cargarDatos}
          disabled={cargando}
        >
          <i class="material-icons vertical-align-middle">refresh</i>
          Actualizar
        </button>
        <button
          class="btn btn-masivo me-2"
          on:click={corregirSeleccionados}
          disabled={cargando || !puedeCorregirSeleccionados}
        >
          <i class="material-icons vertical-align-middle">check_circle</i>
          Corregir Seleccionados ({seleccionadosArray.length})
        </button>
        <button
          class="btn btn-todo"
          on:click={corregirColeccionCompleta}
          disabled={cargando}
        >
          <i class="material-icons vertical-align-middle">offline_bolt</i>
          Corregir Colección Completa (Lotes 100)
        </button>
      </div>
    </div>
  </div>

  <!-- Tabla de Resultados -->
  <div class="contenedor_ventana" class:blur-content={cargando}>
    {#if lista.length === 0}
      <div class="centrado py-5 text-muted">
        <i class="material-icons empty-icon">rule_folder</i>
        <p class="mt-2 text-large">
          No se encontraron documentos en esta colección.
        </p>
      </div>
    {:else}
      <div class="table-responsive">
        <table class="table table-custom align-middle">
          <thead>
            <tr>
              <th scope="col" class="th-checkbox text-center">
                <input
                  type="checkbox"
                  class="form-check-input"
                  checked={selectAll}
                  on:change={toggleSelectAll}
                  disabled={cargando}
                />
              </th>
              <th scope="col">Registro / Identificación</th>
              {#each relacionesColumnas as col}
                <th scope="col">{col.label}</th>
              {/each}
              <th scope="col" class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each lista as item (item._id)}
              <tr class:row-selected={seleccionados[item._id]}>
                <td class="text-center">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    bind:checked={seleccionados[item._id]}
                    disabled={cargando}
                  />
                </td>
                <td>
                  <div class="identificador-doc font-bold">
                    {item.identificador}
                  </div>
                  <div class="id-doc text-muted text-small">{item._id}</div>
                </td>

                {#each relacionesColumnas as col}
                  <td>
                    {#if item.relaciones[col.path].estado === "nulo"}
                      <span class="badge bg-nulo">Nulo / Opcional</span>
                    {:else}
                      <div class="relacion-info">
                        <div class="relacion-id text-small font-mono">
                          {item.relaciones[col.path].valor}
                        </div>
                        <div class="relacion-badges mt-1">
                          {#if item.relaciones[col.path].tipo === "String"}
                            <span class="badge bg-tipo-string text-dark"
                              >String</span
                            >
                          {:else if item.relaciones[col.path].tipo === "ObjectId"}
                            <span class="badge bg-tipo-objectid">ObjectId</span>
                          {/if}

                          {#if item.relaciones[col.path].existe}
                            <span class="badge bg-existe">
                              <i class="material-icons inline-icon">check</i> Existe
                            </span>
                          {:else}
                            <span class="badge bg-huerfano">
                              <i class="material-icons inline-icon">warning</i> Huérfano
                            </span>
                          {/if}
                        </div>
                      </div>
                    {/if}
                  </td>
                {/each}

                <td class="text-center">
                  {#if tieneCorreccionPendiente(item.relaciones)}
                    <button
                      class="btn btn-row-action"
                      on:click={() => corregirIndividual(item._id)}
                      disabled={cargando}
                    >
                      <i
                        class="material-icons text-medium vertical-align-middle"
                        >build</i
                      >
                      Corregir
                    </button>
                  {:else}
                    <span
                      class="text-success font-bold d-flex align-items-center justify-content-center"
                    >
                      <i class="material-icons text-medium me-1">verified</i> Correcto
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
  {#if totalDocumentos > 0}
    <div class="paginacion-area">
      <div class="info-paginacion">
        Mostrando bloques de <strong>{limite}</strong> registros. Total:
        <strong>{totalDocumentos}</strong> documentos.
      </div>
      <div class="controles-paginacion">
        <button
          class="btn btn-page"
          disabled={paginaActual === 1 || cargando}
          on:click={anterior}
        >
          <i class="material-icons">keyboard_arrow_left</i>
        </button>
        <span class="page-indicator"
          >Página <strong>{paginaActual}</strong> de
          <strong>{paginasTotales}</strong></span
        >
        <button
          class="btn btn-page"
          disabled={paginaActual === paginasTotales || cargando}
          on:click={siguiente}
        >
          <i class="material-icons">keyboard_arrow_right</i>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .vista-correccion {
    padding: 24px;
    font-family: inherit;
    color: #2c3e50;
    max-height: calc(100vh - 42px);
    overflow-y: auto;
  }

  .header-herramientas {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .titulo-area {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .icon-main {
    font-size: 42px;
    color: #1a5276;
    background: #ebf5fb;
    padding: 8px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(26, 82, 118, 0.1);
  }

  .header-herramientas h2 {
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

  .card-filtros {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
    margin-bottom: 20px;
  }

  .font-bold {
    font-weight: 600;
  }

  .custom-select {
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.95em;
    outline: none;
    transition: border-color 0.2s;
  }

  .custom-select:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
  }

  .btn {
    border-radius: 8px;
    font-weight: 500;
    padding: 10px 20px;
    font-size: 0.9em;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .btn-refresh {
    background-color: #f1f5f9;
    color: #475569;
  }

  .btn-refresh:hover {
    background-color: #e2e8f0;
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

  .btn-masivo:disabled {
    background: #cbd5e1;
    color: #94a3b8;
    box-shadow: none;
    cursor: not-allowed;
  }

  .btn-todo {
    background: linear-gradient(135deg, #d35400 0%, #e74c3c 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(211, 84, 0, 0.2);
  }

  .btn-todo:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(211, 84, 0, 0.3);
    transform: translateY(-1px);
  }

  .btn-todo:disabled {
    background: #cbd5e1;
    color: #94a3b8;
    box-shadow: none;
    cursor: not-allowed;
  }

  /* Tabla Estilo Glassmorphism */
  .contenedor_ventana {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
    margin: 0;
    max-height: calc(100vh - 320px) !important;
    padding: 0;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03);
    overflow: hidden;
  }

  .blur-content {
    filter: blur(2px);
    pointer-events: none;
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
    background-color: transparent;
  }

  .row-selected td {
    background-color: rgba(52, 152, 219, 0.04) !important;
  }

  .th-checkbox {
    width: 50px;
  }

  .form-check-input {
    width: 18px;
    height: 18px;
    border: 1.5px solid #cbd5e1;
    border-radius: 4px;
    cursor: pointer;
  }

  .identificador-doc {
    color: #1e293b;
    font-size: 1.05em;
  }

  .font-mono {
    font-family: "Cutive Mono", monospace, Courier;
  }

  .text-small {
    font-size: 0.8em;
  }

  .text-large {
    font-size: 1.15em;
  }

  .badge {
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 0.75em;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .bg-nulo {
    background-color: #f1f5f9;
    color: #64748b;
    font-weight: normal;
  }

  .bg-tipo-string {
    background-color: #fef9c3;
    color: #713f12;
    border: 1px solid #fef08a;
  }

  .bg-tipo-objectid {
    background-color: #dcfce7;
    color: #14532d;
    border: 1px solid #bbf7d0;
  }

  .bg-existe {
    background-color: #e0f2fe;
    color: #0369a1;
  }

  .bg-huerfano {
    background-color: #fee2e2;
    color: #b91c1c;
  }

  .inline-icon {
    font-size: 13px !important;
  }

  .btn-row-action {
    background-color: #ebf5fb;
    color: #2980b9;
    padding: 6px 12px;
    font-size: 0.8em;
    border-radius: 6px;
  }

  .btn-row-action:hover:not(:disabled) {
    background-color: #2980b9;
    color: white;
  }

  .text-medium {
    font-size: 16px !important;
  }

  /* Paginación */
  .paginacion-area {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
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

  .page-indicator {
    font-size: 0.9em;
    color: #334155;
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

  .cargando-texto {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.95em;
  }

  .empty-icon {
    font-size: 56px !important;
    color: #cbd5e1;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .vertical-align-middle {
    vertical-align: middle;
  }
</style>
