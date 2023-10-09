<script>
    import {Button} from 'svelte-mui/src';
import {viendo_detalles_de_solicitud ,viendo_lista_solicitudes ,solicitud_selecta,borrar,recargar_lista} from './../store';
export var solicitud;   //  solicitud completa 




function guardar_y_cambiar() {
    guardar_como_selecta();
    cambiar_vista()
}

function guardar_como_selecta() {
    $solicitud_selecta = solicitud;
}
function cambiar_vista() {
    $viendo_detalles_de_solicitud = true;
    $viendo_lista_solicitudes = false;
}
</script>

<style>
    .margen-a-la-derecha{
        margin-left: auto;
        margin-right: 10px;
    }
</style>

<div class="margen_vert_auto margen-a-la-derecha">

<Button on:click={guardar_y_cambiar} title="Ver los detalles">
    <i class="material-icons vertical-alineado">
        arrow_forward
    </i>
</Button>
</div>