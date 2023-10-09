<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import {
    ui,
    productos,
    postData,
    formato_precio,
    usuario_db,
    buscadores,
    paginas_actuales,
    accion_buscar, //  accion de buscar desde stores  uso    $accion_buscar.productos
  } from "./../../stores";
  import Row from "./_Row.svelte";
  import Heading from "./_Heading_tablar.svelte";
  import { onMount } from "svelte";
  import { goto } from "@sapper/app";
  import { storeWithDebounce } from "./storez.js";
  import Paginacion from "./../componentes/paginacion/index.svelte";
  var buscando = "";
  var pagina_actual = 1;
  let lista_completa_para_descarga = [];
  let virgen = true;
  var ancho_side_panel = 250;
  var limite_lista = 10;
  var total_registros = 0;
  var coincidencias = 0;
  var indice_inicio = 0;
  var indice_final = 6;
  var lista = [];
  var viendo_carritos_reservados = false;
  onMount(() => {
    buscando = $buscadores.productos;
    pagina_actual = $productos.pagina_actual;
    obtener_productos_por_pagina();
    if ($productos.lista.length > 0) {
      virgen = false;
      lista = $productos.lista;
      return;
    }

    // obtener_productos_por_pagina();
    virgen = false;
  });

  $: indice_final = indice_inicio + limite_lista;

  $: if ($accion_buscar.valor === true) {
    // console.log("psaca");
    setTimeout(() => {
      $accion_buscar.valor = false;
      obtener_productos_por_pagina();
    }, 200);
  }

  $: if (ha_cambiado_pagina_actual == true) {
    ha_cambiado_pagina_actual = false;
    cargar_pagina();
  }
  /*


$: if($storeWithDebounce  ){
  setTimeout(()=>{
   // $accion_buscar.productos = false;
    //$paginas_actuales.productos = 1;
    //$accion_buscar = false;
    obtener_productos_por_pagina();
  },100)
}
*/

  /*
  $: if (buscando.length == 0) {
    obtener_productos_por_pagina();
    //console.log('unos')
  }
  $: if (buscando.length > 0) {
    obtener_productos_por_pagina();
    //console.log('dos')
  }
*/
  var total_paginas = 0; //Math.floor($productos.total_registros / limite_lista);

  var texto_buscado = ""; // ayuda para aminorar carga

  var http_ocupado = false;
  var http_ocupado_archivo = false;
  let busqueda_dinamica = "";
  let busqueda_coincidencias = 0;
  var ha_cambiado_pagina_actual = false;

  const obtener_productos_por_pagina = async () => {
    if (http_ocupado) return;
    http_ocupado = true;
    let respuesta = await get_productos(
      $buscadores.productos,
      $productos.pagina_actual
    );
    http_ocupado = false;
    if (respuesta.ok === false) {
      console.log("Ups, no se pudo descargar la lista de productos");
      return;
    }
    $productos.lista_actualizada = new Date();
    $productos.lista = respuesta.lista;
    //lista = respuesta.lista;
    $productos.paginas = respuesta.paginas;
    if ($buscadores.productos === "")
      $productos.total_registros = respuesta.numero_total;
    $productos.coincidencias = respuesta.coincidencias;
  };

  function obtener_productos_descarga_csv() {
    return new Promise((resolve, reject) => {
      if (http_ocupado_archivo) return;
      http_ocupado = true;
      postData("app/productos/lista_de_todos_los_productos", {})
        .then(async (res) => {
          setTimeout(() => {
            //console.log(res);
            http_ocupado_archivo = false;
          }, 200);
          if (res.ok) {
            lista_completa_para_descarga = res.lista;
            resolve(res.lista);
          }
        })
        .catch((err) => {
          console.log(err);
          http_ocupado_archivo = false;
          reject(err);
        });
    });
  }

  var delayTimer;

  function cargar_pagina() {
    // $productos.pagina_actual++;
    $paginas_actuales.productos = $productos.pagina_actual;

    console.log($productos.pagina_actual);
    obtener_productos_por_pagina();
  }

  function siguiente(params) {
    if ($productos.pagina_actual < $productos.paginas) {
      $productos.pagina_actual++;
      $paginas_actuales.productos = $productos.pagina_actual;

      console.log($productos.pagina_actual);
      obtener_productos_por_pagina();
    }
  }

  function anterior(params) {
    if ($productos.pagina_actual > 1) {
      $productos.pagina_actual--;
      $paginas_actuales.productos = $productos.pagina_actual;
      obtener_productos_por_pagina();
    }
  }

  async function preparar_texto() {
    return new Promise((resolve, reject) => {
      let rows = [
        [
          "Código",
          "Nombre",
          "Marca",
          "Categoría",
          "Existencias",
          "Disponibles",
          "Precio",
        ],
      ];
      if (lista_completa_para_descarga.length == 0) {
        reject();
      }
      for (let i = 0; i < lista_completa_para_descarga.length; i++) {
        const element = lista_completa_para_descarga[i];
        rows.push([
          element.codigo,
          element.nombre,
          element.marca,
          element.subcategoria.nombre,
          element.existencia.actual,
          +element.existencia.actual - +sumar_cantidades(element),
          formato_precio(element.precio),
        ]);
        if (i + 1 === lista_completa_para_descarga.length) {
          resolve(rows);
        }
      }
    });
  }

  async function crear_documento_csv() {
    lista_completa_para_descarga = [];
    await obtener_productos_descarga_csv();
    preparar_texto().then((archivo) => {
      let fecha_temp =
        new Date().getDate() +
        "_" +
        new Date().getMonth() +
        "_" +
        new Date().getUTCFullYear() +
        " " +
        new Date().getHours() +
        "-" +
        new Date().getMinutes();
      exportToCsv("Productos_sistema" + fecha_temp + ".csv", archivo);
    });
  }

  function exportToCsv(filename, rows) {
    var processRow = function (row) {
      var finalVal = "";
      for (var j = 0; j < row.length; j++) {
        var innerValue = row[j] === null ? "" : row[j].toString();
        if (row[j] instanceof Date) {
          innerValue = row[j].toLocaleString();
        }
        var result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
        if (j > 0) finalVal += ",";
        finalVal += result;
      }
      return finalVal + "\n";
    };

    var csvFile = "";
    for (var i = 0; i < rows.length; i++) {
      csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], { type: "text/csv;charset=utf-8;" });
    if (navigator.msSaveBlob) {
      // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      var link = document.createElement("a");
      if (link.download !== undefined) {
        var url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  function sumar_cantidades(producto_temp) {
    if (producto_temp.carritos == undefined) {
      return 0;
    }
    if (producto_temp.carritos.length == 0 || producto_temp.carritos == [""]) {
      return 0;
    }
    return producto_temp.carritos.reduce((a, b) => +a + +b.cantidad, 0);
  }

  const recargar_despues_de_borrar = () => {
    //  buscando="";
    //$buscadores.productos="";
    lista = [];
    $productos.lista = [];
    setTimeout(() => {
      goto("app/productos/borrando");
    }, 500);
  };

  function handle_buscar(evt) {
    if (http_ocupado === true) return;

    if (evt.key === "Backspace" && buscando === "") {
      $buscadores.productos = buscando;
      $productos.pagina_actual = 1;
      $paginas_actuales.productos = 1;
      obtener_productos_por_pagina();
      return;
    }
    if (evt.key === "Enter") {
      $buscadores.productos = buscando;
      $productos.pagina_actual = 1;
      $paginas_actuales.productos = 1;
      obtener_productos_por_pagina();
      return;
    }
    //doSearch();
  }

  const fn_obtener_productos_por_pagina2 = async () => {
    let res = await obtener_productos_por_pagina(
      $buscadores.productos,
      $paginas_actuales.productos
    );
    console.log(res);
  };

  export const get_productos = (buscar, pagina_actual, activo) => {
    return new Promise((resolver, rechazar) => {
      postData("app/productos/lista_de_activos_e_inactivos", {
        buscando: buscar,
        pagina_actual: pagina_actual,
        activo,
      })
        .then(async (res) => {
          resolver(res);
          return;
        })
        .catch((err) => {
          console.log(err);
          return rechazar({ ok: false, err });
          //http_ocupado = false;
        });
    });
  };
</script>

<div class="buscador">
  <table>
    <tr>
      <td>
        <Textfield
          placeholder="Buscar"
          class=""
          bind:value={buscando}
          on:keyup={handle_buscar}
        />
      </td>
      <td>
        <Button
          on:click={() => {
            $productos.pagina_actual = 1;
            $paginas_actuales.productos = 1;
            obtener_productos_por_pagina();
          }}
          icon
        >
          <i class="material-icons">search</i>
        </Button>
      </td>
    </tr>
  </table>
</div>
<div class="contenedor_ventana" style="overflow-y: auto;">
  {#if http_ocupado}
    <!-- HTTP OCUPADO -->
    <div class="centrado">cargando...</div>
  {:else}
    <!-- HTTP LIBRE -->
    {#if $productos.lista.length === 0}
      <!-- SIN RESULTADOS -->
      No existen resultados.
    {:else}
      <!-- SI HAY RESULTADOS -->
      <Heading />
      {#each $productos.lista as producto, i (producto._id)}
        <!-- REGISTRO -->
        <Row
          indice={i}
          {producto}
          on:recargar_lista={() => {
            recargar_despues_de_borrar();
          }}
          on:producto_seleccioando
          on:editar_producto
        />
      {/each}
    {/if}
  {/if}
</div>

<div style="width: 100%; position: absolute;bottom: 30px;">
  <table style="width:100%;">
    <tr>
      <td style="width:150px;">
        {#if $usuario_db.rol != "vendedor"}
          <!-- content here -->
          <Button
            disabled={http_ocupado_archivo}
            on:click={crear_documento_csv}
            color="green"
            title="Descargar Archivo de Excel"
          >
            <i class="material-icons">description</i>
            {http_ocupado_archivo ? "Descargando..." : "Descargar"}
          </Button>
        {/if}
      </td>
      <td>
        <div class="centrado " style="width: fit-content;margin: 0 auto;">
          <!--- FLECHAS -->

          <Paginacion
            bind:total_paginas={$productos.paginas}
            bind:ha_cambiado_pagina_actual
            bind:pagina_actual={$productos.pagina_actual}
          />

          <!-- <Button
            disabled={$paginas_actuales.productos == 1 || http_ocupado}
            on:click={anterior}>
            <i class="material-icons">keyboard_arrow_left</i>
          </Button>
          {$productos.pagina_actual} / {$productos.paginas}
          <Button
            disabled={$paginas_actuales.productos == $productos.paginas || http_ocupado}
            on:click={siguiente}>
            <i class="material-icons">keyboard_arrow_right</i>
          </Button> -->
        </div>
      </td>

      <td class="paginado_cometarios">
        Productos : {$productos.total_registros}
        <br />
        {#if buscando != ""}
          <!-- content here -->
          Coincidencias {$productos.coincidencias}
        {/if}
      </td>
    </tr>
  </table>
</div>

<style>
  .paginado_cometarios {
    color: gray;
    font-weight: 600;
    font-size: 0.8em;
  }

  .buscador {
    position: absolute;
    margin: -75px 0 0 0;
    z-index: 1;
    padding-left: 50px;
  }
</style>
