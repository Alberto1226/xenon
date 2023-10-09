<script>
  import { get_promocion } from "./consultar_una_promo";
  import Imagen from "./imagen_producto.svelte";
  import { onMount, onDestroy } from "svelte";
  import { Button } from "svelte-mui/src";
  import { fade } from "svelte/transition";
  import { formato_precio, editar_store } from "./../../../../stores";
  import Head_basico from './head_basico.svelte';
  import Head_condiciones_complejas from './head_condiciones_complejas.svelte';
  export var visible = false;
  var carritoDB = {
    folio: "---"
  };
  export var producto = {
    nombre: "",
    promo: {
      id_promocion: ""
    }
  };
  var http_ocupado = false;
  var obtenido = false;
  var promocion;
  var error = false;
  var condiciones_ok = false;
//  siguiente variable para caso de minimo del mismo producto =2
  var minimo_del_mismo ={
    minimo:0,
    cantidad_actual:0
  }
  //  siguientes dos para condiciones complejas
  var check_complejo_listo = false;
  var check_complejo_lista = [];

  $: if (visible == true && obtenido == false) {
    obtener_informacion_de_promocion();
    console.log("consutlaod la promo");
  }

  onMount(() => {
    carritoDB = $editar_store.pedido;
  });

  async function procesar_lista_con_condiciones() {
    //    TIPO SIN CONDICIONES
    if (promocion.tipo_condicion == 1) {
      condiciones_ok = true;
      return;
    }
    //    TIPO MINIMO DEL MISMO PRODUCTO
    if (promocion.tipo_condicion == 2) {
      const cantidad_en_pedido = await cantidad_de_producto_en_pedido(
        producto._id
      );
      let minimo_producto_para_promo_valida =
        promocion.condiciones[0].minimo_unidades;
      console.log({ cantidad_en_pedido });
      console.log({ minimo_producto_para_promo_valida });
      condiciones_ok = cantidad_en_pedido >= minimo_producto_para_promo_valida;
      minimo_del_mismo.cantidad_actual =cantidad_en_pedido;
      minimo_del_mismo.minimo =  minimo_producto_para_promo_valida;
      
    }
    // TIPO MINIMOS COMPUESTOS
    if (promocion.tipo_condicion == 3) {
      // condiciones_ok  =true;
      const {
        lista_resultados,
        errores
      } = await ok_lista_entera_de_condiciones_en_pedido_del_producto(
        $editar_store.pedido.lista,
        promocion.condiciones,
        producto._id
      );
      if (errores > 0) condiciones_ok = false;
      else condiciones_ok = true;
      check_complejo_lista = lista_resultados;
      check_complejo_listo = true;
      console.log({ lista_resultados, errores });
    }
  }

  async function ok_lista_entera_de_condiciones_en_pedido_del_producto(
    lista_registros_en_pedido,
    condiciones,
    producto_id
  ) {
    var lista_resultados = [];
    var errores = 0;
    for (let i = 0; i < condiciones.length; i++) {
      const condicion = condiciones[i];
      const cantidad_en_pedido = await cantidad_de_producto_en_pedido(
        condicion.id
      );
      console.log({ condicion, cantidad_en_pedido });
      let cumple = cantidad_en_pedido >= condicion.minimo_unidades;
      let situacion = {
        condicion,
        cantidad_en_pedido,
        minimo_unidades_condicionadas: condicion.minimo_unidades,
        cumple: cumple,
        faltante: condicion.minimo_unidades - cantidad_en_pedido
      };
      lista_resultados.push(situacion);
      if (cumple == false) errores++;
      if (i + 1 == condiciones.length) {
        return { lista_resultados, errores };
      }
    }
  }

  async function cantidad_de_producto_en_pedido(producto_id) {
    console.log({ buscando: producto_id });
    let cantidad = 0;
    const lista = $editar_store.pedido.lista;
    console.log({ en: lista });
    const registro_de_producto_en_pedido = lista.find(
      elem => elem.producto._id == producto_id
    );
    if (registro_de_producto_en_pedido) {
      return registro_de_producto_en_pedido.cantidad;
    }
    return 0;
  }

  async function obtener_informacion_de_promocion() {
    if (http_ocupado == true || obtenido == true) return;
    http_ocupado = true;
    const respuesta = await get_promocion(producto.promo.id_promocion);
    if (respuesta.ok == true) {
      promocion = respuesta.promocion;
    } else {
      error = true;
    }
    http_ocupado = false;
    obtenido = true;
    //console.log(respuesta);
    procesar_lista_con_condiciones();
  }

  function cerrar() {
    visible = false;
    obtenido = false;
  }
</script>

<style>
  .centrado_titulo{
    width: fit-content;
    margin: auto;
  }
  .contenedor {
    background: white;
    background: linear-gradient(
      309deg,
      rgb(72 59 105) 7%,
      rgba(74, 102, 115, 1) 100%
    );
    color: white;
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0vh;
    left: 0vw;
    z-index: 2;
  }

  .max-width {
    max-width: 900px;
    margin: 0 auto;
  }

  .fuente_negra {
    font-weight: 200;
    color: black;
    height: 8vh;
    padding-right: 15px;
  }

  .fuente1_5 {
    font-size: 1.5em;
  }
  .tachado {
    text-decoration-line: line-through;
  }

  .cerrar {
    position: absolute;
    height: 100px;
    width: 100px;
    border-radius: 70px;
    right: 50px;
    top: 50px;
    font-size: 6.5em;
    padding-left: 0.5em;
    font-weight: 200;
    cursor: pointer; 
    transition: padding-left 50ms ease-in,border 100ms ease-in,padding-top 50ms ease-in,font-size 50ms ease-in,font-size 50ms ease-in,background-color 50ms ease-in;
  }
  .cerrar:hover {
    border: 1px solid white;
    transition: border 350ms ease-out;
  }
  .cerrar:active {
    font-size: 5.5em;
    padding-top: 10px;
    padding-left: 10px;
  }

  .lista_productos {
    height: 20vh;
    overflow-y: auto;
    color: #ffeb3b;
    background: #ffffff0d;
    padding: 17px;
    border-radius: 14px;
  }

  .indice_row {
    color: white;
    font-weight: 100;
    font-size: 0.5em;
  }
  .row_lista_condiciones {
    padding: 10px 5px;
    font-weight: 300;
  }
  .row_lista_condiciones:hover {
    background-color: rgba(10, 10, 10, 0.377);
  }

  .nombre {
    text-align: left;
    padding-left: 9px;
        width: 35%;
  }

  .folio {
    font-size: 2em;
    font-weight: 600;
    color: white;
  }
  .div_folio {
    margin-left: max(5vw, 55px);
    padding: 18px;
    border-radius: 4px;
  }
  .si {
    color: rgb(140, 199, 255);
  }
  .no {
    color: rgb(255, 140, 140);
  }

  .promo_siok_div {
    border: 1px solid #8bc34a;
  }
  .promo_nook_div {
    border: 1px solid #f44336;
  }
  .falta {
    color: #f44336;
  }

  .borde_inferior_faltan {
    border-bottom: 1px dashed #f44336;
  }
</style>

{#if visible}
  <div class="contenedor no_select" transition:fade={{ duration: 250 }}>
    <div class="cerrar" on:click={cerrar}>X</div>
    <!-- <Button color="white" on:click={cerrar} raised><i class="material-icons vertical-alineado blanco" >keyboard_backspace</i> regresar</Button> -->

    <h3 class="centrado">{producto.nombre}</h3>
    <div class="centrado ">

      <div class="width-auto-centrado-horizontal display-flex centrado_titulo">
        <div>
          <!-- IMAGEN DEL PRODUCTO -->
          <Imagen item={producto} />
        </div>
        <div
          class="div_folio"
          class:promo_siok_div={condiciones_ok == true}
          class:promo_nook_div={condiciones_ok == false}>
          <div class="folio ">
            <!-- CONDICIONES OK -->
            {carritoDB.folio}
          </div>
          <div>
            ok:
            {#if condiciones_ok == true}
              <span class="si">"si"</span>
            {:else}
              <span class="no">"no"</span>
            {/if}
          </div>
        </div>
      </div>
      <div class="centrado fuente1_5">
        <!-- <h4>Precios:</h4>
        <div class="row">
          <div>
            $ {formato_precio(producto.precio)}
            <i class="material-icons vertical-alineado">forward</i>
            $ {formato_precio(producto.promo.precio)}
          </div>
        </div> -->

        {#if error == true}
          <h3 class="rojo">
            Ha ocurrido un error al obtener la informacion de la promo
          </h3>
        {:else}
          <!-- RESUMEN -->
          {#if obtenido == true}
            <!-- content here -->

            <div class="">

              <div class="resumen min-width-350px max-width">
                <h3 class="fuente_negra">Resumen de promo:</h3>
                <div class="display-flex fuente_mas_grande">
                  <div class="col30p derecha fuente_negra">Producto</div>
                  <div class="col60p">
                    <b>
                      {producto.nombre} (codigo:{producto.codigo} , {producto.marca != '' ? 'marca:' + producto.marca : ''})
                    </b>
                  </div>
                </div>
                <div class="display-flex fuente_mas_grande">
                  <div class="col30p derecha fuente_negra">Precio normal</div>
                  <div class="col60p tachado">
                    $ {formato_precio(producto.precio)}
                  </div>
                </div>

                <div class="display-flex fuente_mas_grande">
                  <div class="col30p derecha fuente_negra">Precio promo</div>
                  <div class="col60p">
                    $
                    <b>{formato_precio(promocion.precio)}</b>
                  </div>
                </div>

                <div class="display-flex fuente_mas_grande">
                  <div class="col30p derecha fuente_negra">
                    {#if promocion.tipo_condicion == 1}
                      Condición
                    {:else if promocion.tipo_condicion == 2}
                      Condición
                    {:else if promocion.tipo_condicion == 3}Condiciones{/if}
                  </div>
                  <div class="col60p ">
                    {#if promocion.tipo_condicion == 1}
                      <b>Sin condición</b>
                    {:else if promocion.tipo_condicion == 2}
                      Mínimo de
                      <b>{promocion.condiciones[0].minimo_unidades}</b>
                      del mismo producto (
                      <b>{producto.nombre}</b>
                      )
                      <br>
                      {#if condiciones_ok ==true}
                        <div>
                        mínimo: <b>{minimo_del_mismo.minimo}</b> {minimo_del_mismo.minimo>minimo_del_mismo.cantidad_actual?">":"="}  en pedido: <b>{minimo_del_mismo.cantidad_actual}</b>
                        </div>
                      {:else}
                         <div >
                        mínimo: <b>{minimo_del_mismo.minimo}</b> , en pedido : <b class="rojo">{minimo_del_mismo.cantidad_actual}</b>
                        </div>
                      {/if}
                    {:else if promocion.tipo_condicion == 3}
                      <b>Mínimo de varios productos :</b>
                      {#if check_complejo_listo == false}
                        <Head_basico/>
                      {:else}
                         <Head_condiciones_complejas/>
                      {/if}
                      <div class="lista_productos">
                        {#if check_complejo_listo == false}
                          
                          {#each promocion.condiciones as item, i}
                            <div class="display-flex row_lista_condiciones">
                              <div class="indice_row margen_vert_auto col10">
                                {i + 1}.-
                              </div>
                              <div class="nombre col50p margen_vert_auto">
                                {item.nombre}
                              </div>
                              <div
                                class="minimo_unidades_lista col30p
                                margen_vert_auto">
                                x {item.minimo_unidades}
                              </div>
                            </div>
                          {/each}
                        {:else}
                         
                          {#each check_complejo_lista as item, i}
                            <div
                              class="display-flex row_lista_condiciones"
                              class:borde_inferior_faltan={item.cumple == false}>
                              <div class="indice_row margen_vert_auto col10">
                                {i + 1}.-
                              </div>
                              <div class="nombre  margen_vert_auto">
                                {item.condicion.nombre}
                              </div>
                              <div
                                class="minimo_unidades_lista col10p
                                margen_vert_auto">
                                x {item.condicion.minimo_unidades}
                              </div>

                              <div
                                class="minimo_unidades_lista col10p
                                margen_vert_auto blanco">
                                {item.cantidad_en_pedido}
                              </div>
                              <div class="col30p">
                                {#if item.cumple == true}
                                  <i
                                    class="material-icons vertical-alineado
                                    blanco">
                                    check
                                  </i>
                                {:else}
                                  <i
                                    class="material-icons vertical-alineado
                                    falta">
                                    cancel
                                  </i>
                                  faltan
                                  <span class="falta">{item.faltante}</span>
                                {/if}
                              </div>
                            </div>
                          {/each}
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

            </div> 
          {:else}
            <div class="centrado">
            <h3>cargando...</h3>
            </div>
          {/if}

          <!-- RESUMEN -->
        {/if}

      </div>
    </div>
  </div>
{/if}

