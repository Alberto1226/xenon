<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, Snackbar } from "svelte-mui/src";
  import Direccion_nueva_formulario from "./Direccion_nueva.svelte";
  import Direccion_editar_formulario from "./Direccion_editar.svelte";
  import { editar_store, mensajes_app } from "./../../../../stores";
  export var direcciones;
  const dispatch = createEventDispatcher();
  let titulo_formulario = "CREAR DIRECCION";
  let creando = true;
  let direccion_a_editar_local = null;
  let indice_selecto = -1;
  let cargando_edicion = false;
  let visible_borrar = false;
  var direccion_nueva = {
    calle: "",
    colonia: "",
    cp: "",
    entre_calle: "",
    estado: "",
    localidad_nombre: "",
    localidad: "",
    municipio: "",
    nombre: "",
    telefono: "",
    correo: "",
    notas: "",
    numero_exterior: "",
    numero_interior: "",
    pais: "",
    y_calle: "",
    rfc: "",
    cfdi: "",
    rfiscal: "",
    tipo: "",
  };
  var lista = [];

  onMount(() => {
    restablecer_direccion_nueva();
  });

  //comando para aparecer el formualro de edicion

  function agregar_direccion() {
    // console.log("agregar_direccion", direccion_nueva);
    let rfcValidado = ValidarTipoDireccion(true);

    // if (creando) direcciones.push(direccion_nueva);
    if (creando) {
      if (
        rfcValidado ||
        !direccion_nueva.nombre ||
        !direccion_nueva.pais ||
        !direccion_nueva.estado ||
        !direccion_nueva.telefono ||
        !direccion_nueva.correo ||
        !direccion_nueva.municipio ||
        !direccion_nueva.localidad_nombre ||
        !direccion_nueva.colonia ||
        !direccion_nueva.cp ||
        !direccion_nueva.calle ||
        !direccion_nueva.numero_exterior ||
        !direccion_nueva.entre_calle ||
        !direccion_nueva.y_calle
      ) {
        // console.log(
        //   "rfc",
        //   direccion_nueva.rfc,
        //   "nombre",
        //   direccion_nueva.nombre,
        //   "pais",
        //   direccion_nueva.pais,
        //   "estado",
        //   direccion_nueva.estado,
        //   "municipio",
        //   direccion_nueva.municipio,
        //   "localidad_nombre",
        //   direccion_nueva.localidad_nombre,
        //   "tipo",
        //   direccion_nueva.tipo,
        //   "colonia",
        //   direccion_nueva.colonia,
        //   "cp",
        //   direccion_nueva.cp,
        //   "calle",
        //   direccion_nueva.calle,
        //   "numero_exterior",
        //   direccion_nueva.numero_exterior,
        //   "entre_calle",
        //   direccion_nueva.entre_calle,
        //   "y_calle",
        //   direccion_nueva.y_calle,
        // );
        $mensajes_app.push({
          tipo: "error",
          mensaje: "Todos los campos de la dirección deben estar completos",
        });
        $mensajes_app = $mensajes_app;
      } else {
        direcciones.push(direccion_nueva);
        restablecer_direccion_nueva();
      }
    } else {
      // console.log("direccion_a_editar_local", direccion_a_editar_local);
      direcciones.push(direccion_a_editar_local);
    }
    direcciones = direcciones;
    //console.log(direcciones);
    creando = true;
    // restablecer_direccion_nueva();
    titulo_formulario = "CREAR DIRECCION";
  }

  function editar_direccion() {
    let rfcValidado = ValidarTipoDireccion();
    // console.log("editar", direccion_a_editar_local);
    if (
      rfcValidado ||
      !direccion_a_editar_local.nombre ||
      !direccion_a_editar_local.pais ||
      !direccion_a_editar_local.estado ||
      !direccion_a_editar_local.telefono ||
      !direccion_a_editar_local.correo ||
      !direccion_a_editar_local.municipio ||
      !direccion_a_editar_local.localidad_nombre ||
      !direccion_a_editar_local.tipo ||
      !direccion_a_editar_local.colonia ||
      !direccion_a_editar_local.cp ||
      !direccion_a_editar_local.calle ||
      !direccion_a_editar_local.numero_exterior ||
      !direccion_a_editar_local.entre_calle ||
      !direccion_a_editar_local.y_calle
    ) {
      // console.log(
      //   "rfc",
      //   direccion_a_editar_local.rfc,
      //   "nombre",
      //   direccion_a_editar_local.nombre,
      //   "pais",
      //   direccion_a_editar_local.pais,
      //   "estado",
      //   direccion_a_editar_local.estado,
      //   "municipio",
      //   direccion_a_editar_local.municipio,
      //   "localidad_nombre",
      //   direccion_a_editar_local.localidad_nombre,
      //   "tipo",
      //   direccion_a_editar_local.tipo,
      //   "colonia",
      //   direccion_a_editar_local.colonia,
      //   "cp",
      //   direccion_a_editar_local.cp,
      //   "calle",
      //   direccion_a_editar_local.calle,
      //   "numero_exterior",
      //   direccion_a_editar_local.numero_exterior,
      //   "entre_calle",
      //   direccion_a_editar_local.entre_calle,
      //   "y_calle",
      //   direccion_a_editar_local.y_calle,
      // );
      $mensajes_app.push({
        tipo: "error",
        mensaje: "Todos los campos de la dirección deben estar completos",
      });
      $mensajes_app = $mensajes_app;
    } else {
      // direcciones.push(direccion_a_editar_local);
      direcciones[indice_selecto] = direccion_a_editar_local;
      direcciones = direcciones;
      $mensajes_app.push({
        tipo: "exito",
        mensaje: "Editado",
      });
      $mensajes_app = $mensajes_app;
    }
    //console.log(indice_selecto);

    //restablecer_direccion_nueva();
  }

  function borrar_direccion() {
    direcciones.splice(indice_selecto, 1);
    direcciones = direcciones;
    //console.loge.log(direcciones);

    restablecer_direccion_nueva();
  }

  function restablecer_direccion_nueva() {
    direccion_nueva = {
      calle: "",
      colonia: "",
      cp: "",
      entre_calle: "",
      estado: "",
      localidad_nombre: "",
      localidad: "",
      municipio: "",
      nombre: "",
      telefono: "",
      correo: "",
      notas: "",
      numero_exterior: "",
      numero_interior: "",
      pais: "",
      y_calle: "",
      rfc: "",
      cfdi: "",
      rfiscal: "",
      tipo: "",
    };
  }

  function ValidarTipoDireccion(d = false) {
    if (d) {
      if (
        direccion_nueva.tipo === "envio/facturacion" ||
        direccion_nueva.tipo == "facturacion"
      ) {
        /*
      rfc: "",
      cfdi: "",
      rfiscal: "",
      tipo_persona: "",
      */
        if (
          !direccion_nueva.rfc ||
          !direccion_nueva.cfdi ||
          !direccion_nueva.rfiscal ||
          !direccion_nueva.tipo_persona
        ) {
          // console.log("true");
          return true;
        } else {
          // console.log("false");
          return false;
        }
      } else {
        // console.log("false");
        return false;
      }
    } else {
      if (
        direccion_a_editar_local.tipo === "envio/facturacion" ||
        direccion_a_editar_local.tipo == "facturacion"
      ) {
        /*
      rfc: "",
      cfdi: "",
      rfiscal: "",
      tipo_persona: "",
      */
        if (
          !direccion_a_editar_local.rfc ||
          !direccion_a_editar_local.cfdi ||
          !direccion_a_editar_local.rfiscal ||
          !direccion_a_editar_local.tipo_persona
        ) {
          // console.log("true");
          return true;
        } else {
          // console.log("false");
          return false;
        }
      } else {
        // console.log("false");
        return false;
      }
    }
  }
</script>

<div class="grid-container">
  <div class="titulo_direcciones centrado">
    DIRECCIONES ({direcciones.length})
  </div>
  <div class="titulo_editar centrado">{titulo_formulario}</div>
  <div class="lista_direcciones">
    <div class="centrado">
      {direcciones.length == 0 ? "No existen direcciones asociadas" : ""}
    </div>
    {#each direcciones as item, i}
      <!-- LISTA DE DIRECCIONES -->
      <div
        class="row status_cambiado"
        class:direccion_seleccionada={i == indice_selecto}
      >
        <table>
          <tr>
            <td>
              <span class="indice_row">{i + 1})</span>
              <i style="font-size:2em;" class="material-icons">house</i>
            </td>
            <td class="td_ancho">
              <span class="color_azul">{item.tipo}</span>
              <br />
              {item.calle}
              {item.numero_exterior}...
            </td>
            <td>
              <Button
                title="Editar direccion"
                icon
                on:click={() => {
                  indice_selecto = i;
                  direccion_a_editar_local = item;
                  $editar_store.direccion = item;
                  cargando_edicion = true;
                  creando = false;
                  titulo_formulario = "EDITANDO DIRECCION";
                }}
              >
                <i style="font-size:2em;" class="material-icons">create</i>
              </Button>
            </td>
            <td>
              <Button
                raised
                color="darkorange"
                title="Borrar direccion"
                icon
                on:click={() => {
                  indice_selecto = i;
                  visible_borrar = true;
                }}
              >
                <i style="font-size:2em;" class="material-icons">delete</i>
              </Button>
            </td>
          </tr>
        </table>
      </div>
    {/each}
  </div>
  <div class="formulario">
    {#if creando}
      <!-- FORMULARIOS NUEVO Y EDITAR -->
      <Direccion_nueva_formulario bind:direccion_nueva />
      <div class="centrado">
        <table style="margin: 0 auto;">
          <tr>
            <td>
              <!-- BOTON GUARDAR NUEVO -->
              <Button on:click={agregar_direccion} raised color="black">
                <i class="material-icons vertical-alineado">save</i>
                Crear direccion nueva
              </Button>
            </td>
          </tr>
        </table>
      </div>
    {:else}
      <svelte:component
        this={creando === false ? Direccion_editar_formulario : null}
        bind:cargando={cargando_edicion}
        bind:direccion_a_editar={direccion_a_editar_local}
      />

      <!-- BOTONES PARA EDITAR-->
      <Button
        title="Crear dirección nueva a partir de actual"
        on:click={() => {
          indice_selecto = -1;
          agregar_direccion();
        }}
        raised
        color="primary"
      >
        <i class="material-icons vertical-alineado">add_location</i>
        Crear nueva
      </Button>
      <Button
        title="Regresar a dirección nueva"
        on:click={() => {
          creando = true;
          indice_selecto = -1;
          restablecer_direccion_nueva();
          titulo_formulario = "CREAR DIRECCION";
        }}
        raised
        color="darkorange"
      >
        <i class="material-icons vertical-alineado" />
        Cancelar
      </Button>
      <Button
        on:click={() => {
          editar_direccion();
        }}
        raised
        color="black"
      >
        <i class="material-icons vertical-alineado">save</i>
        Editar direccion
      </Button>
    {/if}
  </div>
</div>

<Snackbar bind:visible={visible_borrar} bg="#f44336">
  Borrar permanentemente dirección ?
  <span slot="action">
    <Button
      color="#ff0"
      on:click={() => {
        creando = true;
        borrar_direccion();
        visible_borrar = false;
      }}
    >
      Si , borrar
    </Button>
  </span>
</Snackbar>

<style>
  .grid-container {
    margin: 10px 10px 10px 40px;
    display: grid;
    grid-template-columns: 290px 1fr;
    grid-template-rows: 60px 2.3fr;
    grid-template-areas: "titulo_direcciones titulo_editar" "lista_direcciones formulario";
  }

  .titulo_direcciones {
    grid-area: titulo_direcciones;
    background: #292929;
    font-size: 1.2em;
    font-weight: 200;
    color: white;
    padding: 21px 0px;
  }

  .titulo_editar {
    grid-area: titulo_editar;
    background: #292929;
    font-size: 1.2em;
    font-weight: 200;
    color: white;
    padding: 21px 0px;
  }

  .lista_direcciones {
    grid-area: lista_direcciones;
  }

  .formulario {
    grid-area: formulario;
  }

  .color_azul {
    color: dodgerblue;
    font-weight: 500;
  }

  .status_cambiado {
    animation-duration: 0.5s;
    animation-name: status;
  }

  @keyframes status {
    from {
      background-color: rgba(0, 95, 184, 0.425);
      color: white;
    }
    to {
      background-color: white;
      color: black;
    }
  }
  .row {
    padding: 2px;
    border-radius: 2px;
  }
  .row:hover {
    box-shadow: 2px 2px 4px gray;
  }
  .td_ancho {
    width: 145px;
  }
  .direccion_seleccionada {
    background-color: #292929;
    color: white;
  }
</style>
