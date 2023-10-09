<script>
  import Paso_1 from "./Paso_1.svelte";
  import Paso_2 from "./Paso_2.svelte";
  import Paso_3 from "./Paso_3.svelte";
  import { onMount } from "svelte";
  import {
   // lista_productos_en_pedido_nuevo,
    editar_store,
    pedidos,
    postData
  } from "./../../../stores";
  import { goto } from "@sapper/app";
  var paso = 1;
  let lista_productos = []; ///  lista que llega de DB en pedido pendiente
  var visible = false;
  var cliente = {
    nombre: "",
    correo: "",
    direccion: "",
    agente: "",
    perfil: ""
  };
  var ficha_de_descuento = null;
  var pedido_selecto = {
    cliente_nombre: "",
    tipo_de_cambio:1,
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
  var tipos = [
    "Elite 55.0 %",
    "Distribuidor 50.0 % ",
    "Mayoreo 45.0 %",
    "Menudeo 40.0 %",
    "Elite 10.0%",
    "Público en general 0.00%"
  ];
  let lista_productos_original;
  let id_carrito;
  onMount(async() => {
 if(!$editar_store.pedido){
   goto("/login");
   return
 }
     if($editar_store.pedido.tenia_ficha ===true){
       ficha_de_descuento = {
        descuento: $editar_store.pedido.descuento
      };
    }
   //console.log($editar_store.pedido);
    let pedido = $editar_store.pedido;
    if (pedido === null) goto("/app/pedidos");
    
    const proceso = await bajar_pedido_de_server(pedido);
    if(proceso.ok==false) goto('/app/pedidos');
    pedido = $editar_store.pedido;
    pedido_selecto = $editar_store.pedido;
    id_carrito = pedido._id;
    pedido_selecto.cliente_nombre = pedido.cliente.nombre;
    pedido_selecto.cliente_correo = pedido.cliente.correo;
    pedido_selecto.cliente_direccion = pedido.cliente.direccion;
    pedido_selecto.tipo_de_cambio = pedido.tipo_de_cambio;
    cliente.direccion = pedido.cliente.direccion;
    cliente.nombre = pedido.cliente.nombre;
    cliente.correo = pedido.cliente.correo;
    cliente.direccion = pedido.cliente.direccion;
   //console.log(pedido.agente.nombre);
    cliente.agente = pedido.agente.nombre;
    cliente.perfil = pedido.cliente.perfil;
    cliente.id = pedido.cliente.id;
   //console.log(cliente);
    
   //console.log(pedido_selecto);
    pedido_selecto.moneda = pedido.moneda;
    pedido_selecto.correo = pedido.cliente.correo;
    // pedido_selecto.agente.nombre =pedido.agente.nombre;
    //  pedido_selecto.agente.correo =pedido.agente.correo;
    //  pedido_selecto.agente.comision =pedido.agente.comision;
    visible = true;

    lista_productos_original = JSON.parse(JSON.stringify(pedido.lista));
    // pedido_selecto =$editar_store.pedido;

   //console.log(pedido_selecto);
    // cliente.nombre = $editar_store.pedido.cliente.nombre;
    setTimeout(() => {
      visible = true;
    }, 300);
  });

  $: if (pedido_selecto.agente != undefined) pedido_selecto.agente = cliente.agente;

  function siguiente() {
    visible = false;
    paso = 2;
    aparecer();
  }
  function pedido_subido_y_procesado() {
    //$lista_productos_en_pedido_selecto = [];
    visible = false;
    paso = 3;
    setTimeout(() => {
      visible = true;
    }, 300);
  }
  function aparecer() {
    // visible=false;
    setTimeout(() => {
      visible = true;
    }, 300);
  }


  function bajar_pedido_de_server(pedido) {
    return new Promise((resolve, reject) => {
      if(pedido===null){
        reject();
        return;
      }
      postData("app/pedidos/editar/devolver_carrito", { id: pedido._id })
      .then(
        respuesta => {
         //console.log(respuesta);
          
          if (respuesta.ok) {
            let lista_temp= $pedidos.lista ;
            let pedido_en_lista = lista_temp.find(element=> element._id === $editar_store.pedido._id);
            pedido_en_lista = respuesta.carrito;
            $pedidos.lista = lista_temp;
            $pedidos =$pedidos;
            $editar_store.pedido= pedido_en_lista;
            resolve(respuesta);
            return
          }
          else{
            reject(respuesta)
            return
          }

        }
      ).catch((err)=>{
        console.log(err);
        reject(err);
      })
    });
  }
</script>

{#if visible}
  <!-- content here -->
  {#if paso == 1}
    <!-- content here -->

    <Paso_1
      bind:ficha_de_descuento
      bind:pedido_selecto
      on:continuar={siguiente}
      bind:cliente />
  {:else if paso == 2}
    <!-- else content here -->

    <Paso_2
      bind:ficha_de_descuento
      bind:pedido_selecto
      bind:id_carrito
      on:continuar={siguiente}
      lista_productos={lista_productos_original}
      on:pedido_subido_y_procesado={pedido_subido_y_procesado}
      bind:cliente />
  {:else if paso == 3}
    <!-- else content here -->

  
  {/if}
{:else}
  <!-- else content here -->
  <div class="centrado">
    [ Cargando módulo ]
    <br />
    <div id="wave1_subir_pedido" />
  </div>
{/if}
