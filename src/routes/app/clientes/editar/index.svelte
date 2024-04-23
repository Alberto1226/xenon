<script>
  import { Tabs, Tab, TabList, TabPanel } from "svelte-tabs";
  import { Button } from "svelte-mui/src";
  import Datos_de_usuario from "./_componentes/Datos_de_usuario.svelte";
  import Direcciones from "./_componentes/Direcciones.svelte";
  import { createEventDispatcher,onMount } from "svelte";
  import { mensajes_app, clientes,editar_store ,postData,usuario_db} from "./../../../stores";
  import {goto} from '@sapper/app';
  onMount(()=>{
    //console.log()
    setTimeout(()=>{
      cliente_selecto = $editar_store.cliente;
      // cliente_selecto.fecha_nacimiento = new Date(cliente_selecto.fecha_nacimiento);
      // console.log("index-----",cliente_selecto);
    },500)
  })
  const dispatch = createEventDispatcher();
  let guardando;
  var cliente_selecto = {
     agente :{
        nombre :'',
        id :'',
        correo :'',
    },
    nombre: "",
    alias: "",
    correo: "",
    password: "",
    fecha_nacimiento: new Date(),
    perfil: {
      perfil:'',
      porcentaje:0
    },
    region: "",
    telefono: "",
    direccion_envio: {
      nombre: "",
      calle: "",
      numero_exterior: "",
      numero_interior: "",
      estado: "",
      municipio: "",
      localidad: "",
      colonia: "",
      cp: "",      
      entre_calle: "",
      y_calle: "",
      notas: "",
      pais:''
    },
    domicilio_fiscal: {
      rfc: "",
      razon_social: "",
      calle: "",
      numero_exterior: "",
      numero_interior: "",
      colonia: "",
      estado: "",
      municipio: "",
      localidad: "",
      pais:'',
      cp: ""
    },
    activo: true
  };
  
  function cancelar() {
    goto('app/clientes')
    dispatch("ver_lista");
  }
 

  function handleKeydown(evt) {
  // //console.log();

    if (evt.key == "Escape") {
      //  estado_actual = "viendo lista"
    }
  }

  function editar_en_DB() {

  // //console.log(cliente_selecto);

    if (checar_formulario_falta_algo() == true) {
      $mensajes_app.push({
        tipo: "error",
        mensaje: "Falta de rellenar algún campo obligatorio *"
      });
      $mensajes_app = $mensajes_app;
   //     //console.log(cliente_selecto);
      return;
    }
    guardando = true;
    postData("app/clientes/editar/editar_cliente",  cliente_selecto )
      .then(respuesta => {
        //console.log(respuesta);
        
   
        //  Checar si se logro guardar el cliente
        if (respuesta.ok) {
          if (respuesta.ok) {
            $mensajes_app.push({
              tipo: "exito",
              mensaje: "cliente editado !"
            });
            $mensajes_app = $mensajes_app;
            let lista_nueva = $clientes.lista;
            let cliente_en_lista = lista_nueva.find(element=>element._id ===cliente_selecto._id);
            cliente_en_lista = cliente_selecto;
            $clientes.lista = lista_nueva;
            $clientes = $clientes;
            dispatch("ver_lista");
            goto('/app/clientes');
          }
        } else {
            $mensajes_app.push({
            tipo: "error",
            mensaje: "No se pudo crear el cliente."
          });
          $mensajes_app = $mensajes_app;
        }
     guardando = false;
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
    var dos = cliente_selecto.nombre == "";
    var tres = cliente_selecto.correo == "";
    
    var cinco = cliente_selecto.perfil == "";
    var seis = cliente_selecto.agente == "";

    if($usuario_db.rol==='vendedor')seis = false;
    var algo_esta_mal =  dos || tres  || cinco || seis;
    return algo_esta_mal;
  }
</script>

<style>
.barra_superior{
  background-color: green;
  height: 20px;
  color: white;
  padding-top: 10px
}

</style>
<div class=" centrado titulo_formulario barra_superior">
Editar {cliente_selecto.nombre}
</div>
<Tabs>
  <TabList>
    <Tab>Datos de cliente</Tab>
      <Tab>Direcciones</Tab>
  </TabList>

  <TabPanel>

    <Datos_de_usuario bind:cliente_selecto />
  </TabPanel>

  <TabPanel>
    <Direcciones bind:direcciones={cliente_selecto.direcciones_asociadas} />
  </TabPanel>

</Tabs>

<div class="centrado">
  <table style="margin: 0 auto;">
    <tr>
      <td>
        <Button on:click={cancelar} color="darkorange">Cancelar</Button>
      </td>
      <td>
        <Button raised on:click={editar_en_DB} color="primary"> <i class="material-icons">save</i> Guardar</Button>
      </td>
    </tr>
  </table>
</div>
