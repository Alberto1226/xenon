<script>
  import { onMount, onDestroy } from "svelte";
  import { postData, mensaje_bueno, mensaje_error } from "./../../../stores";
  import { Button, Dialog } from "svelte-mui/src";
  import { fade } from "svelte/transition";

  let cargando = false;
  let error_mensaje = "";
  let visible_modal_progreso = false;
  let interval_polling = null;

  // Configuración de prueba
  let cantidad_pedidos = 1000;
  let tamano_concurrencia = 50;
  let modo_seleccionado = "qa_completo"; // 'rapido' o 'qa_completo'

  // Estado global de prueba
  let estado = {
    ejecutando: false,
    modo: 'qa_completo',
    fase: 'idle',
    total_pedidos: 1000,
    pedidos_creados: 0,
    pedidos_enviados: 0,
    pedidos_entregados: 0,
    pedidos_cancelados: 0,
    pedidos_editados: 0,
    rechazos_stock_insuficiente: 0,
    apartados_huerfanos_detectados: 0,
    snaplogs_generados: 0,
    logs_generados: 0,
    cuadre_financiero_ok: true,
    diferencias_financieras: 0,
    folios_secuenciales_ok: true,
    huecos_folios_detectados: 0,
    duracion_segundos: 0,
    archivo_reporte: null,
    nombre_archivo: null,
    error: null,
    logs: []
  };

  let log_box_element;

  onMount(() => {
    consultar_estado();
  });

  onDestroy(() => {
    detener_polling();
  });

  async function consultar_estado() {
    try {
      const data = await postData("app/dev_tools/sobrecarga/ejecutar_sobrecarga", { accion: "estado" });
      if (data && data.ok && data.estado) {
        estado = data.estado;
        if (estado.ejecutando) {
          visible_modal_progreso = true;
          iniciar_polling();
        } else if (estado.fase === 'completado' || estado.fase === 'error') {
          detener_polling();
        }
      }
    } catch (err) {
      console.error("Error al consultar estado de sobrecarga:", err);
    }
  }

  function iniciar_polling() {
    if (interval_polling) return;
    interval_polling = setInterval(() => {
      consultar_estado();
    }, 1200);
  }

  function detener_polling() {
    if (interval_polling) {
      clearInterval(interval_polling);
      interval_polling = null;
    }
  }

  let visible_modal_password = false;
  let password_ingresado = "";
  let error_password = "";
  let es_local = true;

  onMount(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      es_local = (host === "localhost" || host === "127.0.0.1");
    }
    consultar_estado();
  });

  function solicitar_password_e_iniciar() {
    if (!es_local) {
      mensaje_error("La herramienta de pruebas de sobrecarga solo está habilitada en entorno local.");
      return;
    }
    if (isNaN(cantidad_pedidos) || cantidad_pedidos <= 0) {
      mensaje_error("Ingresa una cantidad válida de pedidos (mínimo 1).");
      return;
    }
    password_ingresado = "";
    error_password = "";
    visible_modal_password = true;
  }

  async function confirmar_e_iniciar_prueba() {
    if (!password_ingresado || password_ingresado.trim().length === 0) {
      error_password = "La contraseña es requerida";
      return;
    }

    cargando = true;
    error_password = "";

    try {
      const data = await postData("app/dev_tools/sobrecarga/ejecutar_sobrecarga", {
        accion: "iniciar",
        cantidad: cantidad_pedidos,
        concurrencia: tamano_concurrencia,
        modo: modo_seleccionado,
        password: password_ingresado
      });

      if (data && data.ok) {
        mensaje_bueno(`Prueba QA de sobrecarga (${modo_seleccionado}) autorizada e iniciada exitosamente.`);
        visible_modal_password = false;
        visible_modal_progreso = true;
        iniciar_polling();
      } else {
        error_password = (data && data.mensaje) ? data.mensaje : "Error al autorizar o iniciar la prueba.";
        mensaje_error(error_password);
      }
    } catch (err) {
      error_password = "Error de conexión: " + err.message;
      mensaje_error(error_password);
    } finally {
      cargando = false;
    }
  }

  function descargar_reporte() {
    if (!estado.nombre_archivo) return;
    const url = `/app/dev_tools/sobrecarga/ejecutar_sobrecarga?accion=descargar_reporte&archivo=${encodeURIComponent(estado.nombre_archivo)}`;
    window.open(url, "_blank");
  }

  $: porcentaje_progreso = (() => {
    if (!estado || !estado.total_pedidos) return 0;
    if (estado.fase === 'creando') {
      return Math.round((estado.pedidos_creados / estado.total_pedidos) * 25);
    } else if (estado.fase === 'procesando_flujo_qa') {
      return 25 + Math.round((estado.pedidos_cancelados / (estado.total_pedidos * 0.15 || 1)) * 25);
    } else if (estado.fase === 'transicionando_envio') {
      return 50 + Math.round((estado.pedidos_enviados / estado.total_pedidos) * 25);
    } else if (estado.fase === 'transicionando_entregado') {
      return 75 + Math.round((estado.pedidos_entregados / estado.total_pedidos) * 20);
    } else if (estado.fase === 'auditoria') {
      return 95;
    } else if (estado.fase === 'completado') {
      return 100;
    }
    return 0;
  })();

  $: if (visible_modal_progreso && log_box_element && estado.logs) {
    setTimeout(() => {
      if (log_box_element) log_box_element.scrollTop = log_box_element.scrollHeight;
    }, 50);
  }
</script>

<svelte:head>
  <title>Dev Tools - Suite de Pruebas QA y Sobrecarga</title>
</svelte:head>

<div class="contenedor-principal" in:fade={{ duration: 150 }}>
  <!-- Encabezado superior -->
  <div class="header-dev-tools">
    <div class="titulo-area">
      <div class="badge-dev">DEV TOOLS / QA SUITE</div>
      <h1>Suite de Pruebas QA y Sobrecarga de Ventas</h1>
      <p class="descripcion">
        Simula el comportamiento real de ventas con transiciones paralelas simultáneas, cancelaciones, ediciones en caliente, auditoría contable de totales y verificación de folios continuos.
      </p>
    </div>

    <div class="acciones-top">
      <button class="btn-secundario" on:click={consultar_estado} disabled={estado.ejecutando}>
        <i class="material-icons {estado.ejecutando ? 'spinning' : ''}">refresh</i>
        Actualizar Estado
      </button>
    </div>
  </div>

  <!-- Panel de Configuración e Inicio -->
  <div class="card-configuracion">
    <div class="titulo-config">
      <i class="material-icons icono-flame">tune</i>
      <h2>Configuración de la Suite de Pruebas</h2>
    </div>

    <div class="grid-config">
      <div class="campo-config">
        <label for="select-modo">Modo de Prueba:</label>
        <select id="select-modo" bind:value={modo_seleccionado} disabled={estado.ejecutando}>
          <option value="qa_completo">✨ Modo QA Completo (Flujo Real con Cancelaciones y Aud. Contable)</option>
          <option value="rapido">⚡ Modo Rápido (Transición Directa a Envío y Entregado)</option>
        </select>
        <span class="subtexto-campo">QA Completo simula cancelaciones 15%, ediciones 5% y audita folios.</span>
      </div>

      <div class="campo-config">
        <label for="input-pedidos">Cantidad de Pedidos:</label>
        <input
          id="input-pedidos"
          type="number"
          min="10"
          max="5000"
          bind:value={cantidad_pedidos}
          disabled={estado.ejecutando}
        />
        <span class="subtexto-campo">Se elegirán productos y clientes aleatorios.</span>
      </div>

      <div class="campo-config">
        <label for="input-concurrencia">Peticiones Simultáneas (Ráfaga):</label>
        <input
          id="input-concurrencia"
          type="number"
          min="5"
          max="200"
          bind:value={tamano_concurrencia}
          disabled={estado.ejecutando}
        />
        <span class="subtexto-campo">Concurrencia en paralelo (Promise.all).</span>
      </div>

      <div class="campo-boton">
        <button
          class="btn-ejecutar-prueba"
          on:click={solicitar_password_e_iniciar}
          disabled={estado.ejecutando || cargando}
        >
          <i class="material-icons">play_circle_filled</i>
          {estado.ejecutando ? 'Prueba QA en Curso...' : 'Ejecutar Suite QA de Sobrecarga'}
        </button>
      </div>
    </div>
  </div>

  <!-- Métricas y Resultados del Último Test -->
  <div class="grid-metricas">
    <div class="card-metrica">
      <div class="icono-metrica info">
        <i class="material-icons">settings_backup_restore</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">
          {#if estado.fase === 'idle'}Idle
          {:else if estado.fase === 'creando'}Creando Pedidos
          {:else if estado.fase === 'procesando_flujo_qa'}Flujo QA (Cancelaciones/Ediciones)
          {:else if estado.fase === 'transicionando_envio'}Envío Concurrente
          {:else if estado.fase === 'transicionando_entregado'}Entregado Concurrente
          {:else if estado.fase === 'auditoria'}Auditoría QA
          {:else if estado.fase === 'completado'}Completado ({estado.duracion_segundos}s)
          {:else if estado.fase === 'error'}Error
          {/if}
        </span>
        <span class="etiqueta">Estado de la Prueba ({estado.modo ? estado.modo.toUpperCase() : 'QA'})</span>
      </div>
    </div>

    <div class="card-metrica">
      <div class="icono-metrica warning">
        <i class="material-icons">shopping_cart</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{estado.pedidos_creados} / {estado.total_pedidos}</span>
        <span class="etiqueta">Pedidos Generados</span>
      </div>
    </div>

    <div class="card-metrica">
      <div class="icono-metrica danger">
        <i class="material-icons">cancel</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{estado.pedidos_cancelados}</span>
        <span class="etiqueta">Pedidos Cancelados (15% QA)</span>
      </div>
    </div>

    <div class="card-metrica">
      <div class="icono-metrica {estado.cuadre_financiero_ok ? 'success' : 'danger'}">
        <i class="material-icons">{estado.cuadre_financiero_ok ? 'paid' : 'money_off'}</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{estado.cuadre_financiero_ok ? '100% OK' : `${estado.diferencias_financieras} Dif.`}</span>
        <span class="etiqueta">Cuadre Financiero (Totales)</span>
      </div>
    </div>

    <div class="card-metrica">
      <div class="icono-metrica {estado.folios_secuenciales_ok ? 'success' : 'warning'}">
        <i class="material-icons">{estado.folios_secuenciales_ok ? 'tag' : 'numbers'}</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{estado.folios_secuenciales_ok ? '0 Huecos' : `${estado.huecos_folios_detectados} Huecos`}</span>
        <span class="etiqueta">Secuencia de Folios (Sin Saltos)</span>
      </div>
    </div>

    <div class="card-metrica">
      <div class="icono-metrica {estado.apartados_huerfanos_detectados === 0 ? 'success' : 'danger'}">
        <i class="material-icons">{estado.apartados_huerfanos_detectados === 0 ? 'verified' : 'report_problem'}</i>
      </div>
      <div class="datos-metrica">
        <span class="valor">{estado.apartados_huerfanos_detectados}</span>
        <span class="etiqueta">Huérfanos Detectados (Esperado: 0)</span>
      </div>
    </div>
  </div>

  {#if estado.nombre_archivo}
    <div class="banner-descarga-reporte" in:fade>
      <div class="info-reporte">
        <i class="material-icons icono-doc">description</i>
        <div>
          <div class="titulo-rep">Reporte QA de Prueba Generado Exitosamente</div>
          <div class="sub-rep">Archivo: <code>{estado.nombre_archivo}</code></div>
        </div>
      </div>
      <button class="btn-descargar" on:click={descargar_reporte}>
        <i class="material-icons">download</i>
        Descargar Reporte Completo (.txt)
      </button>
    </div>
  {/if}
</div>

<!-- Modal de Autenticación por Contraseña para Soporte Isotech -->
<Dialog width="480" bind:visible={visible_modal_password}>
  <div class="dialogo-header">
    <div class="header-modal-titulo">
      <i class="material-icons icono-lock">lock</i>
      <h3>Confirmación de Seguridad - Soporte Isotech</h3>
    </div>
  </div>

  <div class="dialogo-body">
    <p class="instruccion-pwd">
      Para ejecutar la <b>Suite QA de Sobrecarga ({modo_seleccionado.toUpperCase()})</b> con <b>{cantidad_pedidos} pedidos</b> y ráfagas de <b>{tamano_concurrencia} simultáneas</b>, ingrese la contraseña del usuario <b>Soporte Isotech</b>:
    </p>

    <form on:submit|preventDefault={confirmar_e_iniciar_prueba}>
      <div class="campo-pwd">
        <label for="pwd-input">Contraseña de Soporte Isotech:</label>
        <input
          id="pwd-input"
          type="password"
          placeholder="Introduce la contraseña..."
          bind:value={password_ingresado}
          disabled={cargando}
          required
        />
      </div>

      {#if error_password}
        <div class="alerta-error-modal">
          <i class="material-icons">error</i>
          <span>{error_password}</span>
        </div>
      {/if}

      <div class="acciones-modal-pwd">
        <button
          type="button"
          class="btn-secundario"
          on:click={() => { visible_modal_password = false; password_ingresado = ''; error_password = ''; }}
          disabled={cargando}
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="btn-ejecutar-prueba"
          disabled={cargando || !password_ingresado}
        >
          {cargando ? 'Verificando...' : 'Confirmar e Iniciar Sobrecarga'}
        </button>
      </div>
    </form>
  </div>
</Dialog>

<!-- Modal Interactivo de Progreso en Tiempo Real -->
<Dialog width="720" bind:visible={visible_modal_progreso}>
  <div class="dialogo-header">
    <div class="header-modal-titulo">
      <i class="material-icons {estado.ejecutando ? 'spinning' : ''}">
        {estado.fase === 'completado' ? 'task_alt' : (estado.fase === 'error' ? 'error' : 'play_circle_filled')}
      </i>
      <h3>
        {#if estado.ejecutando}Ejecutando Suite QA ({porcentaje_progreso}%)
        {:else if estado.fase === 'completado'}¡Prueba QA Finalizada Exitosamente!
        {:else if estado.fase === 'error'}Error en la Prueba QA
        {:else}Estado de la Prueba QA
        {/if}
      </h3>
    </div>
  </div>

  <div class="dialogo-body">
    <!-- Barra de progreso porcentual -->
    <div class="contenedor-barra">
      <div class="barra-relleno" style="width: {porcentaje_progreso}%"></div>
    </div>

    <div class="grid-resumen-modal">
      <div class="item-resumen-m">
        <span class="etiqueta-m">Creados:</span>
        <span class="valor-m">{estado.pedidos_creados} / {estado.total_pedidos}</span>
      </div>
      <div class="item-resumen-m">
        <span class="etiqueta-m">Cancelados:</span>
        <span class="valor-m rojo">{estado.pedidos_cancelados}</span>
      </div>
      <div class="item-resumen-m">
        <span class="etiqueta-m">Entregados:</span>
        <span class="valor-m verde">{estado.pedidos_entregados}</span>
      </div>
      <div class="item-resumen-m">
        <span class="etiqueta-m">Huérfanos:</span>
        <span class="valor-m {estado.apartados_huerfanos_detectados === 0 ? 'verde' : 'rojo'}">
          {estado.apartados_huerfanos_detectados}
        </span>
      </div>
    </div>

    <!-- Consola de Logs en Tiempo Real -->
    <div class="consola-logs" bind:this={log_box_element}>
      {#each estado.logs as linea_log}
        <div class="linea-log">{linea_log}</div>
      {/each}
    </div>

    {#if estado.error}
      <div class="alerta-error-modal">
        <i class="material-icons">error_outline</i>
        <span>{estado.error}</span>
      </div>
    {/if}
  </div>

  <div slot="actions" class="dialogo-actions">
    {#if estado.nombre_archivo}
      <Button color="primary" raised on:click={descargar_reporte}>
        <i class="material-icons icono-btn">download</i> Descargar Reporte (.txt)
      </Button>
    {/if}

    <Button on:click={() => (visible_modal_progreso = false)}>
      {estado.ejecutando ? 'Cerrar ventana (Sigue ejecutando)' : 'Cerrar'}
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
  }

  .card-configuracion {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .titulo-config {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .icono-flame {
    color: #dd6b20;
    font-size: 24px;
  }

  .titulo-config h2 {
    margin: 0;
    font-size: 1.2em;
    color: #2d3748;
  }

  .grid-config {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    align-items: flex-end;
  }

  .campo-config {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .campo-config label {
    font-size: 0.88em;
    font-weight: 600;
    color: #4a5568;
  }

  .campo-config input, .campo-config select {
    padding: 8px 12px;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    font-size: 0.95em;
    outline: none;
    background: white;
  }

  .subtexto-campo {
    font-size: 0.78em;
    color: #a0aec0;
  }

  .btn-ejecutar-prueba {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #3182ce;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 0.95em;
    font-weight: 700;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
  }

  .btn-ejecutar-prueba:hover:not(:disabled) {
    background: #2b6cb0;
  }

  .btn-ejecutar-prueba:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .grid-metricas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

  .icono-metrica.info { background: #ebf8ff; color: #3182ce; }
  .icono-metrica.warning { background: #feebc8; color: #dd6b20; }
  .icono-metrica.danger { background: #fed7d7; color: #e53e3e; }
  .icono-metrica.success { background: #c6f6d5; color: #276749; }

  .datos-metrica {
    display: flex;
    flex-direction: column;
  }

  .datos-metrica .valor {
    font-size: 1.35em;
    font-weight: 700;
    color: #2d3748;
  }

  .datos-metrica .etiqueta {
    font-size: 0.82em;
    color: #718096;
    font-weight: 500;
  }

  .banner-descarga-reporte {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    padding: 16px 24px;
    border-radius: 10px;
  }

  .info-reporte {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icono-doc {
    font-size: 32px;
    color: #276749;
  }

  .titulo-rep {
    font-weight: 700;
    color: #22543d;
  }

  .sub-rep {
    font-size: 0.85em;
    color: #2f855a;
  }

  .btn-descargar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #276749;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.88em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-descargar:hover {
    background: #22543d;
  }

  .header-modal-titulo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-modal-titulo h3 {
    margin: 0;
    font-size: 1.15em;
    color: #2d3748;
  }

  .dialogo-body {
    padding: 20px;
  }

  .contenedor-barra {
    width: 100%;
    height: 10px;
    background: #edf2f7;
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .barra-relleno {
    height: 100%;
    background: #3182ce;
    transition: width 0.3s ease;
  }

  .grid-resumen-modal {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    background: #f7fafc;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 16px;
    text-align: center;
  }

  .etiqueta-m {
    font-size: 0.78em;
    color: #718096;
    display: block;
  }

  .valor-m {
    font-size: 0.95em;
    font-weight: 700;
    color: #2d3748;
  }

  .valor-m.verde { color: #38a169; }
  .valor-m.rojo { color: #e53e3e; }

  .consola-logs {
    background: #1e1e1e;
    color: #4af626;
    font-family: monospace;
    font-size: 0.82em;
    padding: 12px;
    border-radius: 6px;
    height: 260px;
    overflow-y: auto;
    line-height: 1.4;
  }

  .linea-log {
    white-space: pre-wrap;
    word-break: break-all;
  }

  .alerta-error-modal {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff5f5;
    color: #e53e3e;
    padding: 10px;
    border-radius: 6px;
    margin-top: 12px;
    font-size: 0.88em;
  }

  .dialogo-actions {
    padding: 12px 20px;
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

  .icono-btn {
    font-size: 18px;
  }

  .icono-lock {
    color: #e53e3e;
    font-size: 24px;
  }

  .instruccion-pwd {
    font-size: 0.9em;
    color: #4a5568;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .campo-pwd {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .campo-pwd label {
    font-size: 0.85em;
    font-weight: 600;
    color: #2d3748;
  }

  .campo-pwd input {
    padding: 10px 14px;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    font-size: 0.95em;
    outline: none;
    transition: border-color 0.2s;
  }

  .campo-pwd input:focus {
    border-color: #3182ce;
    box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
  }

  .acciones-modal-pwd {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
  }
</style>
