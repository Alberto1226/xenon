<script>

  import { createEventDispatcher ,onMount } from "svelte";
  import { mensajes_app, usuarios ,editar_store ,postData} from "./../../../stores";
   import { Textfield, Button, Datefield } from "svelte-mui/src";
  import { fade } from "svelte/transition";
  import Rol from "./_Rol.svelte";
  import { goto } from "@sapper/app";
  const dispatch = createEventDispatcher();
  var usuario_temp ;
  var fecha_nacimiento_temp ;
  var todo_cargado =false;
  let guardando= false;

onMount(()=>{
   //fecha_nacimiento_temp = usuario_temp.fecha_nacimiento.toDate();
   usuario_temp= $editar_store.usuario;
   setTimeout(()=>{
     todo_cargado =true;
      setTimeout(()=>{
      const primer_input = document.getElementById('primer_input');
      if(primer_input)primer_input.focus();
    },500)
   },100);
})

  function cancelar() {
    goto("app/usuarios");
  }
  function handleKeydown(evt) {
   ////console.log();

    if (evt.key == "Escape") {
      //  estado_actual = "viendo lista"
    }
  }

  function guardar_en_DB() {
    if (checar_formulario_falta_algo() == true) {
      $mensajes_app.push({
        tipo: "error",
        mensaje: "Falta de rellenar algún campo obligatorio *"
      });
      $mensajes_app = $mensajes_app;
        //console.log(usuario_temp);
      return;
    }
    guardando = true;
    postData("app/usuarios/editar/editar_usuario",  usuario_temp )
      .then(respuesta => {
       //console.log(respuesta);
        
        guardando = false;
        //  Checar si se logro guardar el usuario
        if (respuesta.ok) {
          if (respuesta.ok) {
            $mensajes_app.push({
              tipo: "exito",
              mensaje: "usuario creado !"
            });
            $mensajes_app = $mensajes_app;
            $usuarios.lista.push(usuario_temp);
            $usuarios = $usuarios;
            dispatch("ver_lista");
          }
        } else {
            $mensajes_app.push({
            tipo: "error",
            mensaje: "No se pudo crear el usuario."
          });
          $mensajes_app = $mensajes_app;
        }

        ////console.log(respuesta);
      })
      .catch(err => {
        guardando = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo crear el usuario."
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function checar_formulario_falta_algo() {
    var uno = usuario_temp.usuario == "";
    var dos = usuario_temp.nombre == "";
    var tres = usuario_temp.correo == "";
    var cuatro =
      usuario_temp.password == "" || usuario_temp.password.length <= 5;
      var cinco = usuario_temp.rol =="";
    var algo_esta_mal = uno || dos || tres || cuatro || cinco;
    return algo_esta_mal;
  }
</script>

<style>


  .grid-container {
    margin: 1px 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr;
    grid-template-areas: "uno dos" "tres cuatro" "cinco seis" "siete siete";
  }

  .uno {
    grid-area: uno;
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

  .siete {
    grid-area: siete;
  }

  .espacio {
    padding: 5px;
  }
</style>
<div class="centrado titulo_formulario" style="padding-top:30px;">Editar usuario</div>

    {#if todo_cargado}
       <!-- content here -->

       <div in:fade={{ duration: 500 }}>
  <div class="grid-container">
    <div class="uno espacio">

      <Textfield
        error={usuario_temp==undefined ?"":usuario_temp.nombre == '' ? 'Nombre no puede estar vacío' : ''}
        
        bind:value={usuario_temp.nombre}
        label="Nombre*"
        message="Nombre*"
        type="text" />
    </div>
    <div class="dos espacio">


      <Textfield
        error={usuario_temp==undefined ?"":usuario_temp.correo == '' ? 'Correo no puede estar vacío' : ''}
        
        bind:value={usuario_temp.correo}
        label="Correo"
        message="Correo"
        type="text" />
 
    </div>
    <div class="tres espacio">
        <Textfield
      error={usuario_temp.usuario ==""?"Usuario no puede estar vacío":"" }
        
        name='usuario_temp_sistema'
        bind:value={usuario_temp.usuario}
        label="Usuario de sistema"
        message="Usuario"
        type="text" />
     <!-- 
        <Textfield
        error={usuario_temp==undefined ?"":usuario_temp.password == '' || usuario_temp.password.length < 6 ? 'Password no puede estar vacío o ser menor a 6 dígitos' : ''}
        
        bind:value={usuario_temp.password}
        label="Password"
        message="Password"
        type="password" />
      -->
    </div>
    <div class="cuatro espacio">
      <Rol bind:rol={usuario_temp.rol} />
    </div>
    <div class="cinco espacio">

      <Textfield
        error={usuario_temp==undefined ?"":isNaN(usuario_temp.comision) || usuario_temp.comision < 0 ? ' Comisión errónea' : ''}
        
        bind:value={usuario_temp.comision}
        label="Comisión"
        message="Comisión"
        type="number" />
    </div>
    <div class="seis espacio" />
    <div class="siete espacio" />
  </div>

</div>



<div class="centrado">
  <table style="margin: 0 auto;">
    <tr>
      <td>
        <Button on:click={cancelar} color="darkorange">Cancelar</Button>
      </td>
      <td>
        <Button on:click={guardar_en_DB} color="primary">Editar</Button>
      </td>
    </tr>
  </table>
</div>

    {/if}
