<script>
    import { Button } from "svelte-mui/src";
    import {
        viendo_detalles_de_solicitud,
        viendo_lista_solicitudes,
        solicitud_selecta,
        borrar,
        recargar_lista,
    } from "./../_lista/store";
    export var solicitud; //  solicitud completa
    import { onDestroy } from "svelte";

    var contador = 0;
    var contador_pasado = 0;
    var maximo_contador = 3;
    var texto_borrar = "";
    var http_ocupado = false;

    onDestroy(() => {
        contador = 0;
    });

    async function borrar_registro() {
        if (contador < maximo_contador - 1) {
            contador++;
            contador_pasado = contador;
            let diferencia = maximo_contador - contador;
            let posttext = diferencia > 1 ? " veces" : " vez";
            texto_borrar = "Confirma " + diferencia + posttext;

            return;
        }
        contador++;
        console.log("Borrando");
        if (http_ocupado == true) return;
        http_ocupado = true;
        console.log({mandando:$solicitud_selecta._id});
        const borrar_proceso = await borrar({cliente_a_borrar_id:$solicitud_selecta._id});
        console.log(borrar_proceso);
        if ((borrar_proceso.ok = false)) {
            alert("No se pudo borrar el registro");
        } else {

            $recargar_lista = true;
            setTimeout(()=>{
                $viendo_lista_solicitudes = true;
                $viendo_detalles_de_solicitud = false;
            },100)
            //$solicitud_selecta = null;
        }
        http_ocupado = false;
    }

    function guardar_y_cambiar() {
        guardar_como_selecta();
        cambiar_vista();
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
    .margen-a-la-derecha {
        margin-left: auto;
        margin-right: 10px;
    }
</style>

<div class="margen_vert_auto margen-a-la-derecha">

    <div class="width-auto-centrado-horizontal">
        <Button
            icon={contador == 0}
            color="red"
            raised
            on:click={borrar_registro}
            title="Ver los detalles">
            {#if contador < maximo_contador}{texto_borrar}{:else}Borrando...{/if}
            <i class="material-icons vertical-alineado"> delete_forever </i>
        </Button>
    </div>
</div>
