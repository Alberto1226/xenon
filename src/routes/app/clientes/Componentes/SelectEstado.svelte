<script>
    import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
    import { onMount, createEventDispatcher } from "svelte";
    import { postData } from "../../../stores";

    export var IdPais;
    export var Pais;

    export var estado;
    export var activar;
    export var actualizar;

    let lista = [];
    let listaSelect = [];
    var busqueda = "";

    const dispatch = createEventDispatcher();

    onMount(() => {
        ObtenerEstados(false);
    });

    $: if (IdPais) {
        ObtenerEstados(true);
    }

    async function ObtenerEstados(control) {
        postData("app/clientes/Componentes/componentesData", {
            tipo: "estados",
            control: control,
            IdPais: IdPais,
            pais: Pais,
        }).then((data) => {
            if (data.ok) {
                lista = data.estados;
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
            const normalizedItem = item.nombreEstado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const normalizedBusqueda = busqueda.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            return normalizedItem.includes(normalizedBusqueda);
        });
    }
</script>

<Menu origin="top left" style="width: 100%">
    <div slot="activator">
        <Button
            color={estado == "" ? "red" : "primary"}
            raised
            ripple={false}
            style="padding-right: 4px;width:100%;"
            disabled={!activar}
        >
            <i class="material-icons vertical-alineado icono_peque">
                arrow_drop_down
            </i>

            <span>Estado: {estado == "" ? "pendiente..." : estado}</span>
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
                    estado = item.nombreEstado;
                    actualizar = true;
                    dispatch("estado_cambio", { id: item._id });
                }}
            >
                {item.nombreEstado}
            </Menuitem>
        {/each}
    </div>
</Menu>
