<script>
  import { onMount } from "svelte";
  import { Button, Snackbar } from "svelte-mui/src";
  import { postData, mensajes_app, cargando_mensajes_app } from "../../../stores";

  let cargando = true;
  let guardando = false;
  let probando = false;
  let subiendo_csd = false;

  let tab_activa = "datos"; // datos | csd | folios

  // Formulario Datos Fiscales & PAC
  let config = {
    emisor_rfc: "EKU9003173C9",
    emisor_nombre: "ESCUELA KEMPER UGARTE",
    emisor_regimen: "601",
    emisor_cp: "26015",
    cucc_api_base: "https://cucc.com.mx/v2/api-cucc/public",
    soap_url: "https://cucc.com.mx/v2/api-cucc/public/soap/facturas",
    soap_user: "LAN7008173R5",
    soap_pass: "",
    has_soap_pass: false,
    client_id: "41",
    client_secret: "",
    has_client_secret: false,
    ambiente: "sandbox",
    csd_cargado: false,
    certificado_nombre: "",
    llave_nombre: ""
  };

  // Archivos CSD y Logo
  let archivo_cer = null;
  let archivo_key = null;
  let archivo_logo = null;
  let pass_csd = "";
  let cer_nombre = "";
  let key_nombre = "";

  // Series y Folios
  let folios = [
    { serie: "F", tipo: "Factura Individual", folio_siguiente: 1001 },
    { serie: "CON", tipo: "Factura Consolidada", folio_siguiente: 501 },
    { serie: "GLO", tipo: "Factura Global (Público General)", folio_siguiente: 101 },
    { serie: "RP", tipo: "Complementos de Pago (REP)", folio_siguiente: 1 },
    { serie: "AF", tipo: "Autofacturación Web", folio_siguiente: 1 }
  ];

  onMount(() => {
    cargar_configuracion();
  });

  async function cargar_configuracion() {
    cargando = true;
    try {
      const res = await postData("/app/facturacion/perfil-fiscal/obtener", {});
      if (res.ok && res.config) {
        config = { ...config, ...res.config };
        if (res.folios && res.folios.length > 0) {
          folios = res.folios.map(f => ({
            serie: f.serie,
            tipo: obtener_nombre_serie(f.serie),
            folio_siguiente: f.folio_siguiente || f.folio_actual || 1
          }));
        }
      }
    } catch (err) {
      console.error("Error al cargar configuración fiscal:", err);
      $mensajes_app.push({ tipo: "error", mensaje: "No se pudo cargar la configuración fiscal." });
      $mensajes_app = $mensajes_app;
    } finally {
      cargando = false;
    }
  }

  function obtener_nombre_serie(serie) {
    switch (serie) {
      case "F": return "Factura Individual";
      case "CON": return "Factura Consolidada";
      case "GLO": return "Factura Global";
      case "RP": return "Complementos de Pago";
      case "AF": return "Autofacturación";
      default: return `Serie ${serie}`;
    }
  }

  async function guardar_perfil() {
    guardando = true;
    try {
      const res = await postData("/app/facturacion/perfil-fiscal/guardar", {
        ...config,
        folios
      });
      if (res.ok) {
        $mensajes_app.push({ tipo: "exito", mensaje: res.mensaje || "Perfil fiscal guardado exitosamente." });
        $mensajes_app = $mensajes_app;
        config.has_soap_pass = true;
        config.soap_pass = "";
        if (config.client_secret) config.has_client_secret = true;
        config.client_secret = "";
      } else {
        $mensajes_app.push({ tipo: "error", mensaje: res.mensaje || "Error al guardar el perfil fiscal." });
        $mensajes_app = $mensajes_app;
      }
    } catch (err) {
      console.error(err);
      $mensajes_app.push({ tipo: "error", mensaje: "Error de servidor al guardar perfil fiscal." });
      $mensajes_app = $mensajes_app;
    } finally {
      guardando = false;
    }
  }

  async function probar_conexion() {
    probando = true;
    try {
      const res = await postData("/app/facturacion/perfil-fiscal/probar_conexion", {
        cucc_api_base: config.cucc_api_base,
        client_id: config.client_id,
        client_secret: config.client_secret,
        soap_user: config.soap_user,
        soap_pass: config.soap_pass
      });
      if (res.ok) {
        $mensajes_app.push({ tipo: "exito", mensaje: res.mensaje });
        $mensajes_app = $mensajes_app;
      } else {
        $mensajes_app.push({ tipo: "error", mensaje: res.mensaje });
        $mensajes_app = $mensajes_app;
      }
    } catch (err) {
      console.error(err);
      $mensajes_app.push({ tipo: "error", mensaje: "Fallo la prueba de conexión." });
      $mensajes_app = $mensajes_app;
    } finally {
      probando = false;
    }
  }

  function handle_file_select(event, tipo) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      if (tipo === "cer") {
        archivo_cer = base64;
        cer_nombre = file.name;
      } else if (tipo === "key") {
        archivo_key = base64;
        key_nombre = file.name;
      } else if (tipo === "logo") {
        archivo_logo = base64;
      }
    };
    reader.readAsDataURL(file);
  }

  async function subir_csd_a_cucc() {
    if (!archivo_cer && !archivo_key) {
      $mensajes_app.push({ tipo: "error", mensaje: "Selecciona al menos el archivo .cer y .key de tu CSD." });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (!pass_csd) {
      $mensajes_app.push({ tipo: "error", mensaje: "Ingresa la contraseña del Certificado de Sello Digital (CSD)." });
      $mensajes_app = $mensajes_app;
      return;
    }

    subiendo_csd = true;
    try {
      const res = await postData("/app/facturacion/perfil-fiscal/subir_csd", {
        certificado_base64: archivo_cer,
        llave_base64: archivo_key,
        pass_certificado: pass_csd,
        logo_base64: archivo_logo,
        certificado_nombre: cer_nombre,
        llave_nombre: key_nombre
      });

      if (res.ok) {
        $mensajes_app.push({ tipo: "exito", mensaje: res.mensaje });
        $mensajes_app = $mensajes_app;
        config.csd_cargado = true;
        config.certificado_nombre = cer_nombre;
        config.llave_nombre = key_nombre;
        pass_csd = "";
      } else {
        $mensajes_app.push({ tipo: "error", mensaje: res.mensaje });
        $mensajes_app = $mensajes_app;
      }
    } catch (err) {
      console.error(err);
      $mensajes_app.push({ tipo: "error", mensaje: "Error al subir CSD a CUCC." });
      $mensajes_app = $mensajes_app;
    } finally {
      subiendo_csd = false;
    }
  }
</script>

<svelte:head>
  <title>Perfil Fiscal & Configuración CUCC - Xenon</title>
</svelte:head>

<div class="contenedor_principal">
  <header class="encabezado_modulo">
    <div class="titulo_area">
      <i class="material-icons icono_header">verified_user</i>
      <div>
        <h1>Perfil Fiscal Emisor</h1>
        <p class="subtitulo">Configuración de datos fiscales SAT, Certificados CSD y credenciales PAC CUCC</p>
      </div>
    </div>
    <div class="badge_ambiente" class:badge_prod={config.ambiente === 'produccion'}>
      <i class="material-icons" style="font-size:16px; margin-right:4px;">
        {config.ambiente === 'produccion' ? 'cloud_done' : 'developer_mode'}
      </i>
      {config.ambiente === 'produccion' ? 'Ambiente Producción' : 'Ambiente Sandbox / Pruebas'}
    </div>
  </header>

  {#if cargando}
    <div class="cargando_box">
      <i class="material-icons girando">sync</i>
      <p>Cargando perfil fiscal...</p>
    </div>
  {:else}
    <!-- Pestañas de navegación -->
    <div class="tabs_container">
      <button class="tab_btn" class:activa={tab_activa === 'datos'} on:click={() => tab_activa = 'datos'}>
        <i class="material-icons">business</i> Datos Fiscales & PAC CUCC
      </button>
      <button class="tab_btn" class:activa={tab_activa === 'csd'} on:click={() => tab_activa = 'csd'}>
        <i class="material-icons">vpn_key</i> Certificados CSD & Logo
        {#if config.csd_cargado}
          <span class="badge_ok">✓ CSD OK</span>
        {/if}
      </button>
      <button class="tab_btn" class:activa={tab_activa === 'folios'} on:click={() => tab_activa = 'folios'}>
        <i class="material-icons">tag</i> Series & Folios Fiscales
      </button>
    </div>

    <!-- Pestaña 1: Datos Fiscales y Credenciales PAC -->
    {#if tab_activa === 'datos'}
      <div class="card_seccion">
        <h2 class="titulo_seccion"><i class="material-icons">account_balance</i> Datos del Contribuyente Emisor (SAT)</h2>
        <div class="grid_formulario">
          <div class="campo_group">
            <label for="rfc">RFC Emisor *</label>
            <input type="text" id="rfc" bind:value={config.emisor_rfc} placeholder="EKU9003173C9" class="input_text uppercase" />
            <span class="ayuda">RFC exactamente como en la Constancia del SAT</span>
          </div>

          <div class="campo_group col_2">
            <label for="razon_social">Razón Social * (Sin Régimen Capital)</label>
            <input type="text" id="razon_social" bind:value={config.emisor_nombre} placeholder="ESCUELA KEMPER UGARTE" class="input_text uppercase" />
            <span class="ayuda">Debe coincidir en mayúsculas sin "S.A. de C.V."</span>
          </div>

          <div class="campo_group">
            <label for="regimen">Régimen Fiscal (Clave SAT) *</label>
            <select id="regimen" bind:value={config.emisor_regimen} class="input_text">
              <option value="601">601 - General de Ley Personas Morales</option>
              <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
              <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados</option>
              <option value="606">606 - Arrendamiento</option>
              <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
              <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
            </select>
          </div>

          <div class="campo_group">
            <label for="cp">Código Postal (Lugar de Expedición) *</label>
            <input type="text" id="cp" bind:value={config.emisor_cp} placeholder="26015" maxlength="5" class="input_text" />
          </div>
        </div>

        <hr class="divisor" />

        <h2 class="titulo_seccion"><i class="material-icons">api</i> Credenciales PAC CUCC (Servicio de Timbrado)</h2>
        <div class="grid_formulario">
          <div class="campo_group col_2">
            <label for="cucc_base">URL Base API CUCC REST</label>
            <input type="text" id="cucc_base" bind:value={config.cucc_api_base} placeholder="https://cucc.com.mx/v2/api-cucc/public" class="input_text" />
          </div>

          <div class="campo_group col_2">
            <label for="soap_url">URL Servicio SOAP WSDL</label>
            <input type="text" id="soap_url" bind:value={config.soap_url} placeholder="https://cucc.com.mx/v2/api-cucc/public/soap/facturas" class="input_text" />
          </div>

          <div class="campo_group">
            <label for="soap_user">Usuario SOAP PAC *</label>
            <input type="text" id="soap_user" bind:value={config.soap_user} placeholder="LAN7008173R5" class="input_text" />
          </div>

          <div class="campo_group">
            <label for="soap_pass">
              Contraseña PAC * 
              {#if config.has_soap_pass}
                <span class="badge_cifrado">🔒 Cifrada AES-256</span>
              {/if}
            </label>
            <input type="password" id="soap_pass" bind:value={config.soap_pass} placeholder={config.has_soap_pass ? '••••••••••••' : 'Ingresa contraseña PAC'} class="input_text" />
          </div>

          <div class="campo_group">
            <label for="client_id">Client ID (OAuth2)</label>
            <input type="text" id="client_id" bind:value={config.client_id} placeholder="41" class="input_text" />
          </div>

          <div class="campo_group col_2">
            <label for="client_secret">Client Secret (OAuth2)</label>
            <input type="password" id="client_secret" bind:value={config.client_secret} placeholder={config.has_client_secret ? '••••••••••••' : 'Ingresa el secreto OAuth2'} class="input_text" />
          </div>

          <div class="campo_group">
            <label for="ambiente">Ambiente de Operación</label>
            <select id="ambiente" bind:value={config.ambiente} class="input_text">
              <option value="sandbox">Sandbox / Pruebas (RFC EKU9003173C9)</option>
              <option value="produccion">Producción (Timbres Reales SAT)</option>
            </select>
          </div>
        </div>

        <div class="acciones_footer">
          <Button raised color="primary" on:click={guardar_perfil} disabled={guardando}>
            <i class="material-icons">save</i> {guardando ? 'Guardando...' : 'Guardar Perfil Fiscal'}
          </Button>
          <Button raised color="accent" on:click={probar_conexion} disabled={probando}>
            <i class="material-icons">network_check</i> {probando ? 'Probando...' : 'Probar Conexión con CUCC'}
          </Button>
        </div>
      </div>
    {/if}

    <!-- Pestaña 2: CSD y Logo -->
    {#if tab_activa === 'csd'}
      <div class="card_seccion">
        <h2 class="titulo_seccion"><i class="material-icons">verified</i> Certificados de Sello Digital (CSD) para CUCC</h2>
        <p class="descripcion_seccion">
          Sube tus archivos de Certificado <code>.cer</code>, Llave Privada <code>.key</code> y Contraseña CSD. Se transmitirán de forma segura mediante HTTPS a la API REST de CUCC <code>POST /api/perfil/me/csd</code>.
        </p>

        {#if config.csd_cargado}
          <div class="alerta_exito">
            <i class="material-icons">check_circle</i>
            <div>
              <strong>CSD Cargado Activo en CUCC</strong>
              <p>Certificado: {config.certificado_nombre || 'Activo'} | Llave: {config.llave_nombre || 'Activa'}</p>
            </div>
          </div>
        {/if}

        <div class="grid_csd">
          <div class="dropzone">
            <i class="material-icons icono_file">badge</i>
            <label class="btn_file">
              Seleccionar Archivo .CER
              <input type="file" accept=".cer" on:change={(e) => handle_file_select(e, 'cer')} />
            </label>
            <span class="file_name">{cer_nombre || 'Ningún archivo .cer seleccionado'}</span>
          </div>

          <div class="dropzone">
            <i class="material-icons icono_file">key</i>
            <label class="btn_file">
              Seleccionar Archivo .KEY
              <input type="file" accept=".key" on:change={(e) => handle_file_select(e, 'key')} />
            </label>
            <span class="file_name">{key_nombre || 'Ningún archivo .key seleccionado'}</span>
          </div>
        </div>

        <div class="campo_group" style="margin-top: 20px;">
          <label for="pass_csd">Contraseña de la Llave Privada (.key) *</label>
          <input type="password" id="pass_csd" bind:value={pass_csd} placeholder="Contraseña de tu CSD" class="input_text" style="max-width: 400px;" />
        </div>

        <hr class="divisor" />

        <h2 class="titulo_seccion"><i class="material-icons">image</i> Logotipo para Representación Impresa (PDF)</h2>
        <div class="dropzone" style="max-width: 400px;">
          <i class="material-icons icono_file">collections</i>
          <label class="btn_file">
            Seleccionar Imagen Logo (PNG/JPG)
            <input type="file" accept="image/*" on:change={(e) => handle_file_select(e, 'logo')} />
          </label>
        </div>

        <div class="acciones_footer" style="margin-top: 30px;">
          <Button raised color="primary" on:click={subir_csd_a_cucc} disabled={subiendo_csd}>
            <i class="material-icons">cloud_upload</i> {subiendo_csd ? 'Subiendo CSD a CUCC...' : 'Subir CSD y Logo a CUCC'}
          </Button>
        </div>
      </div>
    {/if}

    <!-- Pestaña 3: Series y Folios -->
    {#if tab_activa === 'folios'}
      <div class="card_seccion">
        <h2 class="titulo_seccion"><i class="material-icons">format_list_numbered</i> Control de Series y Folios Fiscales</h2>
        <p class="descripcion_seccion">
          Define el consecutivo numérico inicial o actual para cada serie de comprobante fiscal.
        </p>

        <div class="tabla_responsive">
          <table class="tabla_folios">
            <thead>
              <tr>
                <th>Serie</th>
                <th>Tipo de Comprobante CFDI</th>
                <th>Folio Siguiente</th>
              </tr>
            </thead>
            <tbody>
              {#each folios as item}
                <tr>
                  <td><span class="badge_serie">{item.serie}</span></td>
                  <td><strong>{item.tipo}</strong></td>
                  <td>
                    <input type="number" min="1" bind:value={item.folio_siguiente} class="input_number" />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="acciones_footer" style="margin-top: 24px;">
          <Button raised color="primary" on:click={guardar_perfil} disabled={guardando}>
            <i class="material-icons">save</i> Guardar Series y Folios
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .contenedor_principal {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .encabezado_modulo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: #fff;
    padding: 20px 24px;
    border-radius: 12px;
    margin-bottom: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  .titulo_area {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .icono_header {
    font-size: 36px;
    color: #38bdf8;
  }
  h1 {
    font-size: 22px;
    margin: 0;
    font-weight: 700;
  }
  .subtitulo {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: #94a3b8;
  }
  .badge_ambiente {
    display: flex;
    align-items: center;
    background: #f59e0b;
    color: #000;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
  }
  .badge_prod {
    background: #10b981;
    color: #fff;
  }
  .tabs_container {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  .tab_btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #e2e8f0;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .tab_btn:hover {
    background: #cbd5e1;
  }
  .tab_btn.activa {
    background: #0284c7;
    color: #fff;
    box-shadow: 0 2px 8px rgba(2,132,199,0.3);
  }
  .badge_ok {
    background: #10b981;
    color: #fff;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 10px;
  }
  .card_seccion {
    background: #fff;
    border-radius: 12px;
    padding: 28px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    border: 1px solid #e2e8f0;
  }
  .titulo_seccion {
    font-size: 16px;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 0;
    margin-bottom: 16px;
  }
  .descripcion_seccion {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 20px;
  }
  .grid_formulario {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }
  .col_2 {
    grid-column: span 2;
  }
  @media (max-width: 768px) {
    .col_2 { grid-column: span 1; }
  }
  .campo_group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }
  .input_text {
    height: 40px;
    padding: 0 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }
  .input_text:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2,132,199,0.15);
  }
  .uppercase {
    text-transform: uppercase;
  }
  .ayuda {
    font-size: 11px;
    color: #94a3b8;
  }
  .divisor {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 28px 0;
  }
  .acciones_footer {
    display: flex;
    gap: 16px;
    margin-top: 24px;
  }
  .grid_csd {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .dropzone {
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: #f8fafc;
  }
  .icono_file {
    font-size: 40px;
    color: #0284c7;
  }
  .btn_file {
    background: #0284c7;
    color: #fff;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn_file input {
    display: none;
  }
  .file_name {
    font-size: 12px;
    color: #64748b;
  }
  .alerta_exito {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #ecfdf5;
    border: 1px solid #10b981;
    color: #065f46;
    padding: 14px 18px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .badge_cifrado {
    font-size: 10px;
    background: #e0f2fe;
    color: #0369a1;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .cargando_box {
    text-align: center;
    padding: 60px;
    color: #64748b;
  }
  .girando {
    font-size: 36px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
  .tabla_responsive {
    overflow-x: auto;
  }
  .tabla_folios {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  .tabla_folios th, .tabla_folios td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }
  .tabla_folios th {
    background: #f1f5f9;
    color: #334155;
    font-size: 13px;
  }
  .badge_serie {
    background: #0284c7;
    color: #fff;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 700;
  }
  .input_number {
    width: 140px;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
  }
</style>
