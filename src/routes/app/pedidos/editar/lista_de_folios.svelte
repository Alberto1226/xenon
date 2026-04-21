<script>
    import { fly, scale, fade } from "svelte/transition";
    export var visible;
    export var folios;
    export var producto;
    export var id_registro;
    export var id_carrito;
    export var cantidad;
    export var cantidad_total;
    export var cantidad_selecta = 0;
    export var selectos = [];

    export var ProdIndividual = false;
    export var BoxProd = false;
    export var InserFolio = "";
    export var foliosMaster = [];
    export var desactivar = false;
    export var CantidadArreglo = 10;

    export var foliosRepetidos = [];

    var buscando = "";
    var actualizado = false;
    var lista_filtrada = [];
    var filtrar_selectos = false;
    var guardando_folios = false;
    var modoUnSoloTipo = false;
    var codigoProductoBase = "";

    import { usuario_db, mensajes_app, postData } from "./../../../stores";
    import { Button } from "svelte-mui/src";
    import { createEventDispatcher, onMount } from "svelte";
    import { each } from "svelte/internal";

    const dispatch = createEventDispatcher();

    onMount(() => {});
    $: if (visible == true) {
        // console.log({ selectos });
        seleccionar_las_que_ya_estaban_selectas();
    }
    $: codigoProductoBase = normalizarCodigoProducto(
        producto && producto.codigo ? producto.codigo : "",
    );

    function cambiar_folios() {
        if (foliosMaster.length > cantidad) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "La cantidad de folios es mayor a la cantidad de productos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        if (foliosMaster.length === 0) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "No hay folios en la lista",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        if (foliosMaster.length < cantidad) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "La cantidad de folios es menor a la cantidad de productos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        if (guardando_folios == true) return;
        guardando_folios = true;
        // var folios_puros = selectos.map((elem) => elem.folio);
        let registro = {
            id_registro,
            producto_id: producto._id,
            cantidad,
            folios: foliosMaster,
            modo_un_solo_tipo: modoUnSoloTipo,
            codigo_producto_base: codigoProductoBase,
        };
        //console.log(registro);
        postData("/app/pedidos/editar/cambiar_lista_de_folios_Master", {
            registro,
            id_carrito,
        })
            .then((respuesta) => {
                guardando_folios = false;
                // console.log(respuesta);
                if (respuesta.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Folios actualizados",
                    });
                    $mensajes_app = $mensajes_app;
                    actualizado = true;
                    setTimeout(() => {
                        actualizado = false;

                        dispatch("se_actualizaron_folios");
                    }, 5500);
                }
                if (!respuesta.ok) {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: respuesta.error,
                    });
                    foliosRepetidos = respuesta.foliosRepetidos;
                }
            })
            .catch((err) => {
                console.log(err);
                guardando_folios = false;
                $mensajes_app.push({
                    tipo: "error",
                    mensaje:
                        "los Folios no se pudieron actualizar , intenta mas tarde",
                });
                $mensajes_app = $mensajes_app;
            });
    }

    async function seleccionar_las_que_ya_estaban_selectas() {
        for (let i = 0; i < selectos.length; i++) {
            const element = selectos[i];
            let encontrar_folio = folios.find(
                (elem) => elem.folio == element.folio,
            );
            if (encontrar_folio) {
                encontrar_folio.selecto = true;
            }
            if (i + 1 == selectos.length) {
                folios = folios;
                // console.log({ folios });
            }
        }
    }

    function cerrar(params) {
        foliosMaster = [];
        modoUnSoloTipo = false;
        InserFolio = "";
        visible = false;
        DesactivarInput();
        // dispatch("actualizar_folios");
    }

    async function seleccionar_uno(folio_a_agregar) {
        var registro = folios.find(
            (elem) => elem.folio == folio_a_agregar.folio,
        );
        let cantidad_selectos;
        // console.log({ registro });
        // console.log({ folio_a_agregar });
        if (registro.selecto == false) {
            cantidad_selectos = await cuantos_selectos();

            if (cantidad_total > cantidad_selectos) {
                registro.selecto = true;
            }
        } else {
            registro.selecto = false;
        }
        cuantos_selectos();
        // console.log({ cantidad_total });
        // console.log({ cantidad_selectos });
        let tmpfolios = folios;

        folios = tmpfolios;
    }

    function cuantos_selectos() {
        selectos = folios.filter((elem) => elem.selecto == true);
        let cantidad_selecta = 0;
        if (selectos == undefined || selectos == null) {
            cantidad_selecta = 0;
        } else {
            cantidad_selecta = selectos.length;
        }

        return cantidad_selecta;
    }

    function filtra_con_texto() {
        let buscando_upper = buscando.toUpperCase();

        lista_filtrada = folios.filter(
            (elem) => elem.folio.toUpperCase().indexOf(buscando_upper) > -1,
        );
        // console.log(lista_filtrada.length);
    }

    function normalizarFolio(dato) {
        return (dato || "").toUpperCase().replace(/\s+/g, "");
    }

    function normalizarCodigoProducto(dato) {
        return (dato || "").toUpperCase().replace(/[\s-]+/g, "");
    }

    function folioCoincideConCodigoProducto(folio) {
        if (!codigoProductoBase) {
            return false;
        }

        const folioNormalizadoParaComparar = normalizarCodigoProducto(folio);
        return folioNormalizadoParaComparar.startsWith(codigoProductoBase);
    }

    function obtenerCodigoDetectadoEnFolio(folio) {
        const folioComparable = normalizarCodigoProducto(folio);
        if (!codigoProductoBase) {
            return folioComparable;
        }
        return folioComparable.slice(0, codigoProductoBase.length);
    }

    function toggleModoUnSoloTipo() {
        modoUnSoloTipo = !modoUnSoloTipo;
        InserFolio = "";

        if (modoUnSoloTipo) {
            if (!codigoProductoBase) {
                modoUnSoloTipo = false;
                $mensajes_app.push({
                    tipo: "error",
                    mensaje:
                        "No se pudo determinar el código base del producto",
                });
                $mensajes_app = $mensajes_app;
                return;
            }
            ProdIndividual = true;
            BoxProd = false;
            return;
        }
    }

    function AgregarFolio(dato) {
        let dato2 = normalizarFolio(dato);
        if (dato2.length === 0) {
            return;
        }
        if (!foliosMaster.includes(dato2)) {
            foliosMaster = [...foliosMaster, dato2];
            // console.log("Arreglo de folios actualizado:", foliosMaster);
        } else {
            // console.log("El folio ya existe en la lista");
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "El folio ya existe en la lista, por favor ingresa otro",
            });
            $mensajes_app = $mensajes_app;
        }
    }

    function agregarFolioMismoTipo(dato) {
        let dato2 = normalizarFolio(dato);

        if (dato2.length === 0) {
            return;
        }

        if (foliosMaster.length >= cantidad) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "Ya se registró la cantidad exacta de folios",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        if (checar_que_sea_unico(dato2)) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "El folio ya existe en la lista, por favor escanea otro",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        if (!folioCoincideConCodigoProducto(dato2)) {
            const codigoDetectado = obtenerCodigoDetectadoEnFolio(dato2);
            $mensajes_app.push({
                tipo: "error",
                mensaje: `El folio no coincide con el código base. Detectado: ${codigoDetectado || "(vacío)"} | Esperado: ${codigoProductoBase}`,
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        if (foliosMaster.length === 0) {
            foliosMaster = [...foliosMaster, dato2];
            DesactivarInput();
            return;
        }

        foliosMaster = [...foliosMaster, dato2];
        DesactivarInput();
    }

    function GenerarFolios(dato) {
        let dato2 = normalizarFolio(dato);
        let codigoBase = codigoProductoBase;

        if (dato2.length === 0) {
            return;
        }

        if (!codigoBase) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "No se pudo determinar el código del producto para generar folios",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        if (!normalizarCodigoProducto(dato2).includes(codigoBase)) {
            let codigoDetectado = obtenerCodigoDetectadoEnFolio(dato2);
            $mensajes_app.push({
                tipo: "error",
                mensaje: `El folio no coincide con el código base. Detectado: ${codigoDetectado || "(vacío)"} | Esperado: ${codigoBase}`,
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        let resultado_ya_existia = checar_que_sea_unico(dato2);
        if (resultado_ya_existia) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "El folio ya existe en la lista, por favor ingresa otro",
            });
            return;
        }

        let folioComparable = normalizarCodigoProducto(dato2);
        let indiceInicioSobrante =
            folioComparable.indexOf(codigoBase) + codigoBase.length;
        let parteSecuencialStr = folioComparable.slice(indiceInicioSobrante);
        let matchNumero = parteSecuencialStr.match(/(\d+)$/);

        if (!matchNumero) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "No se detectó un número secuencial al final del folio.",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        let numeroBaseStr = matchNumero[0];
        let prefijoIntermedio = parteSecuencialStr.slice(
            0,
            -numeroBaseStr.length,
        );
        let numeroBase = parseInt(numeroBaseStr, 10);
        let padding = numeroBaseStr.length;
        let lista = [];
        let espaciosDisponibles = cantidad - foliosMaster.length;
        let totalAGenerar = Math.min(Number(CantidadArreglo), espaciosDisponibles);

        if (totalAGenerar <= 0) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "Ya no hay espacio para generar más folios",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        for (let i = 0; i < totalAGenerar; i++) {
            let nuevoNumero = (numeroBase + i).toString().padStart(padding, "0");
            let nuevoFolio = `${codigoBase}${prefijoIntermedio}${nuevoNumero}`;

            if (!foliosMaster.includes(nuevoFolio)) {
                lista.push(nuevoFolio);
            }
        }

        // Agregar los folios generados al arreglo maestro, si no existen
        for (let index = 0; index < lista.length; index++) {
            const element = lista[index];
            if (!foliosMaster.includes(element)) {
                foliosMaster = [...foliosMaster, element];
            }
        }

        if (lista.length === 0) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "No se generaron folios nuevos porque todos ya existían en la lista",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        // console.log("Lista generada:", foliosMaster);
    }

    function checar_que_sea_unico(folio) {
        var encontrado = foliosMaster.find((elem) => elem === folio);
        return encontrado;
    }

    function quitarFolio(folio) {
        //teniendo en cuenta que los folios deben de ser unicos esta funcion quitara todos los folios que coincidan
        foliosMaster = foliosMaster.filter((elem) => elem != folio);
        DesactivarInput();
    }

    function DesactivarInput() {
        desactivar = foliosMaster.length >= cantidad;
    }

    function SoloActivo(donde) {
        if (donde == "ProdIndividual") {
            ProdIndividual = true;
            BoxProd = false;
        }
        if (donde == "BoxProd") {
            if (modoUnSoloTipo) {
                modoUnSoloTipo = false;
            }
            ProdIndividual = false;
            BoxProd = true;
        }
    }

    function procesarCapturaIndividual() {
        if (modoUnSoloTipo) {
            agregarFolioMismoTipo(InserFolio);
        } else {
            AgregarFolio(InserFolio);
            DesactivarInput();
        }

        InserFolio = "";
    }
</script>

{#if visible == true}
    <div
        class="contenedor"
        in:scale={{ duration: 200 }}
        out:scale={{ duration: 100 }}
    >
        <div
            class="relativo"
            in:fly={{ x: 400, duration: 200 }}
            out:fade={{ duration: 100 }}
        >
            <div class="encabezado-modal">
                <div class="titulo-modal">
                    <div class="titulo-principal">Asignar folios</div>
                    <div class="titulo-secundario">
                        Captura exacta para {cantidad} unidades
                    </div>
                </div>
                <div class="acciones-header">
                    {#if actualizado == true}
                        <div class="guardando estado-ok">
                            Actualizado
                            <i class="material-icons check-color">check</i>
                        </div>
                    {/if}
                    {#if guardando_folios == false}
                        <Button
                            color="#2b78fe"
                            raised
                            dense
                            on:click={cambiar_folios}
                        >
                            <i class="material-icons">save</i> Guardar
                        </Button>
                    {:else}
                        <div class="estado-guardando">Guardando...</div>
                    {/if}
                    <Button raised icon dense on:click={cerrar}>
                        <i class="material-icons">close</i>
                    </Button>
                </div>
            </div>

            <div class="resumen-grid">
                <div class="resumen-card">
                    <span class="resumen-label">Cantidad total</span>
                    <b>{cantidad}</b>
                </div>
                <div class="resumen-card">
                    <span class="resumen-label">Folios capturados</span>
                    <b>{foliosMaster.length}</b>
                </div>
            </div>

            <div class="modo-secuencial-wrap">
                <div class="switch-linea">
                    <button
                        class="switch-secuencial"
                        class:activo={modoUnSoloTipo}
                        on:click={toggleModoUnSoloTipo}
                        type="button"
                    >
                        <i class="material-icons"
                            >{modoUnSoloTipo ? "toggle_on" : "toggle_off"}</i
                        >
                        Un solo tipo de folio
                    </button>
                    {#if (modoUnSoloTipo || BoxProd) && codigoProductoBase}
                        <div class="tipo-base-pill">
                            Base: <b>{codigoProductoBase}</b>
                        </div>
                    {/if}
                </div>
                {#if modoUnSoloTipo}
                    <div class="ayuda-secuencial">
                            {#if foliosMaster.length === 0}
                                Escanea folios del producto. Se validan contra el
                                código base del producto.
                        {:else if desactivar}
                            Se completó la captura del mismo tipo de folio.
                        {/if}
                    </div>
                {/if}
            </div>

            <div class="botones">
                <button
                    class="BtnFolio"
                    class:activo={ProdIndividual}
                    color="#2b78fe"
                    on:click={() => {
                        SoloActivo("ProdIndividual");
                    }}
                >
                    <i class="material-icons">shopping_basket</i>
                    <span>Individual</span>
                </button>
                <button
                    class="BtnFolio"
                    class:activo={BoxProd}
                    on:click={() => {
                        SoloActivo("BoxProd");
                    }}
                    disabled={modoUnSoloTipo}
                >
                    <i class="material-icons">shopping_bag</i>
                    <span>Por caja</span>
                </button>
            </div>

            <div class="captura-panel">

                {#if ProdIndividual}
                    <div class="ProdIndividual">
                        <input
                            class="InputFolios"
                            placeholder="Escanear o escribir folio"
                            bind:value={InserFolio}
                            type="text"
                            disabled={desactivar}
                            on:keyup={(event) => {
                                if (event.key === "Enter") {
                                    procesarCapturaIndividual();
                                }
                            }}
                        />
                    </div>
                {/if}

                {#if BoxProd}
                    <div class="BoxProd">
                        <input
                            class="InputFolios input-cantidad"
                            placeholder="Cantidad"
                            bind:value={CantidadArreglo}
                            type="number"
                            disabled={desactivar}
                        />
                        <input
                            class="InputFolios"
                            placeholder="Folio base"
                            bind:value={InserFolio}
                            type="text"
                            disabled={desactivar}
                            on:keyup={(event) => {
                                if (event.key === "Enter") {
                                    GenerarFolios(InserFolio);
                                    InserFolio = "";
                                    DesactivarInput();
                                }
                            }}
                        />
                    </div>
                {/if}
            </div>

            {#if foliosMaster.length > 0}
                <div class="lista">
                    {#each foliosMaster as item, i}
                        <div
                            class="item"
                            class:repetido={foliosRepetidos.includes(item)}
                        >
                            <div class="item-contenido">
                                <span class="indices">{i + 1})</span>
                                <span class="folio-txt">{item}</span>
                            </div>
                            <button
                                class="removerFolio"
                                on:click={() => {
                                    quitarFolio(item);
                                }}
                            >
                                <i class="material-icons">delete_forever</i>
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- <div class="lista">
                {#if buscando.length == 0}
                    {#if filtrar_selectos == true}
                        {#each folios as item, i}
                            {#if item.selecto == true}
                                <div
                                    class="item"
                                    class:selecto={item.selecto}
                                    on:click={() => seleccionar_uno(item)}
                                >
                                    <span class="indices">{i + 1} )</span
                                    >{item.folio}
                                </div>
                            {/if}
                        {:else}
                            No has seleccionado folios
                        {/each}
                    {:else}
                        {#each folios as item, i}
                            <div
                                class="item"
                                class:selecto={item.selecto}
                                on:click={() => seleccionar_uno(item)}
                            >
                                <span class="indices">{i + 1} )</span
                                >{item.folio}
                            </div>
                        {:else}
                            No se encotraron folios relacionados al producto
                        {/each}
                    {/if}
                {:else}
                    {#if filtrar_selectos == true}
                        {#each lista_filtrada as item, i}
                            {#if item.selecto == true}
                                <div
                                    class="item"
                                    class:selecto={item.selecto}
                                    on:click={() => seleccionar_uno(item)}
                                >
                                    <span class="indices">{i + 1} )</span
                                    >{item.folio}
                                </div>
                            {/if}
                        {:else}
                            No has seleccionado folios
                        {/each}
                    {:else}
                        {#each lista_filtrada as item, i}
                            <div
                                class="item"
                                class:selecto={item.selecto}
                                on:click={() => seleccionar_uno(item)}
                            >
                                <span class="indices">{i + 1} )</span
                                >{item.folio}
                            </div>
                        {:else}
                            No se encotraron folios relacionados al producto y <b
                                >{buscando}</b
                            >
                        {/each}
                    {/if}
                {/if}
            </div> -->
        </div>
    </div>
{/if}

<style>
    .item.repetido {
        background-color: #b19cd9; /* Un tono de morado claro */
        color: white; /* Texto blanco para mayor contraste */
        border-radius: 5px;
        padding: 5px;
    }

    .indices {
        font-size: 10px;
        color: gray;
    }
    .check-color {
        color: rgb(43, 120, 254);
    }
    .guardando {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    button {
        cursor: pointer;
    }
    input {
        border-radius: 12px;
        border: 1px solid #d3d9e4;
    }
    .encabezado-modal {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 14px;
    }
    .titulo-principal {
        font-size: 1.15rem;
        font-weight: 800;
        color: #1f3042;
    }
    .titulo-secundario {
        margin-top: 4px;
        color: #506172;
        font-size: 0.92rem;
    }
    .relativo {
        position: relative;
    }
    .acciones-header {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .estado-ok {
        color: #245d37;
        font-weight: 700;
    }
    .estado-guardando {
        font-weight: 700;
        color: #4d5a67;
    }
    .resumen-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 14px;
    }
    .resumen-card {
        background: #eef3f8;
        border: 1px solid #d6dee8;
        border-radius: 14px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: #1f3042;
    }
    .resumen-label {
        font-size: 0.82rem;
        color: #5f6f80;
    }
    .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 6px;
        border-bottom: #d8dee6 solid 1px;
    }
    .item:hover {
        background: #f4f7fa;
        color: #203040;
    }
    .contenedor {
        position: absolute;
        width: min(42rem, calc(100vw - 32px));
        left: 50%;
        transform: translateX(-50%);
        background: #f1f4f8;
        border-radius: 18px;
        border: 1px solid #cad3de;
        top: 49px;
        z-index: 2;
        padding: 18px;
        box-shadow: 0 18px 38px rgba(29, 42, 55, 0.22);
    }
    .lista {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        background: white;
        height: 18rem;
        overflow-y: auto;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid #d9e0e8;
        box-shadow: inset 0 0 0 1px #f6f8fb;
    }
    .botones {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
    }
    .modo-secuencial-wrap {
        margin: 2px 0 14px;
    }
    .switch-linea {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }
    .switch-secuencial {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        border-radius: 999px;
        padding: 8px 14px;
        background: #dfe8f2;
        color: #2b2b2b;
        font-weight: 700;
    }
    .switch-secuencial.activo {
        background: #d7ebff;
        color: #0e4f94;
    }
    .tipo-base-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 999px;
        background: #edf4fb;
        border: 1px solid #cfe0f2;
        color: #35516d;
        font-size: 0.92rem;
    }
    .ayuda-secuencial {
        margin-top: 8px;
        font-size: 0.9rem;
        color: #465564;
        line-height: 1.35;
    }
    .BtnFolio {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        border: 1px solid #ccd5df;
        background: white;
        color: #344454;
        font-weight: 700;
    }
    .BtnFolio.activo {
        background: #dfeeff;
        border-color: #7aaef5;
        color: #0f56a6;
    }
    .InputFolios {
        width: 100%;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        background: white;
    }
    .BoxProd {
        display: flex;
        gap: 10px;
    }
    .ProdIndividual {
        display: flex;
        justify-content: center;
    }
    .captura-panel {
        margin-bottom: 14px;
    }
    .input-cantidad {
        max-width: 120px;
    }
    .item-contenido {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }
    .folio-txt {
        word-break: break-all;
        color: #1f3042;
    }
    .removerFolio {
        background: red;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 5px;
        cursor: pointer;
    }
    @media (max-width: 700px) {
        .encabezado-modal,
        .BoxProd,
        .botones,
        .acciones-header {
            flex-direction: column;
            align-items: stretch;
        }
        .resumen-grid {
            grid-template-columns: 1fr;
        }
        .contenedor {
            top: 16px;
            max-height: calc(100vh - 32px);
            overflow-y: auto;
        }
        .input-cantidad {
            max-width: none;
        }
    }
</style>
