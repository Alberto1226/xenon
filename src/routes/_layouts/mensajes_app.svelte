<script>
  import { mensajes_app } from "./../stores";
  import { Snackbar, Button } from "svelte-mui/src";
  let visible=false;
  let fondo_snack='white';
  let message='';

  var intervalo;
    ///  Reaccionar con mensaje nuevo
  $: if ($mensajes_app.length > 0) {
    intervalo = setInterval(() => {
      if ($mensajes_app.length > 0) {
        var msg = $mensajes_app[0].mensaje;
        if ($mensajes_app[0].tipo == "exito") fondo_snack = "#3e58ec;";
        if ($mensajes_app[0].tipo == "error") fondo_snack = "#FF5722;";
        if ($mensajes_app[0].tipo == "info") fondo_snack = "#1b3573";
        message = msg;
        visible = true;
        $mensajes_app.splice(0, 1);
      }
    }, 100);
  }

  $: if ($mensajes_app.length === 0) {
    clearInterval("intervalo");
  }
</script>



<!-- Styles -->
<Snackbar bind:visible bg={fondo_snack}>
  <div
    style="background-color:rgba(240, 248, 255, 0.075);text-shadow: 1px 1px 5px
    currentColor;color:white;">
   
    {@html message}
  </div>

  <span slot="action">
    <Button color="white" on:click={() => (visible = false)}>Cerrar</Button>
  </span>
</Snackbar>
