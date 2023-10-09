<script>
  import { Textfield, Button, Datefield } from "svelte-mui/src";
  import { fade } from "svelte/transition";
  import Rol from "./_Rol.svelte";
  import {onMount} from 'svelte';
  export var nuevo_usuario;
  let format = "D.MM.YYYY";
  const onchange = ({ detail }) => {
   //console.log("onchange", detail);
  };
  onMount(()=>{
    setTimeout(()=>{
      const primer_input = document.getElementById('primer_input');
      primer_input.focus();
    },500)
  })
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

<div in:fade={{ duration: 500 }}>
  <div class="grid-container">
    <div class="uno espacio">

      <Textfield
        error={nuevo_usuario.nombre ==""?"Nombre no puede estar vacío":"" }
        
        id='primer_input'
        bind:value={nuevo_usuario.nombre}
        label="Nombre*"
        message="Nombre a mostrar*"
        type="text" />
        <br>

      <Textfield
      error={nuevo_usuario.usuario ==""?"Usuario no puede estar vacío":"" }
        
        name='nuevo_usuario_sistema'
        bind:value={nuevo_usuario.usuario}
        label="Usuario de sistema"
        message="Usuario"
        type="text" />
    </div>
    <div class="dos espacio">

      <Textfield
     
        
        name='nuevo_usuario'
        bind:value={nuevo_usuario.correo}
        label="Correo"
        message="Correo"
        type="text" />

    </div>
    <div class="tres espacio">
 <Textfield
      error={nuevo_usuario.password =="" || nuevo_usuario.password.length <6?"Password no puede estar vacío o ser menor a 6 dígitos":"" }
        
        bind:value={nuevo_usuario.password}
        name='nuevo_Password'
        label="Password"
        message="Password"
        type="password" />
    </div>
    <div class="cuatro espacio">
     <Rol bind:rol={nuevo_usuario.rol}/>
    </div>
    <div class="cinco espacio">

 <Textfield
      error={isNaN(nuevo_usuario.comision) || nuevo_usuario.comision <0?" Comisión errónea":"" }
        
        bind:value={nuevo_usuario.comision}
        label="Comisión"
        message="Comisión"
        type="number" />
    </div>
    <div class="seis espacio">

     
    </div>
    <div class="siete espacio">

    </div>
  </div>

</div>
