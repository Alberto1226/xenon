<script>
  //   EDITAR PRODUCTO
  import Marca from "./_componentes/Marca.svelte";
  import SelectSat from "./_componentes/Select_sat.svelte";
  import Unidad from "./_componentes/Unidad_medida.svelte";
  // import Categoria from "./_componentes/Categoria.svelte";
  import Uploader from "./_componentes/upload_productos.svelte";
  import { fly } from "svelte/transition";
  import Caracteristicas_tecnicas from "./_componentes/Caracteristicas_tecnicas.svelte";
  import Precios from "./_componentes/_precios.svelte";
  import {
    Button,
    Textfield,
    Menu,
    Menuitem,
    Ripple,
    Checkbox,
  } from "svelte-mui/src";
  import {
    mensajes_app,
    productos,
    postData,
    editar_store,
    usuario_db,
  } from "./../../../stores";
  import { onMount } from "svelte";
  import { lista_archivos_uploads } from "./_componentes/stores_admon";
  import { goto } from "@sapper/app";
  import { validarConfiguracionFiscalProducto } from "../../../../services/validarConfiguracionFiscalProducto";

  const plantilla_producto = {
    codigo: "",
    nombre: "",
    precio: 0,
    precio_compra: 0,
    sat_clave_prod_serv: "",
    sat_clave_unidad: "",
    sat_objeto_impuesto: "",
    impuestos_venta: { iva: "", ieps_tasa_porcentaje: 0 },
    descripcion: "",
    marca: "",
    unidad: "Pieza",
    caracteristicas_tecnicas: [],
    galeria_imagenes: [],
    para_venta_publico: true,
    aplicar_descuento_distribuidor: true,
    existencia: { actual: 0, minimo: 0, maximo: 0, masterBox: 0 },
    carritos: [],
    activo: true,
    master_box: 0,
  };

  var nuevo_producto = JSON.parse(JSON.stringify(plantilla_producto));

  // Se completa el mismo objeto del store (sin copiarlo): el bloque reactivo de abajo
  // reasigna nuevo_producto en cada cambio, y una copia descartaría lo capturado en el formulario.
  function normalizar_producto(producto) {
    if (!producto) return producto;
    producto.impuestos_venta = {
      ...plantilla_producto.impuestos_venta,
      ...(producto.impuestos_venta || {})
    };
    return producto;
  }

  onMount(() => {
    setTimeout(() => {
      if ($editar_store.producto) {
        nuevo_producto = normalizar_producto($editar_store.producto);
      } else {
        nuevo_producto = JSON.parse(JSON.stringify(plantilla_producto));
      }
    }, 500);
  });

  $: if ($editar_store.producto) {
    nuevo_producto = normalizar_producto($editar_store.producto);
  } else {
    nuevo_producto = nuevo_producto._id ? JSON.parse(JSON.stringify(plantilla_producto)) : nuevo_producto;
  }

  var subiendo = false;
  var subido = false;
  var ancho_side_panel = 250;
  let tab_activa = "general";

  let props = {
    color: "primary",
    name: "svelte",
    value: "para venta al publico",
  };

  function mostrar_error(error) {
    $mensajes_app.push({ tipo: "error", mensaje: "Error " + error });
    $mensajes_app = $mensajes_app;
  }

  function mostrar_exito(mensaje = "Ficha guardada") {
    $mensajes_app.push({ tipo: "exito", mensaje: mensaje });
    $mensajes_app = $mensajes_app;
  }

  function subir() {
    if (checar_formulario_falta_algo() == true) {
      return;
    }
    const errorFiscal = validarConfiguracionFiscalProducto(nuevo_producto);
    if (errorFiscal) {
      mostrar_error(errorFiscal);
      return;
    }
    var data = JSON.parse(JSON.stringify(nuevo_producto));
    subiendo = true;
    data.archivos = $lista_archivos_uploads;

    // Determinar endpoint según la presencia de _id (Creación vs Edición)
    const es_creacion = !nuevo_producto._id;
    const url = es_creacion 
      ? "app/productos/nuevo/crear_producto" 
      : "app/productos/editar/editar_producto";

    postData(url, data)
      .then((res) => {
        if (res && res.ok === false) {
          subiendo = false;
          mostrar_error(res.message || "No se pudo guardar el producto");
          return;
        }
        if (es_creacion) {
          mostrar_exito("Producto creado con éxito");
          var producto_tmp = res.producto;
          if (producto_tmp) {
            producto_tmp.fh_creado = new Date(producto_tmp.fh_creado);
            $productos.lista.push(producto_tmp);
            $productos.lista.sort((a, b) => (a.nombre > b.nombre ? 1 : -1));
          }
        } else {
          mostrar_exito("Producto guardado con éxito");
          let index = $productos.lista.findIndex(p => p._id === nuevo_producto._id);
          if (index !== -1) {
            $productos.lista[index] = nuevo_producto;
          }
        }
        $productos = $productos;

        setTimeout(() => {
          $lista_archivos_uploads = [];
          goto("app/productos");
          subiendo = false;
          subido = true;
        }, 100);
      })
      .catch((err) => {
        console.log(err);
        subiendo = false;
      });
  }

  function subir_imagen(archivo) {
    return new Promise((resolve, reject) => {
      var aleatorio = Math.floor(Math.random() * 9847) + 1;
      procesar_base64(archivo, (ok, terminacion, base64_nuevo) => {
        var nombre = Number(new Date()) + "imagen" + aleatorio + terminacion;
        // Create a root reference
        var storageRef = firebase.storage().ref();

        // Create a reference to 'images/mountains.jpg'
        var productosRef = storageRef.child("productos/" + nombre);

        // Base64 formatted string
        //console.log(base64_nuevo);

        productosRef
          .putString(base64_nuevo, "base64")
          .then(function (snapshot) {
            //console.log("Uploaded a base64 string!");
            //console.log(productosRef.location.path_);

            resolve(productosRef.location.path_);
          })
          .catch((err) => {
            console.log(err);
            reject(err);
          });
      });
    });
  }

  function procesar_base64(archivo, cp) {
    var cabecera = archivo.base64.slice(0, 60);
    var terminacion = "";
    var base_puro = "";
    var ok = true;
    if (cabecera.search("image/jpeg") > -1) {
      terminacion = ".jpg";
      base_puro = archivo.base64.replace("data:image/jpeg;base64,", "");
      ok = true;
    } else if (cabecera.search("image/png") > -1) {
      terminacion = ".png";
      base_puro = archivo.base64.replace("data:image/png;base64,", "");
      ok = true;
    } else if (cabecera.search("image/gif") > -1) {
      terminacion = ".gif";
      base_puro = archivo.base64.replace("data:image/gif;base64,", "");
      ok = true;
    } else {
      //console.log("No se subio en algun formato compatible");
      ok = false;
      //res.send({ ok: false, message: "Alguna de las imagenes no es compatible, jpg , png y gif se permiten." });
      //return;
    }
    cp(ok, terminacion, base_puro);
  }

  function subir_todas() {
    return new Promise((resolve, reject) => {
      var urls = [];
      var cantidad = $lista_archivos_uploads.length;
      var contador = 0;
      if ($lista_archivos_uploads.length == 0) {
        resolve();
        return;
      }

      $lista_archivos_uploads.forEach((element, i) => {
        subir_imagen(element)
          .then((url) => {
            contador++;

            urls.push(url);
            //console.log(urls);

            if (contador == cantidad) {
              //finalizar
              nuevo_producto.galeria_imagenes = urls;
              resolve();
            }
          })
          .catch((err) => {
            console.log(err);

            contador++;
            if (contador == cantidad) {
              //finalizar
              reject();
            }
          });
      });
    });
  }

  function checar_formulario_falta_algo() {
    //console.log(nuevo_producto);

    var uno = nuevo_producto.codigo == "";
    var dos = nuevo_producto.nombre == "";
    var tres =
      nuevo_producto.precio == "" || parseFloat(nuevo_producto.precio) <= 0;
    var algo_esta_mal = uno && dos && tres;
    //console.log(uno, dos , tres  )
    //console.log(algo_esta_mal);

    return algo_esta_mal;
  }

  const cancelar = () => {
    goto("app/productos");
  };

  async function MandarImagenApiPuente(archivos = $lista_archivos_uploads) {
    if (nuevo_producto.urlApi) {
      return nuevo_producto.urlApi;
    }
    let urlComp = "https://apipuente.isotech.mx/apipuente/public";
    // console.log("a", archivos[0].base64);
    let imgBase64 = archivos[0].base64.replace(/^data:image\/\w+;base64,/, "");
    let planta = "Pruebas";
    // let nameDB = process.env.DB;

    const myHeaders = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "multipart/form-data",
    });
    const formData = new FormData();
    formData.append("planta", planta);
    formData.append("imagenb64", imgBase64);
    // formData.append("db", nameDB);

    const requestOptions = {
      method: "POST",
      // headers: myHeaders,
      body: formData,
      redirect: "follow",
    };
    await fetch(
      "https://apipuente.isotech.mx/apipuente/public/xenon/guardarImagenPlanta",
      requestOptions,
    ).then((response) => {
      if (response.status === 200) {
        return response.json().then((data) => {
          nuevo_producto.urlApi = urlComp + data.url;
          // console.log(urlComp + data.url);
        });
      } else {
        throw new Error("Error en la respuesta");
        $mensajes_app.push({
          tipo: "error",
          mensaje: "Error al guardar la imagen",
        });
        $mensajes_app = $mensajes_app;
      }
    });
  }
</script>

<div class="contenedor_ventana" in:fly={{ x: 10, duration: 500 }}>
  <div class="modulo-tabs-wrapper">
    {#if $usuario_db.rol != "diseñador"}
      <!-- Navegación de Pestañas -->
      <div class="tabs-nav-container">
        <div class="tabs-nav">
          <button
            type="button"
            class="tab-btn"
            class:activo={tab_activa === "general"}
            on:click={() => (tab_activa = "general")}
          >
            <i class="material-icons">inventory_2</i>
            <span>Información General</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            class:activo={tab_activa === "fiscal"}
            on:click={() => (tab_activa = "fiscal")}
          >
            <i class="material-icons">receipt_long</i>
            <span>Fiscal SAT</span>
            <span class="badge-cfdi">CFDI 4.0</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            class:activo={tab_activa === "precios"}
            on:click={() => (tab_activa = "precios")}
          >
            <i class="material-icons">monetization_on</i>
            <span>Precios e Inventario</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            class:activo={tab_activa === "multimedia"}
            on:click={() => (tab_activa = "multimedia")}
          >
            <i class="material-icons">photo_library</i>
            <span>Ficha e Imágenes</span>
          </button>
        </div>
      </div>

      <!-- Contenido de las Pestañas -->
      <div class="tab-contenido-cuerpo">
        <!-- PESTAÑA 1: INFORMACIÓN GENERAL -->
        {#if tab_activa === "general"}
          <div class="panel-tab" in:fly={{ y: 8, duration: 250 }}>
            <div class="grid-2-col">
              <div class="campo">
                <label class="etiqueta-campo" for="codigo_input">
                  <span>Código (SKU) <span class="req">*</span></span>
                </label>
                <Textfield
                  outlined
                  id="codigo_input"
                  bind:value={nuevo_producto.codigo}
                  placeholder="Ej. LL-11R22.5"
                  type="text"
                />
              </div>

              <div class="campo">
                <label class="etiqueta-campo" for="codigo_de_barras_input">
                  <span>Código de barras</span>
                </label>
                <Textfield
                  outlined
                  id="codigo_de_barras_input"
                  bind:value={nuevo_producto.codigo_de_barras}
                  placeholder="Código EAN / UPC"
                  type="text"
                />
              </div>
            </div>

            <div class="campo">
              <label class="etiqueta-campo">
                <span>Nombre del producto <span class="req">*</span></span>
                <span class="contador">
                  {30 - (nuevo_producto.nombre ? nuevo_producto.nombre.length : 0)} caract. restantes
                </span>
              </label>
              <Textfield
                outlined
                bind:value={nuevo_producto.nombre}
                placeholder="Nombre comercial del producto"
                type="text"
                maxlength="30"
              />
            </div>

            <div class="campo">
              <label class="etiqueta-campo">
                <span>Descripción comercial <span class="req">*</span></span>
                <span class="contador">
                  {60 - (nuevo_producto.descripcion ? nuevo_producto.descripcion.length : 0)} caract. restantes
                </span>
              </label>
              <Textfield
                outlined
                bind:value={nuevo_producto.descripcion}
                placeholder="Descripción o especificación comercial"
                type="text"
                maxlength="60"
              />
            </div>

            <div class="grid-2-col" style="margin-top: 8px;">
              <div class="campo">
                <label class="etiqueta-campo"><span>Marca</span></label>
                <Marca bind:marca={nuevo_producto.marca} />
              </div>

              <div class="campo">
                <label class="etiqueta-campo"><span>Unidad de medida</span></label>
                <Unidad bind:unidad={nuevo_producto.unidad} />
              </div>
            </div>

            <div class="opciones-comerciales">
              <div class="opcion-chk">
                <Checkbox {...props} bind:checked={nuevo_producto.para_venta_publico}>
                  <span class="texto-chk">Para venta al público</span>
                </Checkbox>
              </div>
              <div class="opcion-chk">
                <Checkbox {...props} bind:checked={nuevo_producto.recomendar_como_paqueteria}>
                  <i class="material-icons vertical-alineado icono-paq">local_shipping</i>
                  <span class="texto-chk">Recomendar como paquetería</span>
                </Checkbox>
              </div>
            </div>
          </div>
        {/if}

        <!-- PESTAÑA 2: FISCAL SAT (CFDI 4.0) -->
        {#if tab_activa === "fiscal"}
          <div class="panel-tab" in:fly={{ y: 8, duration: 250 }}>
            <div class="banner-sat">
              <i class="material-icons icono-sat">verified</i>
              <div>
                <strong>Configuración Fiscal SAT para Facturación (CFDI 4.0)</strong>
                <p>
                  Estos datos son obligatorios para timbrar conceptos de venta de este producto. Son independientes de pedimentos y costos de importación.
                </p>
              </div>
            </div>

            <div class="grid-2-col" style="margin-top: 18px;">
              <div class="campo">
                <label class="etiqueta-campo">
                  <span>Clave de Producto/Servicio (ClaveProdServ)</span>
                </label>
                <SelectSat
                  catalogo="producto"
                  bind:valor={nuevo_producto.sat_clave_prod_serv}
                  placeholder="Clave de 8 dígitos o buscar por nombre..."
                />
              </div>

              <div class="campo">
                <label class="etiqueta-campo">
                  <span>Clave de Unidad SAT (ClaveUnidad)</span>
                </label>
                <SelectSat
                  catalogo="unidad"
                  bind:valor={nuevo_producto.sat_clave_unidad}
                  placeholder="Clave (Ej. H87) o buscar por nombre..."
                />
              </div>
            </div>

            <div class="grid-3-col" style="margin-top: 18px;">
              <div class="campo">
                <label class="etiqueta-campo"><span>Objeto de Impuesto (SAT)</span></label>
                <select class="control-select" bind:value={nuevo_producto.sat_objeto_impuesto}>
                  <option value="">Sin configurar</option>
                  <option value="01">01 - No objeto de impuesto</option>
                  <option value="02">02 - Sí objeto de impuesto</option>
                  <option value="03">03 - Sí objeto, no obligado al desglose</option>
                  <option value="04">04 - Sí objeto, no causa impuesto</option>
                </select>
              </div>

              <div class="campo">
                <label class="etiqueta-campo"><span>IVA en Venta</span></label>
                <select class="control-select" bind:value={nuevo_producto.impuestos_venta.iva}>
                  <option value="">Sin configurar</option>
                  <option value="16">Tasa 16%</option>
                  <option value="8">Tasa 8%</option>
                  <option value="0">Tasa 0%</option>
                  <option value="exento">Exento</option>
                  <option value="no_aplica">No aplica</option>
                </select>
              </div>

              <div class="campo">
                <label class="etiqueta-campo"><span>IEPS Venta (%)</span></label>
                <input
                  class="control-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.000001"
                  placeholder="0.00"
                  bind:value={nuevo_producto.impuestos_venta.ieps_tasa_porcentaje}
                />
              </div>
            </div>
          </div>
        {/if}

        <!-- PESTAÑA 3: PRECIOS E INVENTARIO -->
        {#if tab_activa === "precios"}
          <div class="panel-tab" in:fly={{ y: 8, duration: 250 }}>
            <div class="grid-2-col-secciones">
              <!-- Sección Precios y Descuentos -->
              <div class="tarjeta-interior">
                <div class="sub-encabezado">
                  <i class="material-icons">payments</i>
                  <span>Precios y Descuentos</span>
                </div>

                {#if $usuario_db.rol === "administrador"}
                  <div class="grid-2-col" style="margin-bottom: 16px;">
                    <div class="campo">
                      <label class="etiqueta-campo"><span>Precio Público <span class="req">*</span></span></label>
                      <div class="precio-row">
                        <span class="signo-moneda">$</span>
                        <div style="flex-grow: 1;">
                          <Textfield
                            outlined
                            bind:value={nuevo_producto.precio}
                            placeholder="0.00"
                            type="number"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="campo">
                      <label class="etiqueta-campo"><span>Precio Compra <span class="req">*</span></span></label>
                      <div class="precio-row">
                        <span class="signo-moneda">$</span>
                        <div style="flex-grow: 1;">
                          <Textfield
                            outlined
                            bind:value={nuevo_producto.precio_compra}
                            placeholder="0.00"
                            type="number"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                {/if}

                <div style="margin-bottom: 14px;">
                  <Checkbox {...props} bind:checked={nuevo_producto.aplicar_descuento_distribuidor}>
                    <span class="texto-chk">Aplicar escala de descuento a distribuidores</span>
                  </Checkbox>
                </div>

                <Precios bind:precio_publico={nuevo_producto.precio} />
              </div>

              <!-- Sección Inventario & Empaque -->
              <div class="tarjeta-interior">
                <div class="sub-encabezado">
                  <i class="material-icons">warehouse</i>
                  <span>Control de Inventario y Empaque</span>
                </div>

                {#if $usuario_db.rol === "administrador"}
                  <div class="grid-3-col" style="margin-bottom: 16px;">
                    <div class="campo">
                      <label class="etiqueta-campo"><span>Existencia Actual <span class="req">*</span></span></label>
                      <Textfield
                        outlined
                        bind:value={nuevo_producto.existencia.actual}
                        placeholder="0"
                        type="number"
                      />
                    </div>

                    <div class="campo">
                      <label class="etiqueta-campo"><span>Stock Mínimo</span></label>
                      <Textfield
                        outlined
                        bind:value={nuevo_producto.existencia.minimo}
                        placeholder="0"
                        type="number"
                      />
                    </div>

                    <div class="campo">
                      <label class="etiqueta-campo"><span>Stock Máximo</span></label>
                      <Textfield
                        outlined
                        bind:value={nuevo_producto.existencia.maximo}
                        placeholder="0"
                        type="number"
                      />
                    </div>
                  </div>
                {/if}

                <div class="campo">
                  <label class="etiqueta-campo">
                    <span>Master Box (Unidades por caja)</span>
                    <span class="contador">Base: {nuevo_producto.unidad || "unidad"}</span>
                  </label>
                  <Textfield
                    outlined
                    bind:value={nuevo_producto.master_box}
                    placeholder="Unidades por empaque"
                    type="number"
                  />
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- PESTAÑA 4: FICHA E IMÁGENES -->
        {#if tab_activa === "multimedia"}
          <div class="panel-tab" in:fly={{ y: 8, duration: 250 }}>
            <div class="grid-2-col-secciones">
              <div class="tarjeta-interior">
                <div class="sub-encabezado">
                  <i class="material-icons">tune</i>
                  <span>Características Técnicas</span>
                </div>
                <Caracteristicas_tecnicas
                  bind:caracteristicas_tecnicas={nuevo_producto.caracteristicas_tecnicas}
                />
              </div>

              <div class="tarjeta-interior">
                <div class="sub-encabezado">
                  <i class="material-icons">photo_library</i>
                  <span>Galería de Imágenes</span>
                </div>
                <Uploader
                  bind:galeria_imagenes_original={nuevo_producto.galeria_imagenes}
                />
              </div>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Rol Diseñador -->
      <div class="tab-contenido-cuerpo" style="max-width: 800px; margin: 20px auto;">
        <div class="panel-tab">
          <div class="sub-encabezado">
            <i class="material-icons">photo_library</i>
            <span>Galería de Imágenes</span>
          </div>
          <Uploader
            bind:galeria_imagenes_original={nuevo_producto.galeria_imagenes}
          />
        </div>
      </div>
    {/if}
  </div>

  <!-- Footer con botones de acción acoplado fijamente al fondo de la vista -->
  <div class="footer-acciones">
    <div class="footer-resumen">
      {#if nuevo_producto.codigo || nuevo_producto.nombre}
        <span class="badge-resumen-sku">{nuevo_producto.codigo || "SIN CÓDIGO"}</span>
        <span class="resumen-nombre">{nuevo_producto.nombre || ""}</span>
      {/if}
    </div>
    <div class="footer-botones">
      <Button on:click={cancelar} outlined color="primary" style="margin-right: 12px;">
        <i class="material-icons" style="margin-right: 6px;">close</i> Cancelar
      </Button>
      <Button color="primary" raised on:click={subir}>
        <i class="material-icons" style="margin-right: 6px;">save</i> Guardar Producto
      </Button>
    </div>
  </div>
</div>

<style>
  .contenedor_ventana {
    height: 100% !important;
    max-height: 100% !important;
    display: flex;
    flex-direction: column;
    position: relative;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    box-sizing: border-box;
    background: #f1f5f9 !important;
    border: none !important;
    overflow: hidden;
  }

  .modulo-tabs-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px 20px 24px;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    scrollbar-width: thin;
  }

  .tabs-nav-container {
    background: transparent;
  }

  .tabs-nav {
    display: flex;
    gap: 4px;
    background: #e2e8f0;
    padding: 6px 8px 0 8px;
    border: 1px solid #cbd5e1;
    border-bottom: none;
    border-radius: 10px 10px 0 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs-nav::-webkit-scrollbar {
    display: none;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 20px;
    border: none;
    background: transparent;
    color: #475569;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    transition: all 0.2s ease;
    white-space: nowrap;
    border-top: 3px solid transparent;
  }

  .tab-btn i {
    font-size: 19px;
  }

  .tab-btn:hover {
    color: #0f172a;
    background: rgba(255, 255, 255, 0.6);
  }

  .tab-btn.activo {
    color: #0284c7;
    background: #ffffff;
    font-weight: 700;
    border-top: 3px solid #0284c7;
    box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.03);
  }

  .badge-cfdi {
    background: #e0f2fe;
    color: #0284c7;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 9999px;
    margin-left: 2px;
  }

  .tab-contenido-cuerpo {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 0 0 12px 12px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
    overflow: visible;
  }

  .panel-tab {
    padding: 24px;
    box-sizing: border-box;
  }

  .grid-2-col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }

  @media (max-width: 650px) {
    .grid-2-col {
      grid-template-columns: 1fr;
    }
  }

  .grid-3-col {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }

  @media (max-width: 780px) {
    .grid-3-col {
      grid-template-columns: 1fr;
    }
  }

  .grid-2-col-secciones {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    align-items: start;
  }

  @media (max-width: 950px) {
    .grid-2-col-secciones {
      grid-template-columns: 1fr;
    }
  }

  .tarjeta-interior {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 18px;
    box-sizing: border-box;
  }

  .sub-encabezado {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e2e8f0;
  }

  .sub-encabezado i {
    color: #0284c7;
    font-size: 20px;
  }

  .campo {
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
    width: 100%;
  }

  .etiqueta-campo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
    letter-spacing: 0.2px;
  }

  .etiqueta-campo .req {
    color: #ef4444;
    font-weight: bold;
    margin-left: 2px;
  }

  .contador {
    font-size: 11px;
    color: #64748b;
    font-weight: normal;
  }

  .opciones-comerciales {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 24px;
    padding: 12px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-top: 8px;
  }

  .opcion-chk {
    display: flex;
    align-items: center;
  }

  .texto-chk {
    font-size: 13.5px;
    color: #1e293b;
    font-weight: 500;
  }

  .icono-paq {
    color: #0284c7;
    font-size: 18px;
    margin-right: 4px;
  }

  .banner-sat {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
  }

  .icono-sat {
    color: #0284c7;
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .banner-sat strong {
    color: #0369a1;
    font-size: 14px;
    display: block;
    margin-bottom: 4px;
  }

  .banner-sat p {
    margin: 0;
    color: #0c4a6e;
    font-size: 13px;
    line-height: 1.45;
  }

  .precio-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .signo-moneda {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0284c7;
  }

  .control-select,
  .control-input {
    width: 100%;
    box-sizing: border-box;
    min-height: 42px;
    padding: 8px 12px;
    background: #ffffff;
    color: #1e293b;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13.5px;
    transition: all 0.2s ease;
  }

  .control-select:focus,
  .control-input:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
  }

  .footer-acciones {
    flex-shrink: 0;
    width: 100%;
    background: #ffffff;
    border-top: 1px solid #cbd5e1;
    padding: 12px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.08);
    box-sizing: border-box;
    z-index: 10;
  }

  .footer-resumen {
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
  }

  .badge-resumen-sku {
    background: #0f172a;
    color: #f8fafc;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: monospace;
    white-space: nowrap;
  }

  .resumen-nombre {
    font-size: 13px;
    color: #334155;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }

  .footer-botones {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .vertical-alineado {
    vertical-align: middle;
  }
</style>
