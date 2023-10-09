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

.imagen_row_en_editar_pedidos{grid-area: imagen_perfil;
    overflow: hidden;
    border-radius: 65px;
    padding-bottom: 0px;
    text-align: center;
    box-shadow: 0px 0px 4px 0px #FFEB3B;
    height: 100px;
    width: 100px;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    border: 1px solid #FFEB3B;}


    .icono_promo{
    position: absolute;
    margin: -112px 0px 0px 22px;
    z-index: 2;
    font-size: 2.5em;
    color: #c7c7c7;
    }
    .icono_promo_fondo{
      position: absolute;
    margin: -104px 0px 0px 22px;
    z-index: 2;
    font-size: 4em;
    color: #ffffff;
    filter: blur(5px);
    }
</style>


 {#if item.galeria_imagenes != undefined && item.galeria_imagenes.length > 0}
    <!-- content here -->

    <div
      class="imagen_row_en_editar_pedidos"
      style="background-image:url({imagen ? imagen : ''})" />
       <!-- <i class="material-icons icono_promo_fondo vertical-alineado" title="Promoción ">new_releases</i> -->
       <i class="material-icons icono_promo vertical-alineado" title="Promoción ">new_releases</i>
  {/if}