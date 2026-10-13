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
  <div class="modulo-secciones-wrapper">
    {#if $usuario_db.rol != "diseñador"}
      <div class="secciones-verticales">

        <!-- SECCIÓN 1: INFORMACIÓN GENERAL -->
        <div class="card-sec card-sec-azul">
          <div class="sec-header sec-azul">
            <span class="sec-icon"><i class="material-icons">inventory_2</i></span>
            <div class="sec-titulo">
              <span class="sec-num">1</span>
              <h4>Identificación General</h4>
              <span class="sec-sub">Código, nombre, descripción, marca y unidad del producto</span>
            </div>
          </div>

          <div class="sec-body">
          <div class="form-row">
            <div class="form-group fg-medium">
              <label class="form-label">Código (SKU) <span class="req">*</span></label>
              <Textfield
                outlined
                id="codigo_input"
                bind:value={nuevo_producto.codigo}
                placeholder="Ej. LL-11R22.5"
                type="text"
              />
            </div>
            <div class="form-group fg-medium">
              <label class="form-label">Código de barras</label>
              <Textfield
                outlined
                bind:value={nuevo_producto.codigo_de_barras}
                placeholder="EAN / UPC"
                type="text"
              />
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group fg-large">
              <label class="form-label">
                Nombre del producto <span class="req">*</span>
                <span class="contador">{30 - (nuevo_producto.nombre ? nuevo_producto.nombre.length : 0)} caract.</span>
              </label>
              <Textfield
                outlined
                bind:value={nuevo_producto.nombre}
                placeholder="Nombre comercial"
                type="text"
                maxlength="30"
              />
            </div>
            <div class="form-group fg-large">
              <label class="form-label">
                Descripción comercial <span class="req">*</span>
                <span class="contador">{60 - (nuevo_producto.descripcion ? nuevo_producto.descripcion.length : 0)} caract.</span>
              </label>
              <Textfield
                outlined
                bind:value={nuevo_producto.descripcion}
                placeholder="Descripción o especificación comercial"
                type="text"
                maxlength="60"
              />
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group fg-medium">
              <label class="form-label">Marca</label>
              <Marca bind:marca={nuevo_producto.marca} />
            </div>
            <div class="form-group fg-medium">
              <label class="form-label">Unidad de medida</label>
              <Unidad bind:unidad={nuevo_producto.unidad} />
            </div>
          </div>

          <div class="opciones-comerciales mt-3">
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
          </div><!-- /sec-body -->
        </div>

        <!-- SECCIÓN 2: CONFIGURACIÓN FISCAL SAT -->
        <div class="card-sec card-sec-violeta">
          <div class="sec-header sec-violeta">
            <span class="sec-icon"><i class="material-icons">receipt_long</i></span>
            <div class="sec-titulo">
              <span class="sec-num">2</span>
              <h4>Configuración Fiscal SAT</h4>
              <span class="sec-sub">Claves y tasas para facturación CFDI 4.0</span>
            </div>
            <span class="badge-cfdi">CFDI 4.0</span>
          </div>

          <div class="sec-body">
          <div class="banner-sat">
            <i class="material-icons icono-sat">verified</i>
            <div>
              <strong>Datos obligatorios para facturación electrónica</strong>
              <p>Independientes de pedimentos y costos de importación.</p>
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group fg-large">
              <label class="form-label">Clave Producto/Servicio (ClaveProdServ)</label>
              <SelectSat
                catalogo="producto"
                bind:valor={nuevo_producto.sat_clave_prod_serv}
                placeholder="Clave de 8 dígitos o buscar por nombre..."
              />
            </div>
            <div class="form-group fg-large">
              <label class="form-label">Clave de Unidad SAT (ClaveUnidad)</label>
              <SelectSat
                catalogo="unidad"
                bind:valor={nuevo_producto.sat_clave_unidad}
                placeholder="Clave (Ej. H87) o buscar por nombre..."
              />
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group fg-medium">
              <label class="form-label">Objeto de Impuesto (SAT)</label>
              <select class="control-select" bind:value={nuevo_producto.sat_objeto_impuesto}>
                <option value="">Sin configurar</option>
                <option value="01">01 - No objeto de impuesto</option>
                <option value="02">02 - Sí objeto de impuesto</option>
                <option value="03">03 - Sí objeto, no obligado al desglose</option>
                <option value="04">04 - Sí objeto, no causa impuesto</option>
              </select>
            </div>
            <div class="form-group fg-small">
              <label class="form-label">IVA en Venta</label>
              <select class="control-select" bind:value={nuevo_producto.impuestos_venta.iva}>
                <option value="">Sin configurar</option>
                <option value="16">Tasa 16%</option>
                <option value="8">Tasa 8%</option>
                <option value="0">Tasa 0%</option>
                <option value="exento">Exento</option>
                <option value="no_aplica">No aplica</option>
              </select>
            </div>
            <div class="form-group fg-small">
              <label class="form-label">IEPS Venta (%)</label>
              <input
                class="control-input"
                type="number"
                min="0" max="100" step="0.000001"
                placeholder="0.00"
                bind:value={nuevo_producto.impuestos_venta.ieps_tasa_porcentaje}
              />
            </div>
          </div>
          </div><!-- /sec-body -->
        </div>

        <!-- SECCIÓN 3: PRECIOS E INVENTARIO -->
        <div class="card-sec card-sec-ambar">
          <div class="sec-header sec-ambar">
            <span class="sec-icon"><i class="material-icons">monetization_on</i></span>
            <div class="sec-titulo">
              <span class="sec-num">3</span>
              <h4>Precios e Inventario</h4>
              <span class="sec-sub">Precio público, compra, existencias y Master Box</span>
            </div>
          </div>

          <div class="sec-body">
          <div class="grid-2-col-secciones">
            <!-- Precios y Descuentos -->
            <div class="tarjeta-interior">
              <div class="sub-encabezado">
                <i class="material-icons">payments</i>
                <span>Precios y Descuentos</span>
              </div>

              {#if $usuario_db.rol === "administrador"}
                <div class="form-row" style="margin-bottom: 16px;">
                  <div class="form-group fg-medium">
                    <label class="form-label">Precio Público <span class="req">*</span></label>
                    <div class="precio-row">
                      <span class="signo-moneda">$</span>
                      <div style="flex-grow: 1;">
                        <Textfield outlined bind:value={nuevo_producto.precio} placeholder="0.00" type="number" />
                      </div>
                    </div>
                  </div>
                  <div class="form-group fg-medium">
                    <label class="form-label">Precio Compra <span class="req">*</span></label>
                    <div class="precio-row">
                      <span class="signo-moneda">$</span>
                      <div style="flex-grow: 1;">
                        <Textfield outlined bind:value={nuevo_producto.precio_compra} placeholder="0.00" type="number" />
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

            <!-- Inventario & Empaque -->
            <div class="tarjeta-interior">
              <div class="sub-encabezado">
                <i class="material-icons">warehouse</i>
                <span>Control de Inventario y Empaque</span>
              </div>

              {#if $usuario_db.rol === "administrador"}
                <div class="form-row" style="margin-bottom: 16px;">
                  <div class="form-group fg-small">
                    <label class="form-label">Existencia Actual <span class="req">*</span></label>
                    <Textfield outlined bind:value={nuevo_producto.existencia.actual} placeholder="0" type="number" />
                  </div>
                  <div class="form-group fg-small">
                    <label class="form-label">Stock Mínimo</label>
                    <Textfield outlined bind:value={nuevo_producto.existencia.minimo} placeholder="0" type="number" />
                  </div>
                  <div class="form-group fg-small">
                    <label class="form-label">Stock Máximo</label>
                    <Textfield outlined bind:value={nuevo_producto.existencia.maximo} placeholder="0" type="number" />
                  </div>
                </div>
              {/if}

              <div class="form-group">
                <label class="form-label">
                  Master Box (unidades por caja)
                  <span class="contador">Base: {nuevo_producto.unidad || "unidad"}</span>
                </label>
                <Textfield outlined bind:value={nuevo_producto.master_box} placeholder="Unidades por empaque" type="number" />
              </div>
            </div>
          </div>
          </div><!-- /sec-body -->
        </div>

        <!-- SECCIÓN 4: FICHA TÉCNICA E IMÁGENES -->
        <div class="card-sec card-sec-verde">
          <div class="sec-header sec-verde">
            <span class="sec-icon"><i class="material-icons">photo_library</i></span>
            <div class="sec-titulo">
              <span class="sec-num">4</span>
              <h4>Ficha Técnica e Imágenes</h4>
              <span class="sec-sub">Especificaciones técnicas y galería de imágenes del producto</span>
            </div>
          </div>

          <div class="sec-body">
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
          </div><!-- /sec-body -->
        </div>

      </div>
    {:else}
      <!-- Rol Diseñador: sólo imágenes -->
      <div class="secciones-verticales">
        <div class="card-sec card-sec-verde">
          <div class="sec-header sec-verde">
            <span class="sec-icon"><i class="material-icons">photo_library</i></span>
            <div class="sec-titulo">
              <span class="sec-num">1</span>
              <h4>Galería de Imágenes</h4>
              <span class="sec-sub">Sube y gestiona las imágenes del producto</span>
            </div>
          </div>
          <Uploader bind:galeria_imagenes_original={nuevo_producto.galeria_imagenes} />
        </div>
      </div>
    {/if}
  </div>

  <!-- Footer fijo con botones de acción -->
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

  .modulo-secciones-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px 24px 24px;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    scrollbar-width: thin;
  }

  /* ── SECCIONES VERTICALES (patrón pedimentos) ── */
  .secciones-verticales {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .card-sec {
    background: #ffffff;
    border-radius: 12px;
    border-left: 5px solid var(--sec-color, #3498db);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    overflow: visible;
  }

  .card-sec-azul    { --sec-color: #2563eb; --sec-fondo: #dbeafe; --sec-texto: #1e40af; }
  .card-sec-violeta { --sec-color: #7c3aed; --sec-fondo: #ede9fe; --sec-texto: #5b21b6; }
  .card-sec-ambar   { --sec-color: #d97706; --sec-fondo: #fef3c7; --sec-texto: #92400e; }
  .card-sec-verde   { --sec-color: #059669; --sec-fondo: #d1fae5; --sec-texto: #064e3b; }

  .sec-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: var(--sec-fondo);
    border-radius: 7px 7px 0 0;
  }

  .sec-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: var(--sec-color);
    color: #ffffff;
    flex-shrink: 0;
  }

  .sec-icon i { font-size: 20px; }

  .sec-titulo {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sec-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--sec-color);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
  }

  .sec-titulo h4 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 700;
    color: var(--sec-texto);
  }

  .sec-sub {
    font-size: 12px;
    color: #64748b;
    font-weight: 400;
  }

  .sec-body {
    padding: 20px 22px;
  }

  /* ── FORM ROWS ── */
  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .fg-small  { flex: 1 1 120px; max-width: 200px; }
  .fg-medium { flex: 1 1 200px; }
  .fg-large  { flex: 1 1 280px; }

  @media (max-width: 650px) {
    .fg-small, .fg-medium, .fg-large { flex: 1 1 100%; max-width: 100%; }
  }

  .form-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }

  .mt-3 { margin-top: 16px; }

  .req {
    color: #ef4444;
    font-weight: bold;
    margin-left: 2px;
  }

  .contador {
    font-size: 11px;
    color: #64748b;
    font-weight: normal;
  }

  .badge-cfdi {
    background: #e0f2fe;
    color: #0284c7;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 9999px;
    margin-left: auto;
    flex-shrink: 0;
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
  }

  .opcion-chk { display: flex; align-items: center; }

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
    padding: 12px 16px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    margin-bottom: 16px;
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

  .grid-2-col-secciones {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 950px) {
    .grid-2-col-secciones { grid-template-columns: 1fr; }
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
    font-size: 13px;
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

  /* ── FOOTER FIJO ── */
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

  .vertical-alineado { vertical-align: middle; }
</style>
