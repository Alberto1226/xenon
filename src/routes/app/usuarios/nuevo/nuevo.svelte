<script>
  import { Tabs, Tab, TabList, TabPanel } from "svelte-tabs";
  import { Button } from "svelte-mui/src";
  import Datos_de_usuario from "./_Datos_de_usuario.svelte";
  import { createEventDispatcher } from "svelte";
  import { mensajes_app, usuarios, postData } from "./../../../stores";
  import { goto } from "@sapper/app";

  const dispatch = createEventDispatcher();

  let guardando = false;
  var nuevo_usuario = {
    usuario:'',
    codigo: "",
    nombre: "",
    alias: "",
    correo: "",
    password: "",
    rol: "",
    comision: 0,
    activo: true
  };
  
  function cancelar() {
    goto("app/usuarios");
  }

  function handleKeydown(evt) {
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
        //console.log(nuevo_usuario);
      return;
    }
    guardando = true;
    postData("app/usuarios/nuevo/crear_usuario_nuevo",  nuevo_usuario )
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
            $usuarios.lista.push(nuevo_usuario);
            $usuarios = $usuarios;
            dispatch("ver_lista");
            goto('app/usuarios')
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
    var uno = nuevo_usuario.nombre == "";
    var dos = nuevo_usuario.rol == "";
    var tres = nuevo_usuario.correo == "";
    var cuatro =
      nuevo_usuario.password == "" || nuevo_usuario.password.length <= 5;

    var algo_esta_mal = uno || dos || tres || cuatro;
    return algo_esta_mal;
  }
</script>

<div style="padding-top:20px;" class="centrado titulo_formulario">
  Usuario nuevo
</div>
<Datos_de_usuario bind:nuevo_usuario />

<div class="centrado">
  <table style="margin: 0 auto;">
    <tr>
      <td>
        <Button on:click={cancelar} color="darkorange">Cancelar</Button>
      </td>
      <td>
        <Button disabled={guardando} on:click={guardar_en_DB} color="primary">
          Guardar
        </Button>
      </td>
    </tr>
  </table>
</div>
