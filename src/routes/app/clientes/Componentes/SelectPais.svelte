<script>
    import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
    import { onMount, createEventDispatcher } from "svelte";
    import { postData } from "../../../stores";

    const dispatch = createEventDispatcher();

    export var pais;
    export var activar;
    export var actualizar;

    let lista = [];
    let listaSelect = [];
    // let pais = "";
    var busqueda = "";

    onMount(() => {
        ObtenerPaises();
    });

    function ObtenerPaises() {
        postData("app/clientes/Componentes/componentesData", {
            tipo: "pais",
        }).then((data) => {
            if (data.ok) {
                lista = data.paises;
                listaSelect = lista;
                // console.log(data);
            }
        });
    }

    function filtrar_nuevo_arreglo() {
        if (busqueda == "") {
            listaSelect = lista;
            return;
        }
        listaSelect = lista.filter((item) => {
            const normalizedItem = item.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const normalizedBusqueda = busqueda.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            return normalizedItem.includes(normalizedBusqueda);
        });
    }
</script>

<Menu origin="top left" style="width: 100%">
    <div slot="activator">
        <Button
            color={pais == "" ? "red" : "primary"}
            raised
            ripple={false}
            style="padding-right: 4px;width:100%;"
            disabled={!activar}
        >
            <i class="material-icons vertical-alineado icono_peque">
                arrow_drop_down
            </i>

            <span>Pais: {pais == "" ? "pendiente..." : pais}</span
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
                    pais = item.nombre;
                    actualizar = true;
                    dispatch("pais_cambio", { id: item._id });
                }}
            >
                {item.nombre}
            </Menuitem>
        {/each}
    </div>
</Menu>
