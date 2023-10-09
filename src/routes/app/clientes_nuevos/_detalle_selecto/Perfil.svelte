<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  export var perfil ={mostrar: "Público en general",perfil:"Público en general"};
  


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



<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={perfil.mostrar===""|| perfil.mostrar===undefined?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>
      <span>perfil : {perfil.mostrar===""|| perfil.mostrar===undefined ? 'pendiente...' : perfil.mostrar}</span>

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

