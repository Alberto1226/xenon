<script>
import {Button} from 'svelte-mui/src'

  import { ui, clientes, postData, usuario_db } from "./../../stores";

export var http_ocupado ;
export var lista_completa_para_descarga=[];

  async function preparar_texto() {
    return new Promise(async (resolve, reject) => {
      let rows = [
        [
          "Agente",
          "Nombre",
          "RFC",
          "Calle",
          "No.Ext",
          "No.Int",
          "Colonia",
          "CP",
          "Municipio",
          "Estado",
          "País",
          "Teléfono",
          "TeléfonoV2",
          "Email",
          "Comentario",
          "id"
        ]
      ];
      if (lista_completa_para_descarga.length == 0) {
        reject();
        return;
      }
      for (let i = 0; i < lista_completa_para_descarga.length; i++) {
        const element = lista_completa_para_descarga[i];
        let rows_cliente = await devolver_rows_por_direcciones(element);
        //if(rows_cliente.length>0) 
        rows.push(...rows_cliente);
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
    //console.log('***')
    lista_completa_para_descarga = [];
    await obtener_clientes_descarga_csv();
    //console.log('----- aqui')
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

  const devolver_rows_por_direcciones = cliente => {
    return new Promise((resolve, reject) => {
      let lista = [];
      if(cliente.direcciones_asociadas.length==0){
        resolve([]);return;
      }
      for (let i = 0; i < cliente.direcciones_asociadas.length; i++) {
        const element = cliente.direcciones_asociadas[i];
        lista.push(
         [
           cliente.agente.nombre,
           cliente.nombre,
           element.rfc,
           element.calle,
           element.numero_exterior,
           element.numero_interior,
           element.colonia,
           element.cp,
           element.localidad,
          element.municipio,
          element.estado,
          element.pais,
          cliente.telefono,
          element.telefono,
          cliente.correo,
          element.notas,
          element._id,]
        );
        if(i+1==cliente.direcciones_asociadas.length){
          resolve(lista)
        }
      }
    });
  };

</script>



 <Button
            color="green"
            on:click={crear_documento_csv}
            title="Descargar Archivo de Excel">
            <i class="material-icons">description</i>
            Descargar csv
          </Button>