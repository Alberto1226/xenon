<script>
  // Puerta de entrada a las pantallas de CoreCFDI: pide empresa, email y contraseña y solo
  // muestra el contenido (slot) cuando el usuario tiene una sesión de CoreCFDI.
  // La página puede poner `activa = false` cuando una ruta responde tipo "sesion" (sesión vencida).
  import { onMount, createEventDispatcher } from "svelte";
  import { postData, mensajes_app } from "../../stores";

  export let activa = false;

  const RUTA = "/app/facturacion/corecfdi-sesion";
  const dispatch = createEventDispatcher();

  let revisando = true;
  let configurado = true;
  let mensaje_configuracion = "";
  let tenant = "";
  let email = "";
  let password = "";
  let entrando = false;
  let error = "";
  let errores = {};

  onMount(async () => {
    try {
      const res = await postData(RUTA + "/estado", {});
      if (res.ok) {
        configurado = res.configurado;
        mensaje_configuracion = res.mensaje_configuracion;
        tenant = res.tenant || "";
        email = res.email || "";
        if (res.activa) {
          activa = true;
          dispatch("activa");
        }
      } else {
        error = res.mensaje;
      }
    } catch (err) {
      error = "No se pudo consultar la sesión de CoreCFDI.";
    } finally {
      revisando = false;
    }
  });

  async function iniciar_sesion() {
    error = "";
    errores = {};
    entrando = true;
    try {
      const res = await postData(RUTA + "/iniciar", { tenant, email, password });
      if (res.ok) {
        tenant = res.tenant;
        email = res.email;
        activa = true;
        dispatch("activa");
      } else {
        error = res.mensaje;
        errores = res.errors || {};
      }
    } catch (err) {
      error = "No se pudo iniciar sesión en CoreCFDI.";
    } finally {
      // La contraseña no se conserva en el navegador después de enviarla.
      password = "";
      entrando = false;
    }
  }

  async function cerrar_sesion() {
    try {
      const res = await postData(RUTA + "/cerrar", {});
      if (!res.ok) {
        $mensajes_app.push({ tipo: "error", mensaje: res.mensaje });
        $mensajes_app = $mensajes_app;
        return;
      }
      activa = false;
    } catch (err) {
      $mensajes_app.push({ tipo: "error", mensaje: "No se pudo cerrar la sesión de CoreCFDI." });
      $mensajes_app = $mensajes_app;
    }
  }
</script>

{#if revisando}
  <p class="estado">Revisando la sesión de CoreCFDI...</p>
{:else if activa}
  <div class="barra_sesion">
    <span><i class="material-icons">verified_user</i> CoreCFDI: <strong>{email}</strong> · empresa <strong>{tenant}</strong></span>
    <button class="enlace" on:click={cerrar_sesion}>Cerrar sesión</button>
  </div>
  <slot />
{:else}
  <form class="card_sesion" on:submit|preventDefault={iniciar_sesion}>
    <h2><i class="material-icons">lock</i> Iniciar sesión en CoreCFDI</h2>
    <p class="nota">Para usar estas funciones inicie sesión con su cuenta de CoreCFDI.</p>

    {#if !configurado}
      <div class="alerta_error">{mensaje_configuracion}</div>
    {/if}
    {#if error}
      <div class="alerta_error">{error}</div>
    {/if}

    <div class="campo">
      <label for="corecfdi_tenant">Empresa (tenant)</label>
      <input id="corecfdi_tenant" type="text" autocomplete="organization" bind:value={tenant} />
      {#if errores.tenant}<small class="error_campo">{errores.tenant[0]}</small>{/if}
    </div>
    <div class="campo">
      <label for="corecfdi_email">Email</label>
      <input id="corecfdi_email" type="email" autocomplete="username" bind:value={email} />
      {#if errores.email}<small class="error_campo">{errores.email[0]}</small>{/if}
    </div>
    <div class="campo">
      <label for="corecfdi_password">Contraseña</label>
      <input id="corecfdi_password" type="password" autocomplete="current-password" bind:value={password} />
      {#if errores.password}<small class="error_campo">{errores.password[0]}</small>{/if}
    </div>

    <button class="btn" type="submit" disabled={entrando || !configurado}>
      {entrando ? "Iniciando sesión..." : "Iniciar sesión"}
    </button>
    <p class="nota">La contraseña se envía a CoreCFDI y no se guarda en este sistema.</p>
  </form>
{/if}

<style>
  .estado { color: #64748b; font-size: 14px; text-align: center; padding: 36px; }
  .barra_sesion { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; color: #334155; }
  .barra_sesion span { display: flex; align-items: center; gap: 6px; }
  .barra_sesion .material-icons { font-size: 18px; color: #16a34a; }
  .enlace { color: #1d4ed8; background: none; border: none; padding: 0; font-size: 13px; cursor: pointer; }
  .card_sesion { background: #fff; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0; max-width: 420px; margin: 24px auto; }
  h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px 0; font-size: 17px; font-weight: 700; color: #1e293b; }
  .nota { font-size: 12px; color: #64748b; margin: 8px 0 16px 0; }
  .campo { margin-bottom: 14px; }
  .campo label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
  .campo input { width: 100%; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; box-sizing: border-box; }
  .error_campo { display: block; margin-top: 4px; font-size: 12px; color: #b91c1c; }
  .alerta_error { background: #fee2e2; color: #991b1b; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; }
  .btn { width: 100%; background: #1d4ed8; color: #fff; border: none; padding: 11px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
