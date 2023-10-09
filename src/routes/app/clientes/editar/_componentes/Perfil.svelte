<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import {formato_precio,usuario_db} from './../../../../stores';
  export var perfil;
  


const perfiles_lista=[  
{mostrar:"Elite",perfil:"Elite"},
{mostrar:"Distribuidor",perfil:"Distribuidor"},
{mostrar:"Mayoreo",perfil:"Mayoreo"},
{mostrar:"Menudeo",perfil:"Menudeo"},
{mostrar: "Público en general",perfil:"Público en general"}
]
  var lista_visible=true
</script>

<style>
.scrollable{
  overflow-y: auto;
  height: 150px;
  width: 350px;
  
}
</style>


{#if $usuario_db.rol ==='gerente' || $usuario_db.rol ==='administrador'}
   <!-- content here -->
   <Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={perfil.perfil==""?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>
      <span>perfil : {perfil.perfil == '' ? 'pendiente...' : perfil.perfil}</span>

    </Button>
  </div>
  <div class="scrollable">
  {#each perfiles_lista as item}
    <!-- content here -->
    <Menuitem
      on:click={() => {
        perfil = item;
      }}>
      {item.mostrar}
    </Menuitem>
  {/each}
  </div>

  
</Menu>
{:else}
   {perfil.perfil}
{/if}



