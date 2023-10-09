<script>
  import { onMount } from "svelte";
  import { postData, usuario_db } from "./../stores";
  import { goto } from "@sapper/app";

  var ultimo_rol = "";
  var cerrado = false;
  var mensaje="";
  onMount(()=>{
    setTimeout(()=>{
      salir()
    },1000);
  })

  function salir() {
   // ultimo_rol = $usuario_db.rol_base;
    fetch("app/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    })
      .then(resp => {
        $usuario_db = {};
        //$lista_de_usuarios=[];
        return resp.text();
      })
      .then(function(data) {
        cerrado = true;
        mensaje = "Gracias, te esperamos de regreso pronto !";        
        setTimeout(() => {
          //mensaje = "bye..."
          setTimeout(() => {
          goto("login" );
        }, 500);
        }, 100);
      });
  }

</script>
<style>
.centrado_vertical{
  padding-top:calc(50vh - 150px);
}
.logo{
  height: 35px;
}
h2{
  color:#0083c3;
}
h3{
  color:white;
}
</style>

{#if cerrado==false}
   <!-- cerrando -->   
<h3 class="centrado centrado_vertical">
  Cerrando sesion, un momento por favor...
</h3>
{:else}
   <!-- cerrado -->
   <h2 class="centrado centrado_vertical">{mensaje}</h2>
{/if}
<div class="centrado">


<img src="imagenes/logo_black.png" alt="logo" class="no_seleccionable logo">

</div>
