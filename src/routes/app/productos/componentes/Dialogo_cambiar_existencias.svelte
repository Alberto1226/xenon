<script>
    //      este componente le pertenece a row
    export var cantidad_existente;
    export var cantidad_a_ingresar = 1;
    export var visible = false;
    export var producto;
    import Foliado from "./Folios_independientes_entrada.svelte";
    import { Dialog, Textfield, Button } from "svelte-mui/src";
    import { createEventDispatcher, onMount } from "svelte";
    import { mensaje_bueno, mensaje_error } from "./../../../stores";
    var tipo_de_accion = "nuevo_ingreso";
    const dispatch = createEventDispatcher();
    var originales;
    var lista = []; // lista de folios ,solo se usa en inyeccion en donde se empleo esta prop
    var usar_folio_como_ingreso = false;
    var cantidad_total_de_folios;
    var ocupado = false;

    onMount(() => {
        cantidad_a_ingresar = "";
    });

    $: if (visible == false) {
        lista = [];
        ocupado = false;
        //cantidad_total_de_folios = 1;
    }
    $: if (visible == true) {
        ocupado = false;
        cantidad_a_ingresar = "";
    }

    function emitir_sobreescribir_existencias_producto() {
        //console.log("sobreescribir existencias");
        dispatch("sobreescribir_existencias_producto", { cantidad_existente });
    }

    function emitir_ingresar_existencias_producto() {
        //console.log("nuevos ingresos de producto ---");
        dispatch("nuevos_ingresos_producto", {
            cantidad_a_ingresar,
            folios: lista,
        });
        //console.log("-------------->>>");
    }

    function toggle_tipo_de_accion() {
        if (tipo_de_accion == "sobreescribir") {
            tipo_de_accion = "nuevo_ingreso";
        } else {
            tipo_de_accion = "sobreescribir";
        }
    }

    function validar() {
        if (ocupado == true) {
            return;
        }
        ocupado = true;
        var todo_bien = valido();

        // console.log(todo_bien);

        if (todo_bien == true) {
            if (tipo_de_accion == "sobreescribir") {
                emitir_sobreescribir_existencias_producto();
            } else {
                emitir_ingresar_existencias_producto();
            }
        }
    }

    function valido() {
        if (tipo_de_accion == "nuevo_ingreso") {
            if (isNaN(cantidad_a_ingresar) == true) return false;
            if (cantidad_a_ingresar <= 0) return false;
            return true;
        }

        //      sobreescribir
        if (tipo_de_accion == "sobreescribir") {
            if (isNaN(cantidad_existente) == true) return false;
            if (cantidad_a_ingresar < 0) return false;
            return true;
        }
    }

    function cambio_cantidad(evt) {
        console.log(evt);
        cantidad_a_ingresar = evt.detail.cantidad;
    }

    function handle_key(evt) {
        if (evt.key == "Enter") {
            validar();
        }
    }
</script>

<Dialog width="450" bind:visible>
    <div class="centrado">
        <Button
            raised={tipo_de_accion == "nuevo_ingreso"}
            disabled={tipo_de_accion == "nuevo_ingreso"}
            on:click={toggle_tipo_de_accion}
            dense
        >
            Nuevo ingreso
        </Button>

        <Button
            raised={tipo_de_accion == "sobreescribir"}
            disabled={tipo_de_accion == "sobreescribir"}
            on:click={toggle_tipo_de_accion}
            dense
        >
            Sobreescribir
        </Button>
    </div>
    <div class="contenedor_interno">
        {#if tipo_de_accion == "sobreescribir"}
            <div class="centrado titulo">Sobre-escribir existencias</div>
            <div class="centrado">
                actual :
                <b>{producto.existencia.actual}</b>
                <span
                    class="cambio"
                    title="La cantidad que ingresaste se va a sobreescribir."
                >
                    <i class="material-icons vertical-alineado">arrow_forward</i
                    >
                    final: {cantidad_existente}
                </span>

                <br />
                <div class="primer-opcion">
                    <span class="inciso"
                        >Sobre-escribir existencias (no afecta folios)</span
                    >
                    <div class="display-flex ">
                        <Textfield
                            label="Existencias"
                            bind:value={cantidad_existente}
                            on:keyup={handle_key}
                            type="number"
                            min="0"
                            step="1"
                        />
                        {#if ocupado == true}
                            Guardando
                        {:else}
                            <Button
                                color="primary"
                                raised
                                title="Sobre-escribir existencias de producto"
                                on:click={validar}
                            >
                                <i class="material-icons">save</i> Guardar
                            </Button>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <div class="centrado titulo">Ingresar</div>
            <div class="centrado">
                actual :
                <b>{producto.existencia.actual}</b>
                <span
                    class="cambio"
                    title="La cantidad que ingresaste se va a sumar"
                >
                    <i class="material-icons  vertical-alineado"
                        >arrow_forward</i
                    >
                </span>
                {producto.existencia.actual}+
                <span
                    class="cambio"
                    title="La cantidad que ingresaste se va a sumar"
                >
                    ({cantidad_a_ingresar})
                </span>
                =

                <span
                    class="cambio"
                    title="La cantidad que ingresaste se va a sumar"
                >
                    {Number(producto.existencia.actual) +
                        Number(cantidad_a_ingresar)}
                </span>
                <br />

                {#if lista.length == 0}
                    <div class="primer-opcion">
                        <span class="inciso">A) Ingresar sin folio</span>
                        <div class="">
                            <Textfield
                                label="Nuevo ingreso"
                                placeholder="Nuevo ingreso"
                                bind:value={cantidad_a_ingresar}
                                on:keyup={handle_key}
                                type="number"
                                min="1"
                                step="1"
                            />

                            {#if cantidad_a_ingresar > 0 && ocupado == false}
                                <Button
                                    color="primary"
                                    raised
                                    title="Ingresar nuevas existencias de producto"
                                    style="margin-top: 14px;"
                                    on:click={validar}
                                >
                                    <i class="material-icons">add_circle</i>
                                    Ingresar
                                </Button>
                            {:else if ocupado == true}
                                Guardando...
                            {/if}
                        </div>
                    </div>
                {/if}

                <div>
                    <Foliado
                        bind:cantidad_total_de_folios
                        bind:lista
                        bind:cantidad_a_ingresar
                        on:cambio_cantidad={cambio_cantidad}
                        on:ingresar={validar}
                        bind:usar_folio_como_ingreso
                    />
                </div>
            </div>
        {/if}
    </div>

    <div slot="actions" class="actions center" />
</Dialog>

<style>
    .inciso {
        /* position: absolute; */
        color: #1976d2;
        transform: translate(-29px, -6px);
        font-weight: 900;
    }
    .primer-opcion {
        position: relative;
        padding: 10px;
        border: 1px solid black;
        border-radius: 4px;
        margin-bottom: 10px;
    }
    .contenedor_interno {
        margin: 0px 50px;
    }
    .titulo {
        margin-top: 32px;
        font-size: 32px;
        margin-bottom: 16px;
    }
    .cambio {
        color: #1976d2;
        font-weight: 800;
    }
</style>
