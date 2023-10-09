<script>
  //export var datos_combinados=[];
  import { Button, ButtonGroup } from "svelte-mui/src";
  import { mensajes_app, postData ,pedido_publico_selecto } from "./../../../../../stores";
  import { onMount } from "svelte";
  export var pedido_listo_para_recibir_productos = false;
  export var indice = 0;
  export var existencias = 0;
  export var producto = {
    nombre: "cargando"
  };
  export var cantidad = 0;
  export var carritos = [];
  export var fue_agregado_a_un_pedido = null;
  export var fue_anulado_del_pedido = null;
  export var id_carrito = "";
  export var descuento = 0;
  export var folio = "...";

  onMount(() => {
    sumar_cantidades();
  });

  var total_reservado = 0;
  var disponibles = 0;
  var procesando_en_la_nube = false;

  function sumar_cantidades() {
    //  console.log("----->total_reservado");
    //  console.log(carritos);
    disponibles = existencias;
    if (carritos == undefined) {
      total_reservado = 0;
      //  console.log("indefindo");
      return;
    }
    if (carritos.length == 0 || carritos == [""]) {
      total_reservado = 0;
      return;
    }

    total_reservado = carritos.reduce((a, b) => +a + +b.cantidad, 0);
    disponibles = existencias - total_reservado;
  }

  function agregar() {
    //console.log($lista_productos_en_pedido_en_edicion);
    ////console.log(producto.codigo);

    if (producto.activo === false) {
      alert("Producto deshabilitado por administración");
      return;
    }

    if (cantidad < 1) {
      $mensajes_app.push({ tipo: "error", mensaje: "Cantidad incorrecta" });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (cantidad > disponibles) {
      $mensajes_app.push({ tipo: "error", mensaje: "No existen suficientes" });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (isNaN(cantidad) || cantidad === "" || cantidad === null) {
      $mensajes_app.push({ tipo: "error", mensaje: "Valor incorrecto" });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (cantidad <= 0) return;
    let producto_temp = JSON.parse(JSON.stringify(producto));
    if (producto.aplicar_descuento_distribuidor) {
      // aplicar descuento
      producto_temp.precio =
        producto_temp.precio - (producto_temp.precio * descuento) / 100;
    } else producto_temp.precio = producto_temp.precio;

    procesando_en_la_nube = true;
    let registro = { producto: producto_temp, cantidad };
    //console.log(registro);
    postData("/app/pedidos/editar/cambiar_cantidad", { registro, id_carrito })
      .then(respuesta => {
        if (respuesta.ok) {
          $mensajes_app.push({ tipo: "exito", mensaje: "Producto agregado" });
          $mensajes_app = $mensajes_app;
          fue_agregado_a_un_pedido = true;
          actualizar_fue_agregado();
          /*
          
          var existente = $lista_productos_en_pedido_en_edicion.find(
            element => element.producto._id == producto._id
          );
          ////console.log(existente);

          if (existente == undefined) {
            
            $lista_productos_en_pedido_en_edicion.push({ producto: producto_temp, cantidad });
            $lista_productos_en_pedido_en_edicion = $lista_productos_en_pedido_en_edicion;
          } else {
            existente.cantidad = cantidad;
            $lista_productos_en_pedido_en_edicion = $lista_productos_en_pedido_en_edicion;
          }
          ya_fue_agregado = true;
          mostrando_producto = true;
          actualizar_apartado_local();
          */
        } else {
          $mensajes_app.push({ tipo: "error", mensaje: respuesta.mensaje });
          $mensajes_app = $mensajes_app;
        }
        procesando_en_la_nube = false;
        actualizar_existencias_apartados_producto();
      })
      .catch(err => {
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo agregar el producto"
        });
        $mensajes_app = $mensajes_app;
        procesando_en_la_nube = false;
      });
  }

  async function actualizar_existencias_apartados_producto() {
    const url = "app/productos/regresar_producto";
    const json = { id: producto._id };
    postData(url, json)
      .then(res => {
        if (res.ok) {
          producto = res.producto;
          existencias = res.producto.existencia.actual;
          carritos = res.producto.carritos;
          sumar_cantidades();
        }
      })
      .catch(err => {
        console.log(err);
      });
  }

  async function actualizar_fue_agregado() {
    const url = "/app/pedidos/publicos/actualizar_producto_agregado_en_pedido";
    return postData(url,{producto_agregado:producto, id_carrito:$pedido_publico_selecto._id})
    .then((res)=>{
      return res;
    })
    .catch((err)=>{
      console.log(err)
    })
  }


  async function actualizar_fue_borrado() {
    const url = "/app/pedidos/publicos/actualizar_producto_borrado_pedido";
    return postData(url,{producto_borrado:producto, id_carrito:$pedido_publico_selecto._id})
    .then((res)=>{
      fue_anulado_del_pedido =true;
      return res;
    })
    .catch((err)=>{
      console.log(err)
    })
  }
</script>

<style>
  .row {
    display: flex;
    height: 40px;
    padding: 11px;
    margin: 7px;
  }
  .row:hover {
    box-shadow: 0 0 5px gray;
  }
  .indice {
    width: 100px;
  }
  .nombre {
    width: 100px;
  }
  .cantidad {
    width: 100px;
  }
  .cantidad_burbuja {
    font-weight: 800;
    color: white;
    border-radius: 5px;
    padding: 5px;
  }
  .suficientes {
    background: #19825c;
  }
  .insuficientes {
    background: #82192a;
  }
  .nombre {
    text-transform: capitalize;
  }
  .existencias {
    width: 100px;
    text-align: center;
  }
  .total_reservado {
    width: 100px;
  }
  .rojo {
    color: red;
  }
  .verde {
    color: green;
  }
  .disponible {
    width: 100px;
  }
  .pdl-10 {
    padding-left: 10px;
  }

  .icono-add {
    color: #03a9f4;
  }
  .icono-delete {
    color: red;
  }

  .icono-pending {
    color: orange;
  }
  .fue_anulado_del_pedido {
    text-decoration-line: line-through;
    color: red;
  }
  .fue_agregado_a_un_pedido {
    text-decoration-line: line-through;
    color: green;
  }
</style>

<div class="row " class:fue_anulado_del_pedido class:fue_agregado_a_un_pedido>

  <div class="indice">{indice + 1} )</div>

  <div class="nombre">{producto.nombre}</div>
  <div class="cantidad">
    <div
      class="cantidad_burbuja"
      class:suficientes={disponibles >= cantidad}
      class:insuficientes={disponibles < cantidad}>
      x {cantidad}
    </div>

  </div>
  <div class="disponible pdl-10 centrado">
    {disponibles}
    {#if disponibles >= cantidad}
      <!-- content here -->
      <i
        class="material-icons vertical-alineado verde"
        title="Suficientes existencias en inventario">
        check
      </i>
    {:else}
      <i
        class="material-icons rojo vertical-alineado"
        title="Insuficientes existencias en inventario">
        cancel
      </i>
    {/if}
  </div>

  <div class="total_reservado centrado">
    <span title="Existencias">{existencias}</span>
    <br />
    <span title="Total reservado">{total_reservado}</span>
  </div>

  {#if fue_agregado_a_un_pedido}
    <!-- YA fue agregado -->
    Producto ya fué agregado
    <i class="material-icons vertical-alineado verde">check</i>
  {:else}
    <!-- Aun no se agrega a un pedido  -->
    {#if fue_anulado_del_pedido === false}
      <!-- content here -->
      <div title="No se ha agregado a algun pedido">
        <i class="material-icons vertical-alineado ">query_builder</i>
      </div>
    {:else}
      <div />
    {/if}

    <div class="acciones">
      <ButtonGroup>
        {#if disponibles >= cantidad && pedido_listo_para_recibir_productos && fue_anulado_del_pedido === false}
          <!-- Suficientes -->
          {#if fue_agregado_a_un_pedido === false}
            <!-- content here -->

            <Button
              icon
              dense
              on:click={() => {
                agregar();
              }}
              title={'Agregar al pedido abierto folio: ' + folio}>
              <i class="material-icons icono-add">library_add</i>
            </Button>
            <Button icon dense title="Borrar de la petición del cliente" on:click={actualizar_fue_borrado}>
              <i class="material-icons icono-delete">delete</i>
            </Button>
          {/if}
        {:else}
          <!-- Insuficientes -->
          {#if fue_agregado_a_un_pedido === false && fue_anulado_del_pedido === false}
            <Button icon dense title="Borrar de la petición del cliente" on:click={actualizar_fue_borrado}>
              <i class="material-icons icono-delete">delete</i>
            </Button>
          {/if}
        {/if}

        {#if fue_anulado_del_pedido == true}
          <div>Anulado</div>
        {/if}

      </ButtonGroup>

    </div>
  {/if}

</div>
