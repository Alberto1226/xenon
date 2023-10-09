<script>
  import { Tabs, Tab, TabList, TabPanel } from "svelte-tabs";
  import { Button } from "svelte-mui/src";
  import Datos_de_usuario from "./_componentes/Datos_de_usuario.svelte";
  import Direcciones from "./_componentes/Direcciones.svelte";
  import Domicilio_fiscal from "./_componentes/Domicilio_fiscal.svelte";
  import { createEventDispatcher } from "svelte";
  import { mensajes_app, clientes, postData ,usuario_db} from "./../../../stores";
  import { goto } from "@sapper/app";
  const dispatch = createEventDispatcher();
  let guardando;
  let habilitar_guardar = false;
  var nuevo_cliente = {
    activo: true,
    agente: {
      nombre: "",
      id: "",
      correo: ""
    },
    alias: "",
    correo: "",
    direcciones_asociadas: [],
    fecha_nacimiento: new Date(),
    fecha_creacion: new Date(),
    fecha_update: new Date(),
    fecha_desactivacion: "",
    datos_fiscales: {
      razon_social: "",
      rfc: "",
      nombre: ""
    },
    localidad: "",
    nombre: "",
    perfil: {
      perfil: "Público en general",
      porcentaje: 0
    },
    plataforma: "web",
    push_token: "",
    region: "",
    telefono: "",
    uid: "",
    password: ""
  };
  $: nuevo_cliente.codigo = nuevo_cliente.correo;
  function cancelar() {
    dispatch("ver_lista");

            goto('/app/clientes');
  }

  $: if(nuevo_cliente){
    habilitar_guardar = !checar_formulario_falta_algo()
  }

  function handleKeydown(evt) {
    if (evt.key == "Escape") {
      //  estado_actual = "viendo lista"
    }
  }

  function guardar_en_DB() {
    ////console.log(nuevo_cliente);

    if (checar_formulario_falta_algo() == true) {
      $mensajes_app.push({
        tipo: "error",
        mensaje: "Falta de rellenar algún campo obligatorio *"
      });
      $mensajes_app = $mensajes_app;
      //    //console.log(nuevo_cliente);
      return;
    }
    guardando = true;
    postData("app/clientes/nuevo/crear_cliente_nuevo", nuevo_cliente)
      .then(respuesta => {
        //   //console.log(respuesta);

        guardando = false;
        //  Checar si se logro guardar el cliente
        if (respuesta.ok) {
          if (respuesta.ok) {
            $mensajes_app.push({
              tipo: "exito",
              mensaje: "cliente creado !"
            });
            $mensajes_app = $mensajes_app;
            $clientes.lista.push(nuevo_cliente);
            $clientes = $clientes;
            dispatch("ver_lista");
            goto("/app/clientes");
          }
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta.mensaje
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
          mensaje: "No se pudo crear el cliente."
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function checar_formulario_falta_algo() {
    var dos = nuevo_cliente.nombre == "";
    var tres = nuevo_cliente.correo == "";
    var cuatro =
      nuevo_cliente.password == "" || nuevo_cliente.password.length <= 5;
    var cinco = nuevo_cliente.perfil == null;
    var seis = nuevo_cliente.agente == "";
    if($usuario_db.rol==='vendedor')seis = false;
    var algo_esta_mal = dos || tres || cuatro || cinco || seis;
    return algo_esta_mal;
  }
</script>

<div style="padding:15px 15px;">

  <Tabs>
    <TabList>
      <Tab>Datos de cliente</Tab>
      <Tab>Direcciones</Tab>

    </TabList>

    <TabPanel>

      <Datos_de_usuario bind:nuevo_cliente />

      <div class="centrado">
        <table style="margin: 0 auto;">
          <tr>
            <td>
              <Button on:click={cancelar} color="darkorange">Cancelar</Button>
            </td>
            <td>
            {#if habilitar_guardar }
               <!-- content here -->

              <Button raised on:click={guardar_en_DB} color="primary">
                Guardar
              </Button>

              {:else}

              <Button disabled color="gray">
                Guardar
              </Button>
            {/if}

            </td>
          </tr>
        </table>
      </div>
    </TabPanel>

    <TabPanel>
      <Direcciones bind:direcciones={nuevo_cliente.direcciones_asociadas} />
    </TabPanel>

  </Tabs>

</div>
