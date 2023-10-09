<script>
  import { buscadores,cliente_selecto ,actualizar_pines_clientes_en_mapa,mostrar_emergente_de_cliente_selecto,cliente_selecto_completo,postData} from "./../../../stores";
  import { createEventDispatcher } from "svelte";
  import { Button } from "svelte-mui/src";
  const dispatch = createEventDispatcher();
  export var lista = [];
  export let ubicacion;
  //export let actualizar_ubicaciones_en_mapa = false;


function actualizar_ubicaciones() { 
  
  $actualizar_pines_clientes_en_mapa = true;

  //console.log($actualizar_pines_clientes_en_mapa + " actualizar_pines_clientes_en_mapa");
}
  

  function buscar_cliente(cliente) {
    $buscadores.clientes = cliente.nombre;
    dispatch("ver_cliente_en_mapa");
  }


  async function mostrar_datos_de_cliente_selecto() {
    $mostrar_emergente_de_cliente_selecto  = {
      mostrar:true,
      cargando:true
    };
    const cliente_db =await obtener_cliente()
    if(cliente_db.ok == false)return;
    $cliente_selecto_completo = cliente_db.cliente;
    console.log($cliente_selecto_completo);
    $mostrar_emergente_de_cliente_selecto.cargando =false;
  }

   async function obtener_cliente() {
    //cargando = true;
    return postData("app/clientes/devolver_cliente", { cliente:$cliente_selecto })
      .then(respuesta => {
        return respuesta;
      })
      .catch(err => {
        console.log(err);
      });
  }
</script>

<style>
  .contenedor_lista {
    height: 177px;
    overflow-y: auto;
    background-color: #222d32;
    color: white;
    border-radius: 5px;
    width: 500px;
    padding: 14px;
  }
  .row {
    cursor: pointer;
    height: 33px;
    border-radius: 5px;
    padding-top: 3px;
    padding-left: 4px;
    border-bottom: 1px solid #313131;
    padding-bottom: 10px;
  }
  .row:hover {
    background-color: rgb(44, 14, 71);
  }
  .icono_peque {
    color: rgb(0, 255, 21);
    font-size: 1.2em;
  }

  .icono_peque_indefinido {
    color: darkorange;
    font-size: 1.2em;
  }
  .no_tiene{
    
    border-radius: 5px;
    padding:3px;
  }
  .no_tiene:hover{background-color: #bbbbbb86;}
</style>

<div class="titulo_lista">
  Lista de clientes en :
  <b>{ubicacion}</b>
  ({lista.length})
</div>
<div class="contenedor_lista">

  {#each lista as item, i}
    <!-- content here -->
    <div class="row">
      <talbe>
        <tr>
          <td class="indice_row">{i + 1})</td>
          <td>{item.nombre}</td>
          <td>
            {#if item.location === undefined}
              <div
                title="No cuenta con localización en mapa, ir a configurar cliente?"
                class="no_tiene pointer"
                on:click={() => {
                 // buscar_cliente(item);
                }}>

                <!-- content here -->
                <span>
                  <i
                    class="material-icons vertical-alineado
                    icono_peque_indefinido">
                    person_pin_circle
                  </i>
                  <i
                    class="material-icons vertical-alineado
                    icono_peque_indefinido">
                    timer
                  </i>
                </span>
              </div>
            {:else}
              <Button
              title ="Ir a configurar a cliente"
                icon
                on:click={() => {
                  buscar_cliente(item);
                }}>
                
                <i class="material-icons vertical-alineado icono_peque">
                  person_pin_circle
                </i>
              </Button>
              <Button
              title ="Localizar en mapa al cliente"
                icon
                on:click={() => {
                  $cliente_selecto = item;
                  actualizar_ubicaciones();
                 // console.log("ahi va**")
                }}>
                
                <i class="material-icons vertical-alineado icono_peque">
                  visibility
                </i>
              </Button>

              <Button
              title ="Localizar en mapa al cliente"
                icon
                on:click={() => {
                  $cliente_selecto = item;
                  mostrar_datos_de_cliente_selecto();
                 // console.log("ahi va**")
                }}>
                
                <i class="material-icons vertical-alineado icono_peque">
                  info
                </i>
              </Button>
            {/if}

          </td>
        </tr>
      </talbe>
    </div>
  {:else}
    <!-- empty list -->
    <div>No se encontraron clientes</div>
  {/each}
</div>
