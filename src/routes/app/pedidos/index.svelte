<script>
  import AvisoFoliosNoDisponibles from "./_listas/Aviso_folios_no_disponibles.svelte";
  import { Textfield, Button, Dialog } from "svelte-mui/src";
  import { onMount, onDestroy } from "svelte";
  import {
    pedidos,
    pedidos_cancelados,
    postData,
    pedidos_historicos,
    buscadores,
    usuario_db,
    mensaje_bueno,
    mensaje_error,
  } from "./../../stores";
  import Lista from "./_listas/Lista.svelte";
  //import Lista_cancelados from "./_listas/Lista_cancelados.svelte";
  //import Lista_historicos from "./_listas/Lista_historicos.svelte";
  import PDFvisor from "./PDFvisor2.svelte";
  import { goto } from "@sapper/app";
  import { fade } from "svelte/transition";
  import { visible_ventana_de_detalles } from "./_listas/store_folios_que_ya_no_existen";

  var cargando = true;
  var pedido_seleccionado = null;
  var viendo = "Pendientes";
  let visible_tipo_pedidos_visible = false;
  var estado_actual = "viendo listas";
  var buscando = "";
  var buscando_mandar = "";
  var pagina_actual = 1;
  var url_consulta = "app/pedidos/lista_de_pedidos";
  var ejecutar_consulta = false;
  var sugerencia_visible = false;

  let ejecutando_backfill = false;
  let completado_backfill = false;
  let visible_modal_backfill = false;
  let total_pedidos_backfill = 0;
  let pedidos_procesados_backfill = 0;
  let folio_actual_backfill = "";
  let cliente_actual_backfill = "";
  let apartados_actualizados_backfill = 0;
  let apartados_huerfanos_backfill = 0;
  let folios_poblados_backfill = 0;
  let folio_siguiente_backfill = 0;
  let fase_actual_backfill = "Conectando...";
  let logs_progreso = [];

  let interval_polling_backfill = null;
  let log_container_elem = null;

  $: porcentaje_backfill = total_pedidos_backfill > 0 ? Math.min(100, Math.round((pedidos_procesados_backfill / total_pedidos_backfill) * 100)) : 0;

  function detener_polling() {
    if (interval_polling_backfill) {
      clearInterval(interval_polling_backfill);
      interval_polling_backfill = null;
    }
  }

  onDestroy(() => {
    detener_polling();
  });

  async function consultar_estado_backfill() {
    try {
      const res = await fetch("/scripts_a/backfill_transicion_pedidos?accion=estado");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok || !data.estado) return;

      const estado = data.estado;
      total_pedidos_backfill = estado.total_pedidos || 0;
      pedidos_procesados_backfill = estado.pedidos_procesados || 0;
      folio_actual_backfill = estado.folio_actual || "";
      cliente_actual_backfill = estado.cliente_actual || "";
      apartados_actualizados_backfill = estado.apartados_actualizados || 0;
      apartados_huerfanos_backfill = estado.apartados_huerfanos_limpiados || 0;
      folios_poblados_backfill = estado.folios_poblados || 0;
      folio_siguiente_backfill = estado.folio_siguiente_configurado || 0;
      if (Array.isArray(estado.logs)) {
        logs_progreso = estado.logs;
      }

      if (estado.ejecutando) {
        ejecutando_backfill = true;
        if (total_pedidos_backfill > 0) {
          fase_actual_backfill = `Procesando pedido [${pedidos_procesados_backfill}/${total_pedidos_backfill}] Folio #${folio_actual_backfill} (${cliente_actual_backfill})`;
        } else {
          fase_actual_backfill = "Analizando pedidos activos...";
        }
      } else if (estado.completado) {
        ejecutando_backfill = false;
        completado_backfill = true;
        fase_actual_backfill = "Proceso completado exitosamente.";
        detener_polling();
        mensaje_bueno("Actualización de apartados completada exitosamente.");
        ejecutar_consulta = true;
      } else if (estado.error) {
        ejecutando_backfill = false;
        fase_actual_backfill = "Error: " + estado.error;
        detener_polling();
        mensaje_error("Error en proceso: " + estado.error);
      }

      if (log_container_elem) {
        setTimeout(() => {
          log_container_elem.scrollTop = log_container_elem.scrollHeight;
        }, 50);
      }
    } catch (err) {
      console.error("Error consultando estado de backfill:", err);
    }
  }

  async function ejecutar_backfill_apartados() {
    if (ejecutando_backfill) return;
    detener_polling();

    ejecutando_backfill = true;
    completado_backfill = false;
    visible_modal_backfill = true;
    total_pedidos_backfill = 0;
    pedidos_procesados_backfill = 0;
    folio_actual_backfill = "";
    cliente_actual_backfill = "";
    apartados_actualizados_backfill = 0;
    apartados_huerfanos_backfill = 0;
    folios_poblados_backfill = 0;
    folio_siguiente_backfill = 0;
    fase_actual_backfill = "Iniciando proceso en el servidor...";
    logs_progreso = ["Conectando con el servidor..."];

    try {
      const response = await fetch("/scripts_a/backfill_transicion_pedidos?accion=iniciar");
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.mensaje || "Error al iniciar el proceso");
      }

      consultar_estado_backfill();
      interval_polling_backfill = setInterval(consultar_estado_backfill, 500);
    } catch (err) {
      ejecutando_backfill = false;
      fase_actual_backfill = "Error al iniciar: " + err.message;
      mensaje_error("Error de conexión al actualizar apartados: " + err.message);
    }
  }

  onMount(() => {
    buscando = $buscadores.pedidos;
    // if ($clientes.lista.length > 0) return;
    //obtener_lista();
  });

  $: if (buscando.length) {
    $buscadores.pedidos = buscando;
  }

  function obtener_pendientes(params) {
    url_consulta = "app/pedidos/lista_de_pedidos";
    ejecutar_consulta = true;
  }

  function obtener_cancelados(params) {
    url_consulta = "app/pedidos/lista_de_pedidos_cancelados";
    ejecutar_consulta = true;
  }

  function obtener_historicos(params) {
    url_consulta = "app/pedidos/lista_de_pedidos_historicos";
    ejecutar_consulta = true;
  }

  function editar_pedido() {
    estado_actual = "editando pedido";
  }

  function handleKeydown(evt) {
    if (evt.key == "+") {
      evt.preventDefault();
      estado_actual = "creando pedido";
      goto("/app/pedidos/nuevo/nuevo");
      return;
    }
    if (evt.key == "Escape") {
      //  estado_actual = "viendo listas"
    }
  }

  function handle_buscar(evt) {
    if (evt.key === "Enter") {
      buscando_mandar = buscando;
    }
  }

  function cerrar_dialogo_de_Folios() {
    $visible_ventana_de_detalles = false;
  }
</script>

<svelte:head>
  <title>Pedidos</title>
</svelte:head>
<svelte:window on:keydown={handleKeydown} />
<!-- Barra de herramientas -->

<div class="centrado herramientas">
  {#if estado_actual == "viendo listas"}
    <!-- Buscando -->
    <div class="centrado">
      <table style="width: 96%;">
        <tr>
          <td>
            <table style=" margin-left: 20px;width:250px;">
              <tr>
                <td>
                  <Textfield
                    placeholder="Buscar"
                    on:keyup={handle_buscar}
                    bind:value={buscando}
                  />
                </td>
                <td>
                  <i class="material-icons">search</i>
                </td>
                <td>
                  <Button
                    on:click={() => {
                      visible_tipo_pedidos_visible = true;
                    }}
                    icon
                  >
                    <i class="material-icons">settings</i>
                  </Button>
                </td>
              </tr>
            </table>
          </td>
          <!-- Titulo -->
          <td style="width: 72%;padding: 0 0 0px 0%;">
            <h3 class="titulo_formulario">
              Pedidos {viendo}

              {#if viendo === "Enviados"}
                <!-- content here -->
                <i class="material-icons">flight_land</i>
              {:else if viendo === "Pendientes"}
                <i style="" class="material-icons icono_titulo">shopping_cart</i
                >
              {:else if viendo === "Cancelados"}
                <i style="" class="material-icons icono_titulo">backspace</i>
              {/if}
            </h3>
          </td>
          <td style="white-space: nowrap;">
            {#if $usuario_db && ($usuario_db.usuario === "isotech" || $usuario_db.nombre === "Soporte Isotech" || ($usuario_db.usuario && $usuario_db.usuario.includes("isotech")))}
              <Button
                on:click={ejecutar_backfill_apartados}
                disabled={ejecutando_backfill}
                raised
                color="secondary"
                title="Corregir datos de productos apartados (Script de transición)"
                style="margin-right: 10px;"
              >
                <i class="material-icons">build</i>
                {ejecutando_backfill ? "Corrigiendo..." : "Corregir Apartados"}
              </Button>
            {/if}
            Nuevo Pedido
            <Button
              on:click={() => {
                estado_actual = "creando pedido";
                goto("/app/pedidos/nuevo/nuevo");
              }}
              icon
              raised
              outlined
              title="crear pedido nuevo (+)"
            >
              <i class="material-icons">add</i>
            </Button>
          </td>
        </tr>
      </table>
    </div>
  {:else if estado_actual == "creando pedido"}
    <!-- else content here -->
    <div class="izquierda" style="padding-left: 5px;">
      <table>
        <tr>
          <td>
            <Button
              on:click={() => {
                estado_actual = "viendo listas";
              }}
              raised
              outlined
              title="ver lista"
            >
              <i class="material-icons">arrow_back</i>
              Ver lista
            </Button>
          </td>
          <td class="centrado titulo_formulario" style="width: 63vw;">
            Pedido Nuevo
          </td>
        </tr>
      </table>
    </div>
  {/if}
</div>

<!-- content here -->
{#if estado_actual === "viendo listas"}
  <!-- content here -->

  <div in:fade={{ duration: 300 }}>
    <Lista
      bind:pagina_actual
      bind:buscando={buscando_mandar}
      on:editar_pedido={editar_pedido}
      bind:cargando
      bind:ejecutar_consulta
      bind:viendo
      bind:url_consulta
      on:ver_un_pdf={(evt) => {
        estado_actual = "ver_un_pdf";
        pedido_seleccionado = evt.detail.pedido;
      }}
    />
  </div>
  <!-- content here -->
{:else if estado_actual === "ver_un_pdf"}
  <PDFvisor
    on:mostrar_lista={() => {
      estado_actual = "viendo listas";
    }}
    bind:pedido={pedido_seleccionado}
  />
{/if}

<Dialog width="480" bind:visible={$visible_ventana_de_detalles}>
  <div class="centrado">Folios faltantes</div>
  <div class="contendio">
    <AvisoFoliosNoDisponibles />
  </div>

  {#if sugerencia_visible == true}
    <div class="sugerencia">
      <span class="indice">a)</span> Editar el pedido, <strong>cambiar</strong>
      el folio por algun otro que si exista <br />
      <span class="indice">b)</span>Editar el pedido, <strong>borrar</strong>
      los/el folio(s) que se muestran arriba. <br />
    </div>
  {/if}
  <div slot="actions" class="actions centrado footer-dolios-dialogo">
    <Button on:click={() => (sugerencia_visible = true)}>Sugerencia</Button>
    <Button color="primary" raised on:click={cerrar_dialogo_de_Folios}>
      Ok</Button
    >
  </div>
  <div slot="footer" class="footer" />
</Dialog>

<Dialog width="480" bind:visible={visible_tipo_pedidos_visible}>
  <div class="centrado">Opciones de vista</div>

  <table>
    <tr>
      <td>
        <Button
          on:click={() => {
            pagina_actual = 1;
            viendo = "Pendientes";
            obtener_pendientes();
          }}
        >
          <i class="material-icons">timer</i>
          Pendientes
        </Button>
      </td>
      <td>
        <Button
          on:click={() => {
            pagina_actual = 1;
            viendo = "Enviados";
            obtener_historicos();
          }}
        >
          <i class="material-icons">flight_land</i>
          Enviados
        </Button>
      </td>
      <td>
        <Button
          on:click={() => {
            pagina_actual = 1;
            viendo = "Cancelados";
            if ($pedidos_cancelados.lista.length > 0) {
              cargando = false;
              return;
            }
            obtener_cancelados();
          }}
        >
          <i class="material-icons">flight_land</i>
          Cancelados
        </Button>
      </td>
    </tr>
  </table>

  <div slot="actions" class="actions center" />

  <div slot="footer" class="footer" />
</Dialog>

<Dialog width="580" bind:visible={visible_modal_backfill}>
  <div class="centrado" style="font-weight: bold; font-size: 1.15em; padding: 12px; border-bottom: 1px solid #eee;">
    {#if ejecutando_backfill}
      <i class="material-icons spinning" style="vertical-align: middle; color: #2196f3; margin-right: 8px;">sync</i>
      Actualizando Productos y Pedidos en Vivo
    {:else if completado_backfill}
      <i class="material-icons" style="vertical-align: middle; color: #4caf50; margin-right: 8px;">check_circle</i>
      Proceso de Actualización Completado
    {:else}
      <i class="material-icons" style="vertical-align: middle; color: #ff9800; margin-right: 8px;">build</i>
      Proceso de Corrección de Apartados
    {/if}
  </div>

  <div style="padding: 18px; font-size: 0.95em;">
    <!-- Resumen de Totales -->
    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px 16px; margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #495057; font-weight: 600;">Total de Pedidos a Procesar:</span>
        <span style="font-weight: 700; color: #1976d2; font-size: 1.1em;">{total_pedidos_backfill}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #495057; font-weight: 600;">Pedidos Procesados:</span>
        <span style="font-weight: 700; color: #2e7d32; font-size: 1.1em;">{pedidos_procesados_backfill} de {total_pedidos_backfill}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #495057; font-weight: 600;">Apartados Corregidos:</span>
        <span style="font-weight: 700; color: #ed6c02; font-size: 1.1em;">{apartados_actualizados_backfill}</span>
      </div>
    </div>

    <!-- Barra de Progreso Visual -->
    <div style="margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between; font-size: 0.85em; color: #666; margin-bottom: 4px;">
        <span><strong>Estado:</strong> {fase_actual_backfill}</span>
        <span><strong>{porcentaje_backfill}%</strong></span>
      </div>
      <div style="width: 100%; background-color: #e0e0e0; border-radius: 6px; height: 12px; overflow: hidden;">
        <div style="width: {porcentaje_backfill}%; background-color: {completado_backfill ? '#4caf50' : '#2196f3'}; height: 100%; transition: width 0.3s ease;"></div>
      </div>
    </div>

    <!-- Bitácora de actualización -->
    <div style="font-weight: 600; font-size: 0.85em; color: #555; margin-bottom: 6px;">
      Bitácora de actualización de productos:
    </div>
    <div bind:this={log_container_elem} style="background-color: #1e1e1e; color: #d4d4d4; font-family: monospace; font-size: 0.82em; height: 140px; overflow-y: auto; padding: 10px; border-radius: 6px; line-height: 1.4;">
      {#if logs_progreso.length === 0}
        <span style="color: #888;">Esperando inicio del script...</span>
      {:else}
        {#each logs_progreso as log_line}
          <div style="margin-bottom: 3px;">
            <span style="color: #4ec9b0;">❯</span> {log_line}
          </div>
        {/each}
      {/if}
    </div>

    {#if completado_backfill}
      <div style="margin-top: 15px; padding: 10px; background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 6px; font-size: 0.88em; color: #1b5e20;">
        <strong>Resultados Finales:</strong>
        <ul style="margin: 5px 0 0 0; padding-left: 20px;">
          <li>Apartados huérfanos limpiados: {apartados_huerfanos_backfill}</li>
          <li>Folios poblados en colección: {folios_poblados_backfill}</li>
          <li>Siguiente folio automático: #{folio_siguiente_backfill}</li>
        </ul>
      </div>
    {/if}
  </div>

  <div slot="actions" class="actions centrado" style="padding: 10px; border-top: 1px solid #eee;">
    <Button
      color="primary"
      raised
      disabled={ejecutando_backfill}
      on:click={() => (visible_modal_backfill = false)}
    >
      {ejecutando_backfill ? 'Actualizando...' : 'Cerrar'}
    </Button>
  </div>
</Dialog>

<style>
  .icono_titulo {
    vertical-align: middle;
    font-size: 0.85em;
  }

  .footer-dolios-dialogo {
    justify-content: space-between;
  }

  .sugerencia {
    color: green;
  }
  .indice {
    font-size: 9px;
    color: black;
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
