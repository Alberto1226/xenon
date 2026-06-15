<script>
    // import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
    import { onMount, createEventDispatcher } from "svelte";
    import { postData } from "../../../stores";

    const dispatch = createEventDispatcher();

    export let pais;
    export let donde;
    export var idPais;
    // export const activar;
    export var actualizar;
    export var size;
    export let required = false;

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
            const normalizedItem = item.nombre
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
            bind:value={idPais}
            on:change={() => {
                actualizar = true;
                dispatch("pais_cambio", {
                    id: event.target.value,
                    nombre: event.target.options[event.target.selectedIndex]
                        .text,
                });
            }}
            aria-label="Floating label select example"
            required={required}
        >
            <!-- {#if pais}
                {#each listaSelect as item}
                    {#if item.nombre === pais}
                        <option value={item._id} selected>{item.nombre}</option>
                    {:else}
                        <option value={item._id}>{item.nombre}</option>
                    {/if}
                {/each}
            {:else}
                {#each listaSelect as item}
                    <option value={item._id}>{item.nombre}</option>
                {/each}
            {/if} -->
            {#if donde === "editar" && pais}
                <option selected disabled value="">{pais}</option>
            {:else}
                <option selected disabled value="">Seleccione</option>
            {/if}
            {#each listaSelect as item}
                <option value={item._id}>{item.nombre}</option>
            {/each}
        </select>
        <label for="floatingSelectGrid">Pais</label>
    </div>
    <div class="invalid-feedback">Por favor seleccione un país válido.</div>
</div>
