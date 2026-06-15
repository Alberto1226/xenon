<script>
    import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
    import { onMount, createEventDispatcher } from "svelte";
    import { postData } from "../../../stores";

    export var IdPais;
    export var IdEstado;
    export var Pais;
    export var Estado;

    export var municipio;
    export var donde;
    export var actualizar;
    export var size;
    export let required = false;

    let lista = [];
    let listaSelect = [];
    var busqueda = "";

    const dispatch = createEventDispatcher();

    onMount(() => {
        if (Pais != "" && Estado != "") {
            ObtenerMunicipios(false);
        }
        ObtenerMunicipios(false);
    });

    $: if (IdEstado) {
        if (IdEstado != "") {
            // console.log("if Estado");
            ObtenerMunicipios(true);
        }
    }

    async function ObtenerMunicipios(control) {
        postData("app/clientes/Componentes/componentesData", {
            tipo: "minicipios",
            control: control,
            IdPais: IdPais,
            IdEstado: IdEstado,
            estado: Estado,
            pais: Pais,
        }).then((data) => {
            if (data.ok) {
                lista = data.municipios;
                listaSelect = lista;
                // console.log(data, data.mensaje);
            }
        });
    }

    function filtrar_nuevo_arreglo() {
        if (busqueda == "") {
            listaSelect = lista;
            return;
        }
        listaSelect = lista.filter((item) => {
            const normalizedItem = item.nombreMunicipio
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
            const normalizedBusqueda = busqueda
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
            return normalizedItem.includes(normalizedBusqueda);
        });
    }
</script>

<link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
    crossorigin="anonymous"
/>

<div class={size ? size : "col-md-3"}>
    <div class="form-floating">
        <select
            class="form-select"
            id="floatingSelectGrid"
            bind:value={municipio}
            disabled={!Estado}
            on:change={() => {
                actualizar = true;
                dispatch("municipio_cambio", {
                    id: event.target.value,
                    nombre: event.target.options[event.target.selectedIndex]
                        .text,
                });
            }}
            aria-label="Floating label select example"
            required={required}
        >
            {#if donde === "editar" && municipio}
                <option selected disabled value="">{municipio}</option>
            {:else}
                <option selected disabled value="">Seleccione</option>
            {/if}
            {#each listaSelect as item}
                <option value={item._id}>{item.nombreMunicipio}</option>
            {/each}
        </select>
        <label for="floatingSelectGrid">Municipio</label>
    </div>
    <div class="invalid-feedback">Por favor seleccione un país válido.</div>
</div>

<!-- <Menu origin="top left" style="width: 100%">
    <div slot="activator">
        <Button
            color={municipio == "" ? "red" : "primary"}
            raised
            ripple={false}
            style="padding-right: 4px;width:100%;"
            disabled={!activar}
        >
            <i class="material-icons vertical-alineado icono_peque">
                arrow_drop_down
            </i>

            <span
                >Municipio: {municipio == "" ? "pendiente..." : municipio}</span
            >
        </Button>
    </div>
    <input
        style="margin-left:20px;"
        id="input_1"
        type="text"
        bind:value={busqueda}
        on:keyup={filtrar_nuevo_arreglo}
    />
    <i class="material-icons vertical-alineado">search</i>
    <div class="scrollable">
        {#each listaSelect as item}

            <Menuitem
                on:click={() => {
                    municipio = item.nombreMunicipio;
                    actualizar = true;
                    dispatch("municipio_cambio", { id: item._id });
                }}
            >
                {item.nombreMunicipio}
            </Menuitem>
        {/each}
    </div>
</Menu> -->
