<script>
  import { usuario_db } from "../../../stores";
  import ModalMovimientos from "./_ModalMovimientos.svelte";
  import ModalProgreso from "./_ModalProgreso.svelte";
  import progresoCorreccion from "./_progreso";
  import { onMount } from "svelte";

  let folio = "";
  let resultado = null;
  let seleccion = [];
  let ocupado = false;
  let mensaje = "";
  let error = "";
  let productoMovimientos = null;
  let progreso = null;

  onMount(() => {
    function advertirSalida(evento) {
      if (progreso && progreso.enCurso) {
        evento.preventDefault();
        evento.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", advertirSalida);
    return () => window.removeEventListener("beforeunload", advertirSalida);
  });

  $: productosElegibles = resultado ? resultado.items.filter(item => item.elegible) : [];
  $: seleccionadosElegibles = productosElegibles.filter(item => seleccion.includes(item.producto_id));
  $: todosSeleccionados = productosElegibles.length > 0 && seleccionadosElegibles.length === productosElegibles.length;

  async function solicitar(accion, productos = [], folioSolicitud = folio, productoId = null) {
    const respuesta = await fetch("/app/dev_tools/salidas_duplicadas/operaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, folio: folioSolicitud, productos, producto_id: productoId })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudo completar la operación.");
    return datos;
  }

  async function consultar() {
    ocupado = true;
    error = "";
    mensaje = "";
    resultado = null;
    seleccion = [];
    try {
      resultado = await solicitar("consultar");
    } catch (e) {
      error = e.message;
    } finally {
      ocupado = false;
    }
  }

  async function corregir(elegidos) {
    const detalle = elegidos.map(item => `${item.nombre}: +${item.cantidad}`).join("\n");
    if (!window.confirm(`Se reincorporará una sola salida duplicada por producto del folio ${resultado.folio}:\n\n${detalle}\n\nConfirma que revisaste las salidas y que corresponden a descuentos duplicados.`)) return;
    ocupado = true;
    error = "";
    mensaje = "";
    const folioCorregido = resultado.folio;
    resultado = null;
    seleccion = [];
    progreso = { folio: folioCorregido, total: elegidos.length, completados: 0, actual: null, etapa: "Preparando corrección…", enCurso: true, error: "" };
    try {
      const avance = await progresoCorreccion.procesar(elegidos, async item => {
        const producto = {
          id: item.producto_id, cantidad: item.cantidad, stock: item.stock,
          salidas: item.salidas.map(salida => salida.id)
        };
        const datos = await solicitar("corregir", [producto], folioCorregido);
        if (!Array.isArray(datos.corregidos) || datos.corregidos.length !== 1 ||
            datos.corregidos[0].producto_id !== item.producto_id || datos.corregidos[0].cantidad !== item.cantidad) {
          throw new Error("La respuesta no confirma la corrección de este producto.");
        }
      }, actual => {
        progreso = { ...progreso, ...actual, etapa: "Preparando el siguiente producto…" };
      });
      if (avance.error) {
        progreso = { ...progreso, fallido: avance.fallido, error: avance.error.message || String(avance.error) };
      } else {
        mensaje = `Se corrigieron ${avance.completados} producto(s).`;
      }
    } catch (e) {
      progreso = { ...progreso, error: "No se pudo confirmar la operación: " + e.message };
    } finally {
      progreso = { ...progreso, actual: null, etapa: "Actualizando el estado del pedido…" };
      try {
        resultado = await solicitar("consultar", [], folioCorregido);
      } catch (e) {
        progreso = { ...progreso, error: (progreso.error ? progreso.error + " " : "") + "No se pudo actualizar el estado del pedido: " + e.message };
      }
      progreso = { ...progreso, enCurso: false };
      ocupado = false;
    }
  }

  async function recuperarAuditoria(item) {
    ocupado = true;
    error = "";
    mensaje = "";
    const folioActual = resultado.folio;
    try {
      const datos = await solicitar("recuperar_auditoria", [], folioActual, item.producto_id);
      mensaje = datos.mensaje;
    } catch (e) {
      error = "No se pudo recuperar el snaplog. No se modificaron existencias: " + e.message;
    } finally {
      try {
        resultado = await solicitar("consultar", [], folioActual);
        seleccion = seleccion.filter(id => resultado.items.some(item => item.producto_id === id && item.elegible));
      } catch (e) {
        resultado = null;
        seleccion = [];
        error = (error ? error + " " : "") + "No se pudo actualizar el estado: " + e.message;
      }
      ocupado = false;
    }
  }

  function fecha(valor) {
    return valor ? new Date(valor).toLocaleString("es-MX") : "Sin fecha";
  }

  function corregirSeleccionados() {
    if (seleccionadosElegibles.length) corregir(seleccionadosElegibles);
  }

  function seleccionarTodos(evento) {
    seleccion = evento.currentTarget.checked ? productosElegibles.map(item => item.producto_id) : [];
  }
</script>

{#if $usuario_db && $usuario_db.usuario === "isotech_Xenonymas" && $usuario_db.rol === "administrador"}
  <main class="herramienta" class:con-seleccion={seleccion.length > 0}>
    <header>
      <div>
        <p class="etiqueta">DEV TOOLS / INVENTARIO</p>
        <h1>Salidas duplicadas</h1>
        <p>Consulta un pedido y revisa sus movimientos antes de reincorporar existencias.</p>
      </div>
      <span class="insignia">CORRECCIÓN CONTROLADA</span>
    </header>

    <form class="consulta" on:submit|preventDefault={consultar}>
      <label for="folio">Folio del pedido</label>
      <div class="busqueda">
        <input id="folio" type="number" min="1" step="1" required bind:value={folio} disabled={ocupado} />
        <button type="submit" disabled={ocupado}>Consultar movimientos</button>
      </div>
    </form>

    <div class="aviso">
      <strong>Revisa antes de corregir.</strong> Dos registros similares no prueban por sí solos que ambos descuentos sean indebidos. Solo se habilitan productos con dos salidas verificables; los casos ambiguos requieren revisión manual. La corrección no modifica folios ni apartados.
    </div>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}

    {#if resultado}
      <section class="resultado">
        <div class="cabecera-resultado">
          <div><p class="etiqueta">PEDIDO</p><h2>#{resultado.folio} <span>{resultado.cliente || "Cliente sin nombre"}</span></h2></div>
          <div class="resumen-acciones">
            <label class="seleccionar-todos">
              <input type="checkbox" checked={todosSeleccionados} indeterminate={seleccionadosElegibles.length > 0 && !todosSeleccionados} on:change={seleccionarTodos} disabled={ocupado || !productosElegibles.length} />
              Seleccionar todos los corregibles
            </label>
            <span>{resultado.items.length} productos · {seleccionadosElegibles.length} seleccionado(s)</span>
            <button type="button" on:click={corregirSeleccionados} disabled={ocupado || !seleccionadosElegibles.length}>Corregir seleccionados</button>
          </div>
        </div>
        {#each resultado.items as item, indice}
          <article class="producto">
            <div class="producto-principal">
              <label class="seleccion">
                <input type="checkbox" value={item.producto_id} bind:group={seleccion} disabled={!item.elegible || ocupado} aria-label={"Seleccionar " + item.nombre} />
                <span class="numero">{indice + 1}</span>
              </label>
              <div class="nombre"><strong>{item.nombre}</strong><small>{item.codigo || "Sin código"} · Pedido: {item.cantidad} · Existencia actual: {item.stock == null ? "No disponible" : item.stock}</small></div>
              <button type="button" class="ver-movimientos" on:click={() => productoMovimientos = item} disabled={!item.producto_id || !/^[a-f\d]{24}$/i.test(item.producto_id) || ocupado}>Ver movimientos</button>
              <button type="button" class="corregir-uno" on:click={() => corregir([item])} disabled={!item.elegible || ocupado} aria-label={"Corregir salida duplicada de " + item.nombre}>Corregir +{item.cantidad}</button>
              <span class:elegible={item.elegible} class="estado">{item.elegible ? "Revisar" : "No corregible"}</span>
            </div>
            <p class="motivo">{item.motivo}</p>
            {#if item.correccion && item.correccion.auditoria_pendiente}
              <div class="auditoria-pendiente" role="alert">
                <span>El inventario ya fue ajustado, pero falta confirmar su snaplog. No vuelvas a corregirlo.</span>
                <button type="button" on:click={() => recuperarAuditoria(item)} disabled={ocupado}>Recuperar snaplog</button>
              </div>
            {/if}
            {#if item.salidas.length}
              <div class="movimientos">
                {#each item.salidas as salida}
                  <div><span>{fecha(salida.fecha)}</span><strong>−{salida.cantidad}</strong><span>Existencia: {salida.antes} → {salida.despues}</span><small>ID: {salida.id}</small></div>
                {/each}
              </div>
            {:else}
              <p class="motivo">No se encontraron salidas para este producto y folio.</p>
            {/if}
          </article>
        {/each}
      </section>
      {#if seleccion.length}
        <div class="acciones-flotantes" role="region" aria-label="Corrección de productos seleccionados">
          <span aria-live="polite"><strong>{seleccion.length}</strong> producto(s) seleccionado(s)</span>
          <button type="button" on:click={corregirSeleccionados} disabled={ocupado}>Corregir seleccionados</button>
        </div>
      {/if}
    {/if}
  </main>
  {#if productoMovimientos && resultado}
    <ModalMovimientos producto={productoMovimientos} folio={resultado.folio} on:close={() => productoMovimientos = null} />
  {/if}
  {#if progreso}
    <ModalProgreso {progreso} on:close={() => progreso = null} />
  {/if}
{:else}
  <p class="error">Acceso restringido al usuario autorizado.</p>
{/if}

<style>
  .herramienta { max-width: 1200px; margin: 30px auto; padding: 0 24px 60px; color: #233942; }
  .herramienta.con-seleccion { padding-bottom: 120px; }
  header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 3px solid #19795e; padding-bottom: 20px; }
  h1, h2, p { margin: 0; } h1 { font-size: 30px; margin: 4px 0 8px; } h2 { font-size: 23px; } h2 span { font-size: 16px; font-weight: normal; margin-left: 12px; }
  .etiqueta { font-size: 11px; font-weight: bold; letter-spacing: .12em; color: #397361; }
  .insignia { color: #19795e; background: #dcece5; padding: 8px 12px; font-size: 11px; font-weight: bold; letter-spacing: .06em; }
  .consulta { background: white; padding: 20px; margin-top: 20px; border: 1px solid #d5dfe0; }
  label { font-weight: bold; } .busqueda { display: flex; gap: 10px; margin-top: 8px; }
  input[type=number] { width: 220px; padding: 10px; border: 1px solid #abbcbf; border-radius: 3px; }
  button { border: 0; padding: 11px 18px; border-radius: 3px; background: #16785c; color: white; font-weight: bold; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .aviso { margin: 18px 0; padding: 14px 18px; background: #fff3d7; border-left: 4px solid #c38313; line-height: 1.5; }
  .error, .exito { padding: 14px; margin: 12px 0; } .error { background: #ffe6e3; color: #8e271b; } .exito { background: #dcefe5; color: #14583e; }
  .resultado { border: 1px solid #d5dfe0; background: white; }
  .cabecera-resultado { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d5dfe0; }
  .producto { padding: 17px 20px; border-bottom: 1px solid #e0e7e8; } .producto-principal { display: flex; align-items: center; gap: 14px; }
  .seleccion { display: flex; gap: 10px; align-items: center; } .seleccion input { width: 18px; height: 18px; accent-color: #19795e; }
  .numero { color: #899b9e; font-size: 12px; } .nombre { flex: 1; } .nombre small { display: block; color: #607679; margin-top: 4px; }
  .estado { background: #eceff0; padding: 5px 9px; font-size: 12px; } .estado.elegible { background: #e0f2e7; color: #17653f; }
  button.ver-movimientos { background: white; border: 1px solid #9dbbb0; color: #17684f; padding: 8px 11px; }
  button.corregir-uno { padding: 9px 11px; }
  .motivo { color: #52686b; margin: 10px 0 0 47px; font-size: 13px; }
  .auditoria-pendiente { margin: 12px 0 0 47px; padding: 12px; background: #fff3d7; color: #694500; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .movimientos { display: flex; gap: 10px; margin: 12px 0 0 47px; flex-wrap: wrap; }
  .movimientos div { background: #f0f5f4; padding: 10px 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 13px; }
  .movimientos strong { color: #aa382c; } .movimientos small { color: #687b7e; }
  .resumen-acciones { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .seleccionar-todos { display: flex; gap: 8px; align-items: center; font-size: 13px; }
  .seleccionar-todos input { width: 18px; height: 18px; accent-color: #19795e; }
  .acciones-flotantes { position: fixed; z-index: 20; left: 50%; bottom: 18px; transform: translateX(-50%); width: min(520px, calc(100% - 32px)); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #e7f2ed; border: 1px solid #9dbbb0; border-radius: 5px; box-shadow: 0 4px 18px #23394244; }
  @media (max-width: 650px) { header, .cabecera-resultado { flex-direction: column; align-items: flex-start; gap: 12px; } .busqueda { flex-wrap: wrap; } .producto-principal { flex-wrap: wrap; } .motivo, .movimientos { margin-left: 0; } .acciones-flotantes { bottom: 8px; padding: 10px; } }
</style>
