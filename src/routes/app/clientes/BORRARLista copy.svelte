<script>
  import { Button } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import { ui, clientes, postData, usuario_db } from "./../../stores";

  import Row from "./_Row.svelte";
  import Heading from "./_Heading_tablar.svelte";
  import { onMount } from "svelte";
  export var buscando = "";
  export var pagina_actual = 1;

  var ancho_side_panel = 250;
  var limite_lista = 10;
  let lista_completa_para_descarga = [];
  var indice_inicio = 0;
  var indice_final = 6;
  let http_ultima_actividad_fecha = Date.now();
  var lista = [];
  let http_ocupado = false;
  var viendo_carritos_reservados = false;
  $: indice_final = indice_inicio + limite_lista;
  var total_paginas = Math.floor($clientes.total_registros / limite_lista);
  let diferencia = 1000;
  var texto_buscado = ""; // ayuda para aminorar carga
  let coincidencias=0;
  let total_registros = 0;
  $: if (buscando.length == 0) {
    obtener_clientes_por_pagina();
  }
  $: if (buscando.length > 0) {
    obtener_clientes_por_pagina();
  }

  onMount(() => {
    if ($clientes.lista.length > 0) {
      lista = $clientes.lista;
      return;
    }
    obtener_clientes_por_pagina();
  });

  function obtener_clientes_por_pagina() {
    if (http_ocupado) return;
    http_ocupado = true;
    //console.log("post a lista clientes");
    lista = [];
    postData("app/clientes/lista_de_clientes", {
      buscando: buscando,
      pagina_actual
    })
      .then(res => {
        setTimeout(() => {
          http_ocupado = false;
        }, 200);
        //console.log(res);
        if (res.ok) {
          $clientes.lista = res.lista;
          $clientes.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $clientes = $clientes;
          lista = $clientes.lista;
          $clientes.total_registros = res.numero_total;
          total_registros = res.numero_total;
          if (buscando === "") {
            total_paginas = Math.floor(res.numero_total / limite_lista);
          } else {
            coincidencias =
              res.coincidencias.length > 0
                ? res.coincidencias[0].coincidencias
                : 0;

            total_paginas = Math.floor(coincidencias / limite_lista);
          }
        }
      })
      .catch(err => {
        console.log(err);

        http_ocupado = false;
      });
  }

  function siguiente(params) {
    if (pagina_actual < total_paginas) {
      pagina_actual++;

      obtener_clientes_por_pagina();
    }
  }

  function anterior(params) {
    if (pagina_actual > 1) {
      pagina_actual--;

      indice_inicio -= limite_lista;
      if (indice_inicio <= 0) indice_inicio = 0;
    }

    obtener_clientes_por_pagina();
  }

  function filtrar_nuevo_arreglo() {
    var lista_previa = $clientes.lista;
    var lista_temp = lista_previa.filter(elemento =>
      incluye_busqueda(elemento)
    );
    //lista_filtrada = lista_temp;
    lista = lista_temp;
  }

  function refrescar_lista() {
    //console.log('asdas');

    obtener_clientes_por_pagina();
  }

  async function preparar_texto() {
    return new Promise(async (resolve, reject) => {
      let rows = [
        [
          "Nombre",
          "Agente",
          "Fecha de nacimiento",
          "Correo",
          "Telefonos",
          "Primer dirección",
          "id"
        ]
      ];
      if (lista_completa_para_descarga.length == 0) {
        reject();
      }
      for (let i = 0; i < lista_completa_para_descarga.length; i++) {
        const element = lista_completa_para_descarga[i];
        rows.push([
          element.nombre,
          element.agente.nombre,
          element.fecha_nacimiento ? element.fecha_nacimiento.toString() : "",
          element.correo,
          await crear_lista_telefonos(element),
          arreglar_direccion(element.direcciones_asociadas[0]),
          element._id
        ]);
        if (i + 1 === lista_completa_para_descarga.length) {
          resolve(rows);
        }
      }
    });
  }

  function crear_lista_telefonos(cliente_selecto) {
    ////console.log(cliente.direcciones_asociadas);
    //console.log(cliente_selecto)
    let telefonos_lista = [];
    return new Promise((resolve, reject) => {
      if (cliente_selecto.direcciones_asociadas.length === 0)
        return (telefonos_lista = "");

      for (var i = 0; i < cliente_selecto.direcciones_asociadas.length; i++) {
        const element = cliente_selecto.direcciones_asociadas[i];
        if (element.telefono != "") {
          telefonos_lista.push(element.telefono);
          //console.log(element.telefono);
        }
        //console.log(telefonos_lista);
        if (i + 1 === cliente_selecto.direcciones_asociadas.length) {
          telefonos_lista = telefonos_lista;
          resolve(telefonos_lista);
        }
      }
    });
  }

  function obtener_clientes_descarga_csv() {
    return new Promise((resolve, reject) => {
      if (http_ocupado) return;
      http_ocupado = true;
      postData("app/clientes/lista_de_todos_los_clientes", {})
        .then(async res => {
          setTimeout(() => {
            //    console.log(res);
            http_ocupado = false;
          }, 200);
          if (res.ok) {
            lista_completa_para_descarga = res.lista;
            resolve(res.lista);
          }
        })
        .catch(err => {
          console.log(err);
          http_ocupado = false;
          reject(err);
        });
    });
  }

  async function crear_documento_csv() {
    lista_completa_para_descarga = [];
    await obtener_clientes_descarga_csv();
    preparar_texto().then(archivo => {
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
      exportToCsv("Clientes_sistema" + fecha_temp + ".csv", archivo);
    });
  }

  function exportToCsv(filename, rows) {
    var processRow = function(row) {
      var finalVal = "";
      for (var j = 0; j < row.length; j++) {
        var innerValue =
          row[j] === null || row[j] === undefined ? "" : row[j].toString();
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
        // feature detection
        // Browsers that support HTML5 download attribute
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

  function arreglar_direccion(direccion_param) {
    let direccion = direccion_param.calle;
    direccion += ", #" + direccion_param.numero_exterior;
    direccion +=
      direccion_param.numero_interior == ""
        ? ""
        : ", Interior: " + direccion_param.numero_interior;
    direccion += ", Colonia :" + direccion_param.colonia;
    direccion += ", CP: " + direccion_param.cp;
    direccion += ", Localidad: " + direccion_param.localidad;
    direccion += ", Municipio: " + direccion_param.municipio;
    direccion += ", Estado: " + direccion_param.estado;
    return direccion;
  }
</script>

<style>
.paginado_cometarios{
      color: gray;
    font-weight: 600;
    font-size: .8em;
}
</style>

<div
  class="contenedor_ventana"
  style="overflow-y: auto;"
  in:fly={{ x: -10, duration: 500 }}>

  {#if http_ocupado}
    <!-- HTTP OCUPADO -->
    <div class="centrado">cargando...</div>
  {:else}
    <!-- HTTP LIBRE -->
    {#if $clientes.lista.length === 0}
      <!-- SIN RESULTADOS -->
      No existen resultados.
    {:else}
      <!-- SI HAY RESULTADOS -->
      <Heading />
      {#each lista as cliente, i (cliente._id)}
        <!-- REGISTRO -->
        <Row
          {cliente}
          on:cliente_seleccioando
          on:editar_cliente
          on:refrescar_lista={refrescar_lista} />
      {/each}
    {/if}
  {/if}

</div>

<div style="width: 100%; position: absolute;bottom: 43px;">
  <table style="width:100%;">

    <tr>
      <td style="width:20vw;">
        
        {#if $usuario_db.rol != 'vendedor'}
          <!-- content here -->
          <Button
            color="green"
            on:click={crear_documento_csv}
            title="Descargar Archivo de Excel">
            <i class="material-icons">description</i>
            Descargar
          </Button>
        {/if}
      </td>
      <td>
        <div class="centrado " style="width: 200px;margin: 0 auto;">

          <Button
            disabled={pagina_actual == 1 || http_ocupado}
            on:click={anterior}>
            <i class="material-icons">keyboard_arrow_left</i>
          </Button>
          {pagina_actual} / {total_paginas}
          <Button
            disabled={pagina_actual == total_paginas || http_ocupado}
            on:click={siguiente}>
            <i class="material-icons">keyboard_arrow_right</i>
          </Button>

        </div>
      
      </td>
      <td class="paginado_cometarios">
      Clientes : {total_registros} <br>
      {#if buscando !=""}
         <!-- content here -->
      Coincidencias {coincidencias}
      {/if}
      </td>
    </tr>
  </table>

</div>
