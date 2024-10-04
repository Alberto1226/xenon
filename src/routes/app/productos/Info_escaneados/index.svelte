<script>
    import { Textfield, Button } from "svelte-mui/src";
    import { fade, scale } from "svelte/transition";
    import { postData } from "./../../../stores";
    import No_se_encontraron_resultados from "./No_se_encontraron_resultados.svelte";
    import Cargador from "./Cargando.svelte";
    import Productos from "./Productos.svelte";
    import CarritoInfo from "./CarritoInfo.svelte";
    import Inyeccion from "./Inyeccion.svelte";
    import Salida from "./Salida.svelte";
    import Borrado_folio from "./Borrado_de_folios.svelte";
    import { onMount } from "svelte";
    onMount(() => {
        buscador_virgen = true;
    });

    var visible = false;
    var folio_a_buscar = "";
    var mostrar_no_se_encontraron_resultados = false;
    var buscando = false;
    var buscador_virgen = true; //  despues de la primer busqueda se convierte en false
    var inyeccion = {
        hay_registro: false,
        fecha: null,
        id: null,
        cantidad: null,
        inventario_antes: {
            existencias: 0,
            apartados: 0,
        },
        inventario_despues: {
            existencias: 0,
            apartados: 0,
        },
        folios: [],
    };

    var salida = {
        hay_registro: false,
        fecha: null,
        id: null,
        cantidad: null,
        inventario_antes: {
            existencias: 0,
            apartados: 0,
        },
        inventario_despues: {
            existencias: 0,
            apartados: 0,
        },
        folios: [],
    };

    var borrado_folio = {
        hay_registro: false,
        fecha: null,
        id: null,
        cantidad: null,
        inventario_antes: {
            existencias: 0,
            apartados: 0,
        },
        inventario_despues: {
            existencias: 0,
            apartados: 0,
        },
        folios: [],
    };
    var carrito = {
        hay_registro: false,
    };

    var lista_productos_relacion = [];

    function toggle() {
        visible = !visible;
    }
    function cerrar() {
        visible = false;
        folio_a_buscar = "";
    }
    async function buscar() {
        if (buscando == true) return;
        buscando = true;
        buscador_virgen = false;
        lista_productos_relacion = [];
        inyeccion.hay_registro = false;
        borrado_folio.hay_registro = false;
        salida.hay_registro = false;
        var resultado = await postData(
            // "app/productos/Info_escaneados/buscar_folio",
            "app/productos/Info_escaneados/Verificar_folios_pedidos",
            { folio_a_buscar },
        );
        console.log({ resultado });
        lista_productos_relacion = resultado.existe_en_la_bodega_resultado;

        if (resultado.existe_en_carrito_resultado) {
            carrito = resultado.existe_en_carrito_resultado;
            carrito.hay_registro = true;
            // console.log("Carrito", carrito);
        }

        if (resultado.existe_registro_de_inyeccion) {
            inyeccion = resultado.existe_registro_de_inyeccion;
            inyeccion.hay_registro = true;
        }
        if (resultado.existe_registro_de_salida) {
            salida = resultado.existe_registro_de_salida;
            salida.hay_registro = true;
        }
        if (resultado.existe_registro_de_borrado_de_folios) {
            borrado_folio = resultado.existe_registro_de_borrado_de_folios;
            borrado_folio.hay_registro = true;
        }

        //console.log(resultado);
        //console.log({ inyeccion });
        // console.log(resultado.existe_en_la_bodega_resultado);
        setTimeout(() => {
            buscando = false;
        }, 1000);
    }
    const handleKey = (evt) => {
        if (evt.key === "Enter") buscar();
        if (evt.key === "Escape") cerrar();
    };
</script>

<img src="imagenes/info_escaneados.svg" alt="" on:click={toggle} />

{#if visible == true}
    <div class="contenedor" in:fade={{ duration: 350 }}>
        <div class="boton-cerrar">
            <Button raised color="red" icons dense on:click={cerrar}>
                <i class="material-icons"> close </i>
            </Button>
        </div>
        <div
            class:buscador-de-folios-con-resultados={buscador_virgen == false}
            class:buscador-de-folios-sin-resultados={buscador_virgen == true}
        >
            {#if buscando == true}
                <Cargador />
            {:else}
                <div out:scale={{ duration: 250 }} in:scale={{ duration: 250 }}>
                    <input
                        spellcheck="false"
                        autofocus
                        class="buscador-input"
                        placeholder="Folio a buscar"
                        bind:value={folio_a_buscar}
                        on:keyup={handleKey}
                    />
                    {#if buscador_virgen == false}
                        <!-- <Productos bind:lista={lista_productos_relacion} /> -->
                        <!-- monstrare la info del carrito con el folio que se busco -->
                        {#if carrito.hay_registro}
                            <CarritoInfo
                                _id={carrito._id}
                                folio={carrito.folio}
                                nombre={carrito.cliente.nombre}
                                status={carrito.status}
                                galeria_imagenes={[]}
                            />
                        {/if}

                        <!-- <Inyeccion
                            id={inyeccion._id}
                            fecha={inyeccion.fecha}
                            producto={inyeccion.producto}
                            cantidad={inyeccion.cantidad}
                            inventario_antes={inyeccion.inventario_antes}
                            inventario_despues={inyeccion.inventario_despues}
                            folios={inyeccion.folios}
                            hay_registro={inyeccion.hay_registro}
                        /> -->
                        <Salida
                            id={salida._id}
                            fecha={salida.fecha}
                            producto={salida.producto}
                            pedido={salida.pedido}
                            cantidad={salida.cantidad}
                            inventario_antes={salida.inventario_antes}
                            inventario_despues={salida.inventario_despues}
                            folios={salida.folios}
                            hay_registro={salida.hay_registro}
                        />
                        <Borrado_folio
                            id={borrado_folio._id}
                            fecha={borrado_folio.fecha}
                            producto={borrado_folio.producto}
                            pedido={borrado_folio.pedido}
                            cantidad={borrado_folio.cantidad}
                            inventario_antes={borrado_folio.inventario_antes}
                            inventario_despues={borrado_folio.inventario_despues}
                            folios={borrado_folio.folios}
                            hay_registro={borrado_folio.hay_registro}
                        />
                    {/if}
                </div>
            {/if}
        </div>
        <div>
            {#if mostrar_no_se_encontraron_resultados}
                <No_se_encontraron_resultados />
            {/if}
        </div>
    </div>
{/if}

<style>
    .buscador-input {
        border-radius: 3em;
        background: white;
        font-size: 1em;
        width: 69vw;
        margin: auto;
    }

    .buscador-de-folios-con-resultados {
        transition: all 300ms ease-out;
        margin-top: 4vh;
        font-size: 3em;
    }
    .buscador-de-folios-sin-resultados {
        transition: all 300ms ease-out;
        margin-top: 40vh;
        font-size: 3em;
    }
    .boton-cerrar {
        position: absolute;
        top: 10px;
        right: 30px;
        cursor: pointer;
    }
    .id {
        font-size: 12px;
    }
    .contenedor {
        width: 100vw;
        height: 100vh;
        background: #565656;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index: 4;
    }
    img {
        cursor: pointer;
        height: 42px;
        filter: grayscale(1);
        transition: all 250 ease-out;
    }
    img:hover {
        filter: none;
    }
</style>
