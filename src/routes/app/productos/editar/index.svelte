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

  onMount(() => {
    setTimeout(() => {
      nuevo_producto = $editar_store.producto;
    }, 500);
  });
  $: if ($editar_store.producto) {
    nuevo_producto = $editar_store.producto;
  }
  var subiendo = false;
  var subido = false;
  var ancho_side_panel = 250;

  let props = {
    color: "primary",
    name: "svelte",
    value: "para venta al publico",
  };
  var nuevo_producto = {
    codigo: "",
    nombre: "",
    precio: 0,
    descripcion: "",
    marca: "",

    unidad: "Pieza",
    caracteristicas_tecnicas: [],
    galeria_imagenes: [],
    para_venta_publico: true,
    aplicar_descuento_distribuidor: true,
    existencia: { actual: 0, minimo: 0, maximo: 0 },
    carritos: [],
    activo: true,
  };

  function mostrar_error(error) {
    $mensajes_app.push({ tipo: "error", mensaje: "Error " + error });
    $mensajes_app = $mensajes_app;
  }

  function mostrar_exito(mensaje) {
    $mensajes_app.push({ tipo: "exito", mensaje: "Ficha creada" });
    $mensajes_app = $mensajes_app;
  }
  function subir() {
    if (checar_formulario_falta_algo() == true) {
      //console.log('algo falta');

      return;
    }
    var data = JSON.parse(JSON.stringify(nuevo_producto));

    subiendo = true;

    data.archivos = $lista_archivos_uploads;

    //console.log(data);
    var url = "app/productos/editar/editar_producto";
    postData(url, data)
      .then((res) => {
        //console.log(res);
        mostrar_exito();
        //var producto_tmp =res.producto;
        //producto_tmp.fh_creado = new Date(producto_tmp.fh_creado)
        let nueva_lista = $productos.lista;
        let producto_en_lista = nueva_lista.find(
          (element) => element._id === nuevo_producto._id,
        );
        producto_en_lista = nuevo_producto;
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

  async function MandarImagenApiPuente(archivos) {
    console.log("a", archivos[0].base64);
    let imgBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEBLAEsAAD/";
    let planta = "Pruebas";
    // let nameDB = process.env.DB;

    const myHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'multipart/form-data'
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
    )
      .then((response) => {
        if (response.status === 200) {
          return response.text();
        } else {
          throw new Error('Error en la respuesta');
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
            <!-- content here -->

            <!-- <Textfield
            outlined
            bind:value={nuevo_producto.existencia.actual}
            placeholder="Existencias"
            message="Existencias"
            type="number" /> -->
            <table>
              <tr>
                <td>
                  <Textfield
                    outlined
                    bind:value={nuevo_producto.existencia.minimo}
                    placeholder="Mínimo"
                    message="Mínimo"
                    type="number"
                  />
                </td>
                <td>
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

    <div class="area_footer1" />
    <div class="area_footer2">
      <Button on:click={cancelar}>
        <i class="material-icons">arrow_back</i> Cancelar
      </Button>
      <Button color="primary" on:click={subir}>
        <i class="material-icons">create</i> Editar
      </Button>
    </div>
    <div class="area_footer3" />
  </div>
</div>

<style>
  .grid-container {
    height: calc(100vh - 130px);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1.7fr 0.8fr px;
    grid-template-areas: "area_info_general area_info_general area_carac_tecnicas area_carac_tecnicas area_precios area_precios" "existencias existencias existencias imagenes imagenes imagenes" "area_footer1 area_footer1 area_footer2 area_footer2 area_footer3 area_footer3";
  }

  .area_info_general {
    grid-area: area_info_general;
    overflow: hidden;
  }

  .area_carac_tecnicas {
    grid-area: area_carac_tecnicas;
    overflow: hidden;
  }

  .area_precios {
    grid-area: area_precios;
    overflow: hidden;
  }

  .existencias {
    grid-area: existencias;
    overflow: hidden;
  }

  .imagenes {
    grid-area: imagenes;
    overflow: hidden;
  }

  .area_footer1 {
    grid-area: area_footer1;
  }

  .area_footer2 {
    grid-area: area_footer2;
  }

  .area_footer3 {
    grid-area: area_footer3;
  }
  .margen {
    margin: 5px;
  }
  .subtitulo {
    background-color: black;
    color: white;
    text-align: center;
    padding: 4px;
  }
  .caja {
    border: 1px gray solid;
    border-radius: 8px;
    /* overflow: auto !important; */
  }
  .contenido_caja {
    padding: 9px;
    /* overflow: hidden; */
  }
</style>
