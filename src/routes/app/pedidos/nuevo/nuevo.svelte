<script>
  import Paso_1 from "./Paso_1.svelte";
  import Paso_2 from "./Paso_2.svelte";
  import Paso_3 from "./Paso_3.svelte";
  import { onMount } from "svelte";
  import {lista_productos_en_pedido_nuevo} from "./../../../stores";
  var paso = 1;
  var visible = false;
  var cliente = {
    nombre: "",
    correo: "",
    direccion: "",
    agente: "",
    perfil: ""
  };
  
  var ficha_de_descuento=null;

  var pedido_nuevo = {
    cliente_nombre: "",
    cliente_correo: "",
    cliente_direccion: "",
    moneda: "",
    tipo_de_cambio:20.0,
    folio: "",
    total_pedido: 0,
    descuento: 0,
    agente: {
      id:"",
      nombre: "",
      correo: "",
      comision: ""
    }
  };
  var tipos = [
    "Elite",
    "Distribuidor",
    "Mayoreo",
    "Menudeo",
    "Público en general"
  ];

  onMount(() => {
    setTimeout(() => {
      visible = true;
    }, 300);
  });

  $: if (pedido_nuevo.agente != undefined)
    pedido_nuevo.agente = cliente.agente;

 
  function siguiente() {
    visible=false;
    paso=2;
  aparecer();
  }


  function pedido_subido_y_procesado() {
    $lista_productos_en_pedido_nuevo = [];
    visible=false;
    paso = 3;
     setTimeout(() => {
      visible = true;
    }, 300);
  }


  function aparecer(){
   // visible=false;
    setTimeout(() => {
      visible = true;
    }, 300);
  }

  function capturar_nuevo(){
    paso =1
    //  reinicializar variables
    pedido_nuevo = {
    cliente_nombre: "",
    cliente_correo: "",
    cliente_direccion: "",
    moneda: "",
    folio: "",
    total_pedido: 0,
    descuento: 0,
    agente: {
      nombre: "",
      correo: "",
      comision: ""
    }
  };
  cliente = {
    nombre: "",
    correo: "",
    direccion: "",
    agente: "",
    perfil: ""
  };
  $lista_productos_en_pedido_nuevo = [];
  }
</script>

{#if visible}
  <!-- content here -->
  {#if paso == 1}
    <!-- content here -->

    <Paso_1 bind:ficha_de_descuento bind:pedido_nuevo on:continuar={siguiente} bind:cliente />
  {:else if paso == 2}
    <!-- else content here -->

    <Paso_2
    bind:ficha_de_descuento
      bind:pedido_nuevo
      on:continuar={siguiente}
      on:pedido_subido_y_procesado={pedido_subido_y_procesado} bind:cliente />
  {:else if paso == 3}
    <!-- else content here -->

    <Paso_3 bind:pedido_nuevo on:capturar_nuevo={capturar_nuevo} />
  {/if}
{:else}
  <!-- else content here -->
  <div class="centrado">[ Cargando módulo ] <br> 
  <div id="wave1_subir_pedido"></div>
  </div>
{/if}
