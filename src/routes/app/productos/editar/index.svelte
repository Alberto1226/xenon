<script>
  //   EDITAR PRODUCTO
  import Marca from "./_componentes/Marca.svelte";
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

  const plantilla_producto = {
    codigo: "",
    nombre: "",
    precio: 0,
    precio_compra: 0,
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

  onMount(() => {
    setTimeout(() => {
      if ($editar_store.producto) {
        nuevo_producto = $editar_store.producto;
      } else {
        nuevo_producto = JSON.parse(JSON.stringify(plantilla_producto));
      }
    }, 500);
  });

  $: if ($editar_store.producto) {
    nuevo_producto = $editar_store.producto;
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
  <div class="grid-container">
    {#if $usuario_db.rol != "diseñador"}
      <div class="area_info_general margen caja" style="overflow: auto;">
        <div class="subtitulo">Información general</div>
        <div class="contenido_caja">
          <Textfield
            outlined
            id="codigo_input"
            bind:value={nuevo_producto.codigo}
            placeholder="Código*"
            message="Código*"
            type="text"
          />

          <Textfield
            outlined
            id="codigo_de_barras_input"
            bind:value={nuevo_producto.codigo_de_barras}
            placeholder="Código de barras"
            message="Código de barras"
            type="text"
          />

          <Textfield
            outlined
            bind:value={nuevo_producto.nombre}
            placeholder="Nombre*"
            message={`Nombre* (${30 - nuevo_producto.nombre.length} caracteres restantes)`}
            type="text"
            maxlength="30"
          />

          <Textfield
            outlined
            bind:value={nuevo_producto.descripcion}
            placeholder="Descripción"
            message={`Descripción* (${60 - nuevo_producto.descripcion.length} caracteres restantes)`}
            type="text"
            maxlength="30"
          />

          <table>
            <tr>
              <td style="width: 50%;">
                <Marca bind:marca={nuevo_producto.marca} />
              </td>
              <td style="width: 50%;">
                <Unidad bind:unidad={nuevo_producto.unidad} />
              </td>
            </tr>
          </table>
          <!-- <Categoria bind:categoria={nuevo_producto.categoria} /> -->
          <Checkbox {...props} bind:checked={nuevo_producto.para_venta_publico}>
            Para venta al público
          </Checkbox>
        </div>
      </div>
      <div class="area_carac_tecnicas margen caja">
        <div class="subtitulo">Características técnicas</div>
        <div class="contenido_caja">
          <Caracteristicas_tecnicas
            bind:caracteristicas_tecnicas={nuevo_producto.caracteristicas_tecnicas}
          />
        </div>
      </div>
      <div class="area_precios margen caja">
        <div class="subtitulo">Precios</div>
        <div class="contenido_caja">
          <table style="width: 99%;">
            <tr>
              <td>
                <span class="indice_row">$</span>
              </td>
              <td>
                {#if $usuario_db.rol === "administrador"}
                  <Textfield
                    outlined
                    bind:value={nuevo_producto.precio}
                    placeholder="Precio público*"
                    message="Precio público*"
                    type="number"
                  />
                {/if}
              </td>
            </tr>
            <tr>
              <td>
                <span class="indice_row">$</span>
              </td>
              <td>
                {#if $usuario_db.rol === "administrador"}
                  <Textfield
                    outlined
                    bind:value={nuevo_producto.precio_compra}
                    placeholder="Precio Compra*"
                    message="Precio Compra*"
                    type="number"
                  />
                {/if}
              </td>
            </tr>
          </table>

          <Checkbox
            {...props}
            bind:checked={nuevo_producto.recomendar_como_paqueteria}
          >
            <i class="material-icons vertical-alineado">local_shipping</i> Recomendar
            como paquetería
          </Checkbox>
          <Checkbox
            {...props}
            bind:checked={nuevo_producto.aplicar_descuento_distribuidor}
          >
            Aplicar descuento distribuidor
          </Checkbox>
          <Precios bind:precio_publico={nuevo_producto.precio} />
        </div>
      </div>
      <div class="existencias margen caja">
        <div class="subtitulo">Existencias</div>
        <div class="contenido_caja">
          {#if $usuario_db.rol === "administrador"}
            <table>
              <tr>
                <td colspan="2">
                  <Textfield
                    outlined
                    bind:value={nuevo_producto.existencia.actual}
                    placeholder="Existencia Actual*"
                    message="Existencia Actual*"
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td style="width: 50%;">
                  <Textfield
                    outlined
                    bind:value={nuevo_producto.existencia.minimo}
                    placeholder="Mínimo"
                    message="Mínimo"
                    type="number"
                  />
                </td>
                <td style="width: 50%;">
                  <Textfield
                    outlined
                    bind:value={nuevo_producto.existencia.maximo}
                    placeholder="Máximo"
                    message="Máximo"
                    type="number"
                  />
                </td>
              </tr>
            </table>
          {/if}
        </div>
      </div>
      <div class="masterbox margen caja">
        <div class="subtitulo">Master Box</div>
        <div class="contenido_caja">
          <Textfield
            outlined
            bind:value={nuevo_producto.master_box}
            placeholder="Unidades por caja"
            message={"Unidades por caja (en base a: " + (nuevo_producto.unidad || "unidad") + ")"}
            type="number"
          />
        </div>
      </div>
      <div class="imagenes margen caja">
        <div class="subtitulo">Imágenes</div>
        <div class="contenido_caja">
          <Uploader
            bind:galeria_imagenes_original={nuevo_producto.galeria_imagenes}
          />
        </div>
      </div>
    {/if}

    <!-- <Button on:click={MandarImagenApiPuente($lista_archivos_uploads)}>
      <i class="material-icons">arrow_back</i> Enviar Imagen Prueba
    </Button> -->

    {#if $usuario_db.rol == "diseñador"}
      <div class="imagenes margen caja">
        <div class="subtitulo">Imágenes</div>
        <div class="contenido_caja">
          <Uploader
            bind:galeria_imagenes_original={nuevo_producto.galeria_imagenes}
          />
        </div>
      </div>
    {/if}

  </div>

  <div class="footer-acciones">
    <Button on:click={cancelar} outlined color="primary" style="margin-right: 12px;">
      <i class="material-icons" style="margin-right: 6px;">close</i> Cancelar
    </Button>
    <Button color="primary" raised on:click={subir}>
      <i class="material-icons" style="margin-right: 6px;">save</i> Guardar
    </Button>
  </div>
</div>

<style>
  .contenedor_ventana {
    height: calc(100vh - 85px) !important;
    max-height: calc(100vh - 85px) !important;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    position: relative;
    scrollbar-width: thin;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
    padding: 20px;
    flex-grow: 1;
  }

  .margen {
    margin: 5px;
  }

  .subtitulo {
    background: linear-gradient(90deg, #1e293b 0%, #0f172a 100%);
    color: #cbd5e1;
    font-weight: 700;
    font-size: 0.9em;
    text-align: center;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .caja {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    transition: border-color 0.3s ease;
  }

  .caja:hover {
    border-color: rgba(59, 130, 246, 0.3);
  }

  .contenido_caja {
    padding: 16px;
  }

  .footer-acciones {
    position: sticky;
    bottom: 0;
    background: #0b1320;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 16px 24px;
    display: flex;
    justify-content: flex-end;
    z-index: 100;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.2);
  }

  .vertical-alineado {
    vertical-align: middle;
    margin-right: 4px;
  }

  .indice_row {
    font-size: 1.2em;
    color: #94a3b8;
    margin-right: 8px;
  }
</style>
