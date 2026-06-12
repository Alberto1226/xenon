<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import {formato_precio,usuario_db} from './../../../../stores';
  export var perfil;
  
  const perfiles_lista = [];
  for (let i = 0; i <= 50; i += 5) {
    perfiles_lista.push({ mostrar: `${i}%`, perfil: "Mayoreo", porcentaje: i });
  }
  for (let i = 51; i <= 60; i++) {
    perfiles_lista.push({ mostrar: `${i}%`, perfil: "Mayoreo", porcentaje: i });
  }
  var lista_visible = true;
</script>

<style>
.scrollable{
  overflow-y: auto;
  height: 150px;
  width: 350px;
}
</style>

{#if $usuario_db.rol ==='gerente' || $usuario_db.rol ==='administrador'}
   <Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button color={perfil.porcentaje === undefined ? "red" : "primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>
      <span>descuento : {perfil.mostrar || (perfil.porcentaje !== undefined ? perfil.porcentaje + '%' : (perfil.perfil == '' ? 'pendiente...' : perfil.perfil))}</span>
    </Button>
  </div>
  <div class="scrollable">
  {#each perfiles_lista as item}
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
   {perfil.mostrar || (perfil.porcentaje !== undefined ? perfil.porcentaje + '%' : perfil.perfil)}
{/if}
