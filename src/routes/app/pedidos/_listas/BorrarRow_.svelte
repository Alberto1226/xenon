<script>
  
  import {
    formato_precio,
    pedido_selecto,
    mensajes_app,
    pedidos,
    cargando_mensajes_app,
    postData,
    editar_store
  } from "./../../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, ButtonGroup, Snackbar } from "svelte-mui/src";
  import Cambio_status from "./_Cambio_status.svelte";
  import Paqueteria from "./Paqueteria.svelte";
  import {goto} from '@sapper/app';
  export var pedido = {
    folio: "",
    fecha: "",
    moneda: "",
    usuario_que_registro: "",
    total_pedido: "",
    descuento: 0,
    agente: {
      nombre: "",
      correo: "",
      comision: 0
    },
    cliente: {
      nombre: "",
      correo: ""
    },
    activo: true
  };
</script>

<style>
  
</style>

<div class="">
{pedido.folio}
 </div>