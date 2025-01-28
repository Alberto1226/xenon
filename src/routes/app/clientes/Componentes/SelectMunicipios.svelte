<script>
    import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
    import { onMount, createEventDispatcher } from "svelte";
    import { postData } from "../../../stores";

    export var IdPais;
    export var IdEstado;
    export var Pais;
    export var Estado;

    export var municipio;
    export var activar;
    export var actualizar;

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

<Menu origin="top left" style="width: 100%">
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
            <!-- content here -->

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
</Menu>
