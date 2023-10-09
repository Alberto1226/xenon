<script>
  import { Button, Textfield, Menu, Menuitem,Ripple } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { productos, postData, buscadores,producto_selecto } from "./../../../../stores";
  import {fade} from 'svelte/transition';
  export var producto;
  export var mensaje="";
  var mostrar_mensaje = false;
  
  const dispatch = createEventDispatcher();
  onMount(() => {
    //console.log('montado de producto');
    //console.log($productos.lista.length);
    producto = $producto_selecto;
    if(!producto){
      producto={
        nombre:"sin"
      }
    }
    busqueda = $buscadores.productos;
   obtener_productos_por_pagina();
   setTimeout(()=>{
     mostrar_mensaje = true
   })
    
  });
  var input_1;
  var busqueda = "";
  var lista = [];
  var lista_visible = true;
  var http_ocupado = false;
  var http_ultima_actividad_fecha = Date.now();
  var pagina_actual = 1;
  let total_paginas = 0;
  let coincidencias = 0;
  let limite_lista = 10;
  let visible = true;
  let ultima_busqueda = '';

  function obtener_productos_por_pagina() {
    if (http_ocupado) return;
    http_ocupado = true;
    //console.log("post a lista productos");
ultima_busqueda =busqueda;
    postData("app/productos/lista_de_productos", {
      buscando: busqueda,
      pagina_actual,
      activo:true
    })
      .then(res => {
        http_ultima_actividad_fecha = Date.now();
        setTimeout(() => {
          http_ocupado = false;
        }, 200);
        console.log(res);
        if (res.ok) {
          $productos.lista = res.lista;
          $productos.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $productos = $productos;
          lista = $productos.lista;
          $productos.total_registros = res.numero_total;
         // $productos.total_registros = res.numero_total;
          total_paginas = res.paginas;
          if (busqueda === "") {
           // total_paginas = res.numero_total;
          } else {
            coincidencias =res.coincidencias;

            total_paginas = res.paginas;
          }
          //total_paginas = Math.floor(res.lista.length / limite_lista);
        }
      })
      .catch(err => {
        console.log(err);

        http_ocupado = false;
      });
  }

  function Buscar(evt) {
    
    if ((evt.key === "Enter" && http_ocupado === false)||busqueda==='') {
      pagina_actual = 1;
      obtener_productos_por_pagina();
    }
  }

  function incluye_busqueda(producto_selecto) {
    if (producto_selecto.toLowerCase().indexOf(busqueda.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

  function filtrar_nuevo_arreglo() {
    if (busqueda == "") {
      lista = $productos.lista;
      return;
    }
    var lista_previa = $productos.lista;
    var lista_temp = lista_previa.filter(producto_tmp =>
      incluye_busqueda(producto_tmp.nombre)
    );

    lista = lista_temp;
  }


  $: if(visible){
    setTimeout(()=>{
      //let domelm= document.getElementById('input_1');
      //domelm.focus();
    },300)
  }
</script>

<style>
  .scrollable {
    overflow-y: auto;
    height:50%;   
  }
  .email {
    color: gray;
    font-size: 0.8em;
    font-weight: 200;
  }
  .nombre {
    text-align: left;
  }
  .input {
    width: 250px;
    margin: 0 16px;
  }
  .contenido {
   background-color: #272727f5;
    position: absolute;
    left: 0px;
    top: 0px;
    height: 100%;
    width: 100%;
    z-index: 4;
  }
  .row_productos_pop{
    height: 44px;
    user-select: none;
    display: flex;
    align-items: center;
    padding: 0 16px;
    white-space: nowrap;
    background: #bfbfbf;
    border-bottom: 1px solid #c5c5c5;
  }
  .row_productos_pop:hover{

    background: #a0a0a0;
  }
  .top_tools{
    margin: -10px auto;
    width:40%;
    min-width: 300px;
  }
  .colorblanco{

    color:white;
  }
  .icono_cerrar{
    color:red;
    position:absolute;
    top:50px;
    right:50px;
  }
  .dentro_contenedor{
    
     width: 422px;
    margin: 70px auto;
  }

  .mensaje{
    background-color: black;
    padding: 8px;
    width: fit-content;
    margin: auto;
    color: #8BC34A;
    margin-top: 46px;
        font-size: 1.3em;
    border-radius: 5px;
    box-shadow: 0 0 10px black;
  }

   .icono_promo{
    color: #4CAF50;
    z-index: 2;
    font-size: 30px;
    position: absolute;
    margin: -5px 0px 0px 40px;
  }
  .icono_promo2{
    color: #4CAF50;
    font-size: 27px;
    position: absolute;
    margin: -23px 0px 0px 39px;
  }
</style>



<table>
  <tr>
    <td style="color: #904bd0;">producto :</td>
  </tr>
  <tr>

    <td>

      <Button
        on:click={() => visible = true}
        dense
       
        color={producto.nombre == '' || $producto_selecto.nombre=="ninguno"? 'darkorange' : 'primary'}
        raised
        ripple={false}
        style="padding-right: 4px;width:100%;font-size: 1.1em;height: 60px;">
        <i class="material-icons vertical-alineado icono_peque colorblanco">
          arrow_drop_down
        </i>
        <i class="material-icons vertical-alineado icono_peque">
          sports_esports
        </i>

        {#if producto.nombre == '' || $producto_selecto.nombre=="ninguno"}
          <!-- content here -->
          <i class="material-icons vertical-alineado icono_peque colorblanco">schedule</i>
          pendiente...
        {:else}
          {producto.nombre}
          <i  class="material-icons vertical-alineado icono_peque colorblanco">
            double_arrow
          </i>
        {/if}
        {#if $producto_selecto.promo}
       {#if $producto_selecto.promo.tiene_promo ==true}
          <i class="material-icons icono_promo2" title="Promoción ">new_releases</i>
        {/if}
    {/if}

      </Button>
    </td>
  </tr>
</table>
{#if visible}

 
  <!-- content here -->
  <div class="contenido" id="contenedor" on:click={(evt) => {if(evt.target.id==="contenedor")visible=false}}>

<div class="icono_cerrar">
<Button fab dense on:click={()=>visible=false}>
<i class="material-icons" title="cerrar diálogo" style="color:red;font-size:2em;">
close
</i>
</Button>
</div>
{#if mostrar_mensaje}
   <!-- content here -->
   <div class="centrado mensaje" in:fade={{duration:250,delay:200}}>
{mensaje}
</div>
{/if}

 <div class="dentro_contenedor">
 <div class="centrado">
 <h3 class="colorblanco">
 Productos
 </h3>
 </div>
     <div class="top_tools">
     
      <table style="width:80%">
      <tr>
        <td>
          <input
            class="input"
            id="input_1"
            type="text"
            bind:value={busqueda}
            placeholder="Buscar producto..."
            on:keyup={Buscar} />
        </td>

        <td>

          <Button
            icon
            title="borrar texto en búsqueda"
            on:click={() => {
              busqueda = '';
              obtener_productos_por_pagina();
              input_1 = document.getElementById('input_1');
              if (input_1 == null) return;
              input_1.focus();
            }}>
            <i class="material-icons vertical-alineado colorblanco">cancel</i>
          </Button>
        </td>
        <td>

          <Button icon on:click={Buscar}>
            <i class="material-icons vertical-alineado colorblanco">search</i>
          </Button>
        </td>
      </tr>
    </table>

    <!-- paginacion -->
    <table style="width:80%;margin-bottom:20px;" class="colorblanco">
      <tr>
        <td>
          <Button
          color="white"
            dense
            icon
            on:click={() => {
              if (pagina_actual == 1) return;
              pagina_actual--;
              obtener_productos_por_pagina();
            }}>
            <i class="material-icons">arrow_left</i>
          </Button>
        </td>
        <td>
          pag: {pagina_actual}
          <span title="total de páginas">de {total_paginas}</span>
        </td>

        <td>
          <Button
          color="white"
            dense
            icon
            on:click={() => {
              if (pagina_actual == total_paginas) return;
              pagina_actual++;
              obtener_productos_por_pagina();
            }}>
            <i class="material-icons">arrow_right</i>
          </Button>
        </td>
        <td>
          {#if busqueda != ''}
            <!-- content here -->
            <span class="indice_row">coinciden {coincidencias}</span>
          {:else}
            <span class="indice_row">total {$productos.total_registros}</span>
          {/if}
        </td>
      </tr>
    </table>
     </div>
    {#if http_ocupado}
      <!-- content here -->
      <div class="centrado indice_row" style="padding-top:250px">cargando...</div>
    {:else}
      <!-- else content here -->

      <div class="scrollable">
        {#each lista as item, i}
          <div class="row_productos_pop"
            on:click={() => {
              producto = item;
              dispatch('producto_selecto');
              visible= false;
            }}>

    <Ripple />
            <table>

              <tr>
                <td class="indice_row">{(i + 1)+ ((+pagina_actual-1) * limite_lista)}</td>
                <!-- {#if item.location.lat != 0}
                  
                  <td title="Cuenta con geo-localización">
                    <i class="material-icons">person_pin_circle</i>
                  </td>
                {/if} -->
                <td class="nombre">{item.nombre}
                 {#if item.promo.tiene_promo ==true}
                  <i class="material-icons icono_promo" title="Promoción ">new_releases</i>
                {/if}
                </td>

              </tr>
            </table>
          </div>
        {:else}
          <div class="centrado colorblanco">
            {#if busqueda == '' && ultima_busqueda!=''}
              <!-- content here -->
              No cuentas con productos registrados.
            {:else}
              <!-- else content here -->
              No se encontraron resultados con "{ultima_busqueda}"
            {/if}
          </div>
        {/each}
      </div>
    {/if}

  </div>
 </div>
{/if}

