<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { Button } from "svelte-mui/src";

    import { postData, mensaje_bueno, mensaje_error } from "./../../../stores";
    const dispatch = createEventDispatcher();
    export var lista = [];
    export var visible = false;
    export var solo_agregar_folios = false;
    export var inyeccion_id = "";

    var ocupado = false;
    var estado_actual = "conectado";
    var resultado_fue_exitoso = true;

    onMount(() => {
        subir();
    });

    function reintentar() {
        ocupado = false;
        estado_actual = "conectado";
        resultado_fue_exitoso = true;
        subir();
    }

    async function subir(params) {
        console.log("Subiendo ***********");
        try {
            if (ocupado == true) return;
            ocupado = true;

            let resultado = await postData(
                "app/productos/inyectar_un_pendiente",
                { inyeccion_id, solo_agregar_folios }
            );
            estado_actual = "mandando datos";
            ocupado = false;
            estado_actual = "terminado";
            if (resultado.ok == true) {
                mensaje_bueno(
                    "Los folios se han introducido de forma correcta al inventario"
                );
                resultado_fue_exitoso = true;
            } else {
                resultado_fue_exitoso = false;
                mensaje_error(
                    resultado.mensaje
                        ? resultado.mensaje
                        : "Ha ocurrido un error al ingrear los folios"
                );
            }
        } catch (err) {
            console.log(err);
            mensaje_error("Ha ocurrido un error al ingresar los folios");
        }
    }
</script>

<div class="contenedor">
    {#if estado_actual == "conectado"}
        <h1 class="centrado">Conectando con servidor</h1>
    {:else if estado_actual == "mandando datos"}
        <h1 class="centrado">Subiendo info</h1>
    {:else if estado_actual == "terminado"}
        {#if resultado_fue_exitoso == true}
            <h1 class="centrado">Éxito aceptando inyección de folios</h1>
            {#if solo_agregar_folios == true}
                Nota: Solo se agregaron los folios, no se afectó al inventario.
            {/if}
            <h3 class="centrado">ya puedes continuar con otras acciones</h3>
            <div class="centrado">
                <Button
                    raised
                    color="primary"
                    on:click={() => dispatch("cerrar")}
                >
                    Cerrar
                </Button>
            </div>
        {:else}
            <h1 class="centrado ">
                se ha detectado un error, presiona F12 para ver los detalles
            </h1>
            <div class="centrado">
                <Button raised color="primary" on:click={reintentar}>
                    reintentar
                </Button>
            </div>
        {/if}
    {/if}
</div>

<style>
    .contenedor {
        position: absolute;
        z-index: 8;
        background: white;
        width: 100vw;
        top: 0px;
        height: 100vh;
        left: 0px;
    }
</style>
