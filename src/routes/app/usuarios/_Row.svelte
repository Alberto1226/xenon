<script>
  export var usuario;
  export var indice=0;
  import {
    formato_precio,
    usuario_selecto,
    mensajes_app,
    usuarios,
    editar_store,
    postData,
    usuario_db,
  } from "./../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, ButtonGroup } from "svelte-mui/src";
  import {goto} from '@sapper/app';
  import Dialogo_password from "./dialogos/dialogo_cambiar_password.svelte";

  const dispatch = createEventDispatcher();
  var fecha_nacimiento;
  let procesando = false;
  let dialogo_pass_visible =false;
  var es_par= false;

  onMount(()=>{
    es_par = isOdd(indice+1)==0;
  })
  function isOdd(num) { return num % 2;}

  function sumar_cantidades() {
    if (usuario.carritos == undefined) {
      total_reservado = 0;
      return;
    }
    if (usuario.carrito.length == 0 || usuario.carrito == [""]) {
      total_reservado = 0;
      return;
    }
    total_reservado = usuario.carritos.reduce((a, b) => +a + +b.cantidad, 0);
  }

  function cambiar_status_activo(status){
    procesando = true;
    postData('app/usuarios/status_activo',{id :usuario._id ,activo:status})
    .then((respuesta)=>{
      if(respuesta.ok){
       //console.log(respuesta);
      let adjetivo = !status ? "desactivado" : "activado";
      $mensajes_app.push({ tipo: "exito", mensaje: `usuario ${usuario.nombre} ${adjetivo} .` });
      $mensajes_app = $mensajes_app;
      var usuario_tmp = $usuarios.lista.find(
        usuario_t => usuario_t._id == usuario._id
      );
      usuario_tmp.activo = status;
      $usuarios = $usuarios;
      procesando = false;
      }
      else{
         $mensajes_app.push({ tipo: "error", mensaje: `No se pudo cambiar su status de activación .` });
      $mensajes_app = $mensajes_app;
      }
    })
    .catch((err)=>{
      console.log(err);
      
    })
   
     .catch(error => {
        let accion = usuario.activo ? "desactivar" : "activar";
        $mensajes_app.push({
          tipo: "error",
          mensaje: `No se pudo ${accion} al usuario.`
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }

  function activo_update_para_pedidos(status) {
    var referencia = db
      .collection("usuarios/xenon_y_mas/usuarios")
      .doc(usuario.codigo);

    // Set the "capital" field of the city 'DC'
    return referencia
      .update({
        email: usuario.correo,
        inhabilitado:!status
      })
      .then(() => {
        let adjetivo = !status ? "desactivado" : "activado";
        $mensajes_app.push({ tipo: "exito", mensaje: `usuario ${usuario.nombre} ${adjetivo} .` });
        $mensajes_app = $mensajes_app;
        var usuario_temp = $usuarios.lista.find(
          prod => prod.codigo == usuario.codigo
        );
        usuario_temp.activo = status;
        $usuarios = $usuarios;
      })
      .catch(error => {
        let accion = usuario.activo ? "desactivar" : "activar";
        $mensajes_app.push({
          tipo: "error",
          mensaje: `No se pudo ${accion} el usuario.`
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function actualizar_desde_firestore() {
    var referencia = db
      .collection("usuarios/xenon_y_mas/usuarios")
      .doc(usuario.codigo);

    // Set the "capital" field of the city 'DC'
    return referencia
      .get()
      .then(doc => {
        //console.log(doc.data())
        var usuario_de_firestore = doc.data();
        $mensajes_app.push({
          tipo: "exito",
          mensaje: `Existencias y reservados de  <b>${usuario.nombre}</b> actualizado.`
        });
        $mensajes_app = $mensajes_app;
        var lista_temp = $usuarios.lista;
        var usuario_temp = lista_temp.find(
          prod => prod.codigo == usuario.codigo
        );
       // usuario_temp.existencia = usuario_de_firestore.existencia;
       // usuario_temp.carritos = usuario_de_firestore.carritos;
        $usuarios.lista = lista_temp;
        $usuarios = $usuarios;
        setTimeout(()=>{
          //dar chance que pase por la cadena el nuevo usuario via binding
          sumar_cantidades()
        },500)
      })
      .catch(error => {
        $mensajes_app.push({
          tipo: "error",
          mensaje: `No se pudo actualizar las existencias del usuario.`
        });
        $mensajes_app = $mensajes_app;
      });
  }

    const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };

function editar() {

    $editar_store.usuario = usuario;
    goto('app/usuarios/editar/editar');
}

</script>

<style>
  .row {
    position: relative;
    height: 38px;
    overflow: hidden;
    padding: 8px 0px;
    border-bottom: 1px solid #e1e1e1;
  }
   .row_activo:hover {
    background-color: rgb(235, 235, 235);
  }

  .usuario_inactivo{
    background-color: rgb(101 101 101);
    color: white;
    font-weight: 600;
  }
  .grid-container {
    /* font-weight: 200; */
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco seis  ";
  }

  .uno {
    grid-area: uno;
    padding-left: 10px;
  }

  .dos {
    grid-area: dos;
  }

  .tres {
    grid-area: tres;
  }

  .cuatro {
    grid-area: cuatro;
  }

  .cinco {
    grid-area: cinco;
  }

  .seis {
    grid-area: seis;
  }

  .reactivo:hover {
    font-weight: 500;
  }
  .mini{
    height: 38px
  }
  .icono_bloqueado{
    color: #ff0000;
    font-size: 36px;
    position: absolute;
    margin: -3px 0px 0px -42px
  }
  .back_par {
    background: #e6e6e6;
}
.recipiente-tools{
  border-radius: 15px; 
  background: white;
}
</style>

<div class="grid-container row"   class:back_par={es_par}
class:usuario_inactivo={usuario.activo === false}>
  <div class="uno" title="Usuario con el que hace login">
  <img class="mini" src="./imagenes/usuario_generico.svg" alt="perfil">
   
{#if usuario.activo === false}
     <i class="material-icons icono_bloqueado no_select"  title="Usuario no activo para Login y acciones en sistema">block</i>
  {/if}
  </div>
  <div class="dos">{usuario.nombre} <br> <span class="indice_row">{usuario.usuario}</span> </div>
  <div class="tres">{usuario.correo}</div>
  <div class="cuatro">{usuario.rol}</div>
  <div class="cinco">
 {formato_precio(usuario.comision)}  %
  </div>
  
  <div
    class="seis pointer reactivo">
   <ButtonGroup style="border-radius: 17px; background: white;">
      {#if usuario.activo}
        <!-- content here -->
        <Button
        disabled={procesando}
          icon
          dense
          color="accent"
          on:click={() => {
            cambiar_status_activo(false);
          }}
          title="desactivar para login">
          <i class="material-icons">cancel</i>
        </Button>
      {:else}
        <!-- else content here -->
        <Button
        disabled={procesando}
          icon
          dense
          color="green"
          on:click={() => {
            cambiar_status_activo(true);
          }}
          title="activar para login">
          <i class="material-icons">check</i>
        </Button>
      {/if}

      <Button
        icon
        dense
        color="green"
        on:click={() => {
          if(usuario.usuario==='aministrador'|| $usuario_db.usuario!='isotech_Xenonymas'){
            
            return;
          }
          //$usuario_selecto = usuario;
         editar();
        }}
        title="Editar ">
        <i class="material-icons">create</i>
      </Button>

      <Button
        icon
        dense
        color="green"
        on:click={() => {
          if($usuario_db.rol !='administrador'){
            return;
          }
          //$usuario_selecto = usuario;
         dialogo_pass_visible= true;
        }}
        title="Cambiar Password">
        <i class="material-icons">vpn_key</i>
      </Button>
     
    </ButtonGroup>
  </div>

</div>



<Dialogo_password
  bind:usuario={usuario}
  id={usuario._id}
  bind:visible={dialogo_pass_visible} />
