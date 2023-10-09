<script>
export var item;
import {onMount} from 'svelte';
var imagen;

onMount(()=>{
    poner_imagen();
})
function poner_imagen() {
      if (!item || item.nombre == "ninguno") return;
    imagen = "imagenes/producto_generico.svg";
    if (item.galeria_imagenes.length > 0) {
      imagen = item.galeria_imagenes[0];
    }
}

</script>
<style>
.margin-left{
  margin-left: 9px;
}
</style>

 {#if item.galeria_imagenes != undefined && item.galeria_imagenes.length > 0}
    <!-- content here -->
    <div class="margin-left">
      <div
          class="imagen_row"
          style="background-image:url({imagen ? imagen : ''})" />
    </div>
    
  {/if}