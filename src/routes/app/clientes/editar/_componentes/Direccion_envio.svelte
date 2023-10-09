<script>
  import { Textfield, Button, Datefield } from "svelte-mui/src";
  import Perfil from "./Perfil.svelte";
  import Region from "./Region.svelte";
  import Estado from "./Estado.svelte";
  import {fade} from "svelte/transition";
  export var cliente_selecto;
  let format = "D.MM.YYYY";
  const onchange = ({ detail }) => {
   //console.log("onchange", detail);
  };



  /*
  direccion_envio:{
        nombre:"",
        calle:"",
        numero_exterior:"",
        numero_interior:"",
        estado:"",
        municipio:"",
        localidad:"",
        colonia:"",
        cp:"",
        telefono:"",
        entre_calle:"",
        y_calle:"",
        notas:""
    }
  */
</script>

<style>
.grid-container {
  margin: 1px 10px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas: "uno dos tres cuatro" "cinco seis siete ocho" "nueve diez once doce";
}

.uno { grid-area: uno; }

.dos { grid-area: dos; }

.tres { grid-area: tres; }

.cuatro { grid-area: cuatro; }

.cinco { grid-area: cinco; }

.seis { grid-area: seis; }

.siete { grid-area: siete; }

.ocho { grid-area: ocho; }

.nueve { grid-area: nueve; }

.diez { grid-area: diez; }

.once { grid-area: once; }

.doce { grid-area: doce; }
 .espacio{
      padding: 5px;
  }
</style>
<div class="grid-container" in:fade={{duration:500}}>
  <div class="uno espacio"><Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.nombre}
  placeholder="Nombre"
  message="Nombre"
  type="text" /></div>
  <div class="dos espacio">
<Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.calle}
  placeholder="Calle"
  message="Calle"
  type="text" /></div>
  <div class="tres espacio">

<Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.numero_exterior}
  placeholder="Número exterior"
  message="Número exterior"
  type="text" />


</div>
  <div class="cuatro espacio">
<Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.numero_interior}
  placeholder="Número interior"
  message="Número interior"
  type="text" />
</div>
  <div class="cinco espacio">

<Estado bind:estado={cliente_selecto.direccion_envio.estado}   />
  </div>
  <div class="seis">


  
  <Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.municipio}
  placeholder="Municipio"
  message="Municipio"
  type="text" />
</div>
  <div class="siete espacio">




  <Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.localidad}
  placeholder="Localidad"
  message="Localidad"
  type="text" />
</div>
  <div class="ocho espacio">



  <Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.colonia}
  placeholder="Colonia"
  message="Colonia"
  type="text" />
</div>
  <div class="nueve espacio">

  
  
  <Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.cp}
  placeholder="C.P."
  message="Código Postal"
  type="text" />
  </div>



  <div class="diez espacio">


  
  <Textfield
  disbled
  outlined
  bind:value={cliente_selecto.telefono}
  placeholder="Teléfono"
  message="Teléfono"
  type="text" />
  </div>
  <div class="once espacio">


  <Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.entre_calle}
  placeholder="Entre calle"
  message="Entre calle"
  type="text" />
  </div>
  <div class="doce espacio">


  
  <Textfield
  disbled
  outlined
  bind:value={cliente_selecto.direccion_envio.y_calle}
  placeholder="Y calle"
  message="Y calle"
  type="text" />
  </div>
</div>









  <textarea   rows="4" cols="50" bind:value={cliente_selecto.direccion_envio.notas} placeholder="Notas"/> 
