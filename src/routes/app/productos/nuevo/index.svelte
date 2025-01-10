<script>
  import Marca from "./_componentes/Marca.svelte";
  import Unidad from "./_componentes/Unidad_medida.svelte";
  import Categoria from "./_componentes/Categoria.svelte";
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
  import { mensajes_app, productos, postData } from "./../../../stores";
  import { onMount } from "svelte";
  import { lista_archivos_uploads } from "./_componentes/stores_admon";
  import { goto } from "@sapper/app";
  export var referencia;

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
    categoria: "",
    unidad: "",
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
    $mensajes_app.push({ tipo: "exito", mensaje: "Producto creado" });
    $mensajes_app = $mensajes_app;
  }

  function subir() {
    if (checar_formulario_falta_algo() == true) {
      //console.log('algo falta');

      return;
    }
    subiendo = true;
    var data = nuevo_producto;
    data.archivos = $lista_archivos_uploads;
    var url = "app/productos/nuevo/crear_producto";
    postData(url, data)
      .then((res) => {
        //console.log(res);
        mostrar_exito();
        var producto_tmp = res.producto;
        producto_tmp.fh_creado = new Date(producto_tmp.fh_creado);
        $productos.lista.push(producto_tmp);
        $productos.lista.sort(function (a, b) {
          return a.nombre > b.nombre;
        });
        $productos = $productos;
        subiendo = false;
        subido = true;
        setTimeout(() => {
          goto("app/productos");
          $lista_archivos_uploads = [];
        }, 1000);
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
</script>

<div class="contenedor_ventana" in:fly={{ x: 10, duration: 500 }}>
  <div class="grid-container">
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
          message={`Descripción* (${30 - nuevo_producto.descripcion.length} caracteres restantes)`}
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
        <Categoria bind:categoria={nuevo_producto.categoria} />
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
              <Textfield
                outlined
                bind:value={nuevo_producto.precio}
                placeholder="Precio público*"
                message="Precio público*"
                type="number"
              />
            </td>
          </tr>
        </table>
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
        <Textfield
          outlined
          bind:value={nuevo_producto.existencia.actual}
          placeholder="Existencias"
          message="Existencias"
          type="number"
        />
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
      </div>
    </div>
    <div class="imagenes margen caja">
      <div class="subtitulo">Imágenes</div>
      <div class="contenido_caja">
        <Uploader />
      </div>
    </div>
    <div class="area_footer1" />
    <div class="area_footer2">
      <Button color="primary" on:click={subir}>crear nuevo</Button>
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
    /* overflow: auto !important; */
    border-radius: 8px;
  }
  .contenido_caja {
    padding: 9px;
    /* overflow: hidden; */
  }
</style>
