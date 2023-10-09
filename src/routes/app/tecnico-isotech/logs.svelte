<script>
  import JSONTree from "svelte-json-tree";
  // your json data to view

  import { postData ,convertir_a_fecha_humana,storage} from "./../../stores";
  import { onMount } from "svelte";
  import Cambiar_Descuento_Pedido from './cambiar_descuento_pedido.svelte';
  import Cambiar_Status_a_Envio from './cambiar_descuento_pedido.svelte';
  import Buscador from './buscador.svelte';
  import Log from './Log.svelte';
  var http_cargando = false;
  //const JSONTree = require('svelte-json-tree');

  // update value

  onMount(() => {
    valor = {
      name: "bla"
    };
    solicitar_logs();
  });
  var valor = {
    name: "bla"
  };

  var lista = [];
  var step = 50;
  var pagina_actual = 1;
  var cuenta_de_logs = -1;
  var paginas = -1;
  var buscando_texto ="";
  var accion ="todos";

  function formato_fecha(fecha) {
    const d = new Date(fecha);
    let resultado = {
      dia: d.toLocaleString("es-MX"),
      tiempo: d.toTimeString()
    };
    return resultado;
  }

  async function solicitar_logs() {
    http_cargando = true;
    //console.log("mandando");
    let url = "/app/tecnico-isotech/logsDB";
    postData(url, { pagina_actual,buscando_texto,accion })
      .then(resDB => {
        //console.log(resDB);

        lista = resDB.lista;
        cuenta_de_logs = resDB.cuenta_de_logs;
        paginas = resDB.paginas;
        http_cargando = false;
        return lista;
      })
      .catch(err => {
        //console.log("errror detectado");
        console.log(err);
        http_cargando = false;
        return { error: "No se pudo obtener el log" };
      });
  }
</script>

<style>
  
  .contenedor {
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
    height: 80vh;
  }
</style>

<h3>
  Mostrando
  <b>{lista.length?lista.length:""}</b>
  logs (db={$storage})
</h3>

{#if http_cargando}
   cargando... 
   {:else}

  <Buscador bind:paginas bind:pagina_actual bind:accion bind:lista  />
  <div class="contenedor">

    {#each lista as item, i (item._id) }
        <Log {item} i={i} {pagina_actual} {step}/>
    {/each}
  </div>
{/if}

  <!-- promise was fulfilled -->

