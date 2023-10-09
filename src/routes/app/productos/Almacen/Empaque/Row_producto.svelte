<script>
    import { fly } from "svelte/transition";
    import { Button } from "svelte-mui/src";
    import Solicitar_borrar_folios from "./Solicitar_borrar_folios.svelte";
    import { pedido, acciones } from "./store";
    export var cantidad,
        producto,
        cantidad_agregada,
        folios,
        folio_buscado,
        indice,
        producto_encontrado;
    var visible = false;
    var solicitando_borrado_de_folios = false;
    var resultado_de_borrado = { ok: null };

    //      En caso de exito en la consulta

    var volver_a_consultar = false;
    var resultado_ok = null;
    var selectos = [];

    function agregar_a_selectos(folio) {
        if (selectos.includes(folio)) {
            selectos = selectos.filter((elem) => elem != folio);
        } else {
            selectos.push(folio);
            selectos = selectos;
        }
        console.log(selectos);
    }

    function borrar_folios_selectos() {
        solicitando_borrado_de_folios = true;
    }
    function borrado_exitoso() {
        for (let i = 0; i < $pedido.lista.length; i++) {
            const registro = $pedido.lista[i];
            if (!registro.folios) continue;
            registro.folios = registro.folios.filter(
                (elem) => !selectos.includes(elem)
            );
            if (i + 1 == $pedido.lista.length) {
                $pedido.lista = $pedido.lista;
                $pedido = $pedido;
            }
        }

        solicitando_borrado_de_folios = false;
        $acciones.push({
            accion: "borrar",
            folio: "",
            folios: selectos,
            realizado: true,
            fecha: new Date(),
        });
        $acciones = $acciones;
        selectos = [];
    }
</script>

<div
    class:producto_buscado={producto_encontrado
        ? producto_encontrado.nombre == producto.nombre
        : false}
>
    <div class="contenedor botttom">
        <div class="adorno-izquierda">
            <!-- comen -->
        </div>
        <div class="adorno-izquierda-indice">
            <!-- come -->
            {indice + 1})
        </div>
        <div class="cantidad_agregada no_select">
            {folios.length} /
        </div>
        <div class="cantidad no_select">
            {cantidad}

            {#if folios.length == cantidad}
                <div class="iconos" in:fly={{ duration: 150, y: 100 }}>
                    <i class="material-icons check_ok"> check </i>
                </div>
            {:else}
                <div class="iconos" in:fly={{ duration: 150, y: -100 }}>
                    <i class="material-icons rojo"> cancel </i>
                </div>
            {/if}
        </div>
        <div class="nombre no_select">
            <div>
                {producto.nombre}
            </div>
        </div>
        <div class="acciones">
            <div>
                <Button
                    title="ver folios"
                    on:click={() => (visible = !visible)}
                >
                    <i class="material-icons">visibility</i>
                </Button>
            </div>
            {#if selectos.length > 0}
                {#if solicitando_borrado_de_folios == false}
                    <div>
                        <Button
                            title="Borrar estos folios"
                            raised
                            color="red"
                            on:click={borrar_folios_selectos}
                        >
                            <i class="material-icons white">delete</i>
                        </Button>
                    </div>
                {:else}
                    <div class="centrado">Solicitando borrado...</div>
                {/if}
            {/if}
        </div>
    </div>

    {#if folios && visible == true}
        <div>
            <div class="contenedor-folios">
                <div class=" titulo-folios-selectos  no_select">
                    Folios selectos
                </div>
                {#if solicitando_borrado_de_folios == true}
                    <Solicitar_borrar_folios
                        url="app/productos/Almacen/Empaque/borrado_de_folios_de_pedido"
                        bind:resultado={resultado_de_borrado}
                        data={{
                            selectos,
                            carrito_id: $pedido._id,
                            producto_id: producto._id,
                        }}
                        bind:resultado_ok
                        mensaje_bueno_txt="Se ha completado el borrado"
                        mensaje_malo_txt="No se pudo eliminar los folios"
                        on:resultado_exitoso={borrado_exitoso}
                    />
                {:else}
                    <ul>
                        {#each folios as item, i}
                            <div
                                class:marcado-para-borrar={selectos.includes(
                                    item
                                )}
                                class="elemento no_select"
                                on:click={agregar_a_selectos(item)}
                            >
                                <div
                                    class="adorno-izquierda-indice-folio"
                                    class:adorno-izquierda-indice-folio-a-borrar={selectos.includes(
                                        item
                                    )}
                                    class:adorno-izquierda-indice-folio={!selectos.includes(
                                        item
                                    )}
                                >
                                    <span class="indice">
                                        {i + 1})
                                    </span>
                                </div>

                                <div>
                                    <span
                                        class:folio_buscado={folio_buscado ==
                                            item}>{item}</span
                                    >
                                </div>
                            </div>
                        {:else}
                            No se han agregado folios
                        {/each}
                    </ul>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .botttom {
        border-bottom: 1px solid #f3f3f3;
    }
    ul {
        margin: 0px;
    }
    .iconos {
        display: contents;
    }
    .acciones {
        display: flex;

        padding-top: 5px;
    }
    .marcado-para-borrar {
        background: rgb(146 146 146 / 66%);

        border: solid 1px white;
        color: red;
    }
    .marcado-para-borrar:hover {
        background: rgba(255, 0, 0, 0.377);
        border: solid 1px white;
        color: rgb(207, 0, 0);
        /* text-decoration: line-through; */
    }
    .titulo-folios-selectos {
        text-decoration: underline;
        font-weight: 400;
        color: white;
        background: #0065ff;
        font-size: 0.8em;
        padding-left: 54px;
    }
    .producto_buscado {
        border: 2px gray dashed;
    }
    .folio_buscado {
        color: #0065ff;
        font-weight: 900;
    }
    .elemento {
        align-items: center;
        background: #eaeaea;
        cursor: pointer;
        display: flex;
        border: solid 1px #eaeaea;
        padding: 10px;
        font-size: 19px;
    }
    .elemento:active {
        transform: translateY(2px);
    }
    .elemento:hover {
        background: rgba(128, 128, 128, 0.26);
        border: solid 1px rgba(128, 128, 128, 0.26);
    }
    .indice {
        color: white;
        font-size: 0.7em;
        padding-right: 10px;
    }
    .contenedor {
        display: flex;
        /* border-bottom: 1px solid rgba(128, 128, 128, 0.288); */
    }
    .cantidad {
        font-size: 1.2em;
        padding: 10px;
        margin-right: 10px;
    }
    .cantidad_agregada {
        font-size: 1.2em;
        padding: 10px;
    }
    .nombre {
        width: 20%;
        font-size: 1.2em;
        padding: 10px;
    }
    .check_ok {
        color: green;
        vertical-align: middle;
    }
    .rojo {
        color: red;
        vertical-align: middle;
    }
    .contenedor-folios {
        border: 1px #7cb0ff solid;
        padding: 0px 0px 2px 0px;
        background: #eaeaea;
        margin-right: 11px;
        border-top: 1px solid #7cb0ff;
    }
    .adorno-izquierda {
        width: 10px;
        background: #0065ff;
        margin-right: 2px;
    }

    .adorno-izquierda-indice {
        padding-left: 2px;
        width: 30px;
        color: rgba(255, 255, 255, 0.774);
        background: #0066ff83;
        display: grid;
        align-content: center;
    }
    .adorno-izquierda-indice-folio {
        width: 30px;
        color: rgba(255, 255, 255, 0.774);
        background: #0066ff83;
        display: grid;
        align-content: center;
        margin-right: 2px;
        padding: 1px;
        border-radius: 21px;
        padding-left: 8px;
        border: 1px solid aliceblue;
    }
    .adorno-izquierda-indice-folio-a-borrar {
        width: 30px;
        color: rgba(255, 255, 255, 0.774);
        background: #ff000083;
        display: grid;
        align-content: center;
        margin-right: 2px;
        padding: 1px;
        border-radius: 21px;
        padding-left: 8px;
        border: 1px solid aliceblue;
    }
</style>
