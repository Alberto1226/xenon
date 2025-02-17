<script>
    import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
    import { onMount, createEventDispatcher } from "svelte";
    import { postData } from "../../../stores";

    /*
    se debe refactorizar para poder usar la funcion filtrar_nuevo_arreglo
    ya que en alguinos estados tienen una gran cantidad de municipios
    y se necesita que el usuario busque por nombre la opcion a seleccionar
    */

    export var IdPais;
    export var Pais;

    export var estado;
    export var activar;
    export var actualizar;
    export var size;

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
                console.log(data, data.mensaje);
            }
        });
    }

    function filtrar_nuevo_arreglo() {
        if (busqueda == "") {
            listaSelect = lista;
            return;
        }
        listaSelect = lista.filter((item) => {
            const normalizedItem = item.nombreEstado
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
            disabled={!Pais}
            bind:value={estado}
            on:change={() => {
                actualizar = true;
                dispatch("estado_cambio", { id: event.target.value });
            }}
            aria-label="Floating label select example"
            required
        >
            <option selected disabled value="">Seleccione</option>
            {#each listaSelect as item}
                <option value={item._id}>{item.nombreEstado}</option>
            {/each}
        </select>
        <label for="floatingSelectGrid">Estado</label>
    </div>
    <div class="invalid-feedback">Por favor seleccione un país válido.</div>
</div>

<!-- 

<div class={size ? size : "col-md-3"}>
    <div class="form-floating">
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

                    <span>Estado: {estado == "" ? "pendiente..." : estado}</span
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
        <label for="floatingSelectGrid">Estado</label>
    </div>
    <div class="invalid-feedback">Por favor seleccione un estado válido.</div>
</div> -->
