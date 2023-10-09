<script>
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { Button } from "svelte-mui/src";

    import Solicitar_inyeccion from "./Solicitar_inyeccion.svelte";
    import { convertir_a_fecha_humana } from "./../../../stores";
    var mostrando_detalles = false;
    export var createdAt = String;
    export var lista = [];
    export var procesado = {
        estado_actual: String,
        iniciado: Boolean,
        terminado: Boolean,
    };
    export var producto = {
        id: String,
        imagen: String,
        nombre: String,
    };
    export var _id;
    export var updatedAt = "";
    export var usuario = {
        id: String,
        nombre: String,
    };
    var createdAt_date;
    var total = 0;
    var aceptando_inyeccion = false;
    var solo_agregar_folios = false;

    onMount(() => {
        createdAt_date = new Date(createdAt);
        total = sumar_folios();
    });

    function aceptar_inyeccion() {
        aceptando_inyeccion = true;
    }

    function aceptar_inyeccion_solo_folios() {
        solo_agregar_folios = true;
        aceptando_inyeccion = true;
    }

    function sumar_folios() {
        var contador = 0;
        lista.map((elem) => {
            contador += elem.lista.length;
            return elem;
        });
        console.log(contador);
        return contador;
    }
</script>

{#if aceptando_inyeccion}
    <Solicitar_inyeccion on:cerrar {solo_agregar_folios} inyeccion_id={_id} />
{/if}
<div
    class="contenedor pointer"
    on:click={() => {
        mostrando_detalles = true;
    }}
>
    <div class="producto nombre text">
        <img class="imagen_row pointer" src={producto.imagen} alt="" />
        {producto.nombre}
    </div>
    <div class="usuario gris">
        {usuario.nombre}
    </div>
    <div class="fecha text">
        {convertir_a_fecha_humana(createdAt_date)}
    </div>

    <div class="total">
        {total}
    </div>
    <div class="tools">
        <Button
            title="Solo aceptar los folios sin afectar inventario"
            raised
            style="margin-bottom: 10px;"
            color="#1976d29e"
            on:click={aceptar_inyeccion_solo_folios}
        >
            Solo folios
        </Button>

        <Button raised color="primary" on:click={aceptar_inyeccion}>
            Aceptar
        </Button>
    </div>
</div>

{#if mostrando_detalles == true}
    <div class="">
        <div
            class=" detalles no-select"
            in:fly={{ duration: 150, y: -10 }}
            on:click={() => {
                mostrando_detalles = false;
            }}
        >
            {#each lista as item, i}
                <div class="masterbox">
                    <div class="producto nombre text">
                        <img
                            class="imagen_row pointer"
                            src={producto.imagen}
                            alt=""
                        />
                        {producto.nombre}
                    </div>
                    <div class="usuario gris">
                        {usuario.nombre}
                    </div>
                    <div class="fecha text">
                        {convertir_a_fecha_humana(createdAt_date)}
                    </div>

                    <div class="total">
                        {total}
                    </div>
                    Master-box {i + 1} :
                    {#each item.lista as item, ii}
                        <div class="row">
                            <span class="morado">
                                {ii + 1}.-
                            </span>
                            {item}
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .masterbox {
        margin: 10px;
    }
    .row {
        padding: 5px;
        display: flex;
        color: #4a6673;
    }
    .morado {
        color: #40f;
        font-size: smaller;
    }
    .detalles {
        position: absolute;
        z-index: 2;
        top: 91px;
        left: 20vw;
        width: 50vw;
        height: 50vw;
        overflow-y: auto;

        transform: translate(6px, -30px) rotate3d(1, 1, 1, 1deg);
        box-shadow: 0 0 55px 7px black;
        padding: 20px;
        background: white;
    }
    .no-select {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .contenedor {
        padding: 5px;
        margin: 16px;
        font-size: 15px;
        background: white;
        width: 180px;
        height: 260px;
        position: relative;
        border: 1px solid rgb(0 0 0 / 7%);
        transition: all ease-out 50ms;
        overflow: hidden;
    }
    .contenedor:hover {
        box-shadow: 0 0 17px #222d324f;
    }
    .total {
        font-size: 2em;
        text-align: center;
        margin-top: 10px;
    }
    .text {
        color: #4a6673;
    }
    .nombre {
        font-size: 1.1em;
        font-weight: 800;
    }
    .gris {
        color: gray;
    }

    .relativo {
        position: relative;
    }
</style>
