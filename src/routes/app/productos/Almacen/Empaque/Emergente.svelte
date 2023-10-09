<script>
    //import { Button } from "svelte-mui";
    import { pedido, acciones } from "./store";
    import { Button } from "svelte-mui/src";
    import Solicitar_agregado_folios from "./Solicitar_agregado_folios.svelte";
    export var visible = false;
    import Solicitar_productos_y_sus_folios from "./Solicitar_productos_y_sus_folios.svelte";
    import Row from "./Row_producto.svelte";
    import { pedidos } from "../../../../stores";
    import Logs from "./Log.svelte";

    var el_siguiente_es_mayuscula = false;
    var buscador = "";
    var volver_a_consultar = false;
    var productos_db = [];
    var resultado_ok;
    var numero_total = 0;
    var resultado_busqueda_anterior = {
        sugerencia: "",
        buscando: "",
        producto: null,
        encontrado_local: false,
        encontrado_productos_db: false,
        accion_automatica: "",
        accion_con_permiso_de_usuario: "",
    };
    var resultado = {
        ok: true,
        lista: [],
    };

    var solicitando_agregado_de_folios = false;
    var resultado_de_agregado = { ok: null };
    var viendo_logs = false;

    $: if (visible == false) {
        productos_db = [];
    }

    async function handle_key(evt) {
        if (visible == true) {
            if (evt.key == "Shift") {
                el_siguiente_es_mayuscula = true;
                return;
            }

            if (evt.key == "Backspace") {
                // if (buscador.length > 0) buscador.substr(0, buscador.length - 1);
                buscador = buscador.slice(0, -1);
                return;
            }
            if (evt.key == "Escape") {
                buscador = "";
                //buscador_mini = "";
            } else if (evt.key == "Enter") {
                if (buscador == "") return;
                let estado = await agregar_a_pedido_si_se_puede();
                console.log({ estado });
                return;
            } else {
                if (el_siguiente_es_mayuscula == true) {
                    buscador += evt.key.toUpperCase();
                    el_siguiente_es_mayuscula = false;
                } else {
                    buscador += evt.key;
                }
            }
        }
    }

    function se_tiene_resultado() {
        //let default = "imagenes/producto_generico.svg";

        productos_db = resultado.productos.map((elem) => {
            let imagen =
                elem.galeria_imagenes[0] != ""
                    ? elem.galeria_imagenes[0]
                    : "imagenes/producto_generico.svg";
            return {
                producto: {
                    nombre: elem.nombre,
                    id: elem._id,
                    imagen: imagen,
                },
                lista_folios: elem.existencia.folios,
            };
        });
        //console.log(productos_db);
    }

    async function agregar_a_pedido_si_se_puede() {
        let encontrado_en_el_pedido_actual =
            await encontrar_en_folios_ya_agregados(buscador);
        //console.log({ encontrado_en_el_pedido_actual });
        let encontrado_en_productos_db = await encontrar_en_folios_productos_db(
            buscador
        );
        //console.log({ encontrado_en_productos_db });
        //let se_puede_agregar = true;
        if (encontrado_en_el_pedido_actual && encontrado_en_productos_db) {
            resultado_busqueda_anterior.accion_automatica = "Ninguna";
            resultado_busqueda_anterior.sugerencia =
                "El pedido ya tiene este folio";
            resultado_busqueda_anterior.accion_con_permiso_de_usuario = "";
            resultado_busqueda_anterior.buscando = buscador;
            resultado_busqueda_anterior.encontrado_local = true;
            resultado_busqueda_anterior.encontrado_productos_db = true;
            resultado_busqueda_anterior.producto =
                encontrado_en_productos_db.producto;
        }

        if (!encontrado_en_el_pedido_actual && encontrado_en_productos_db) {
            resultado_busqueda_anterior.accion_automatica =
                "El folio se agregara al pedido enseguida";
            resultado_busqueda_anterior.sugerencia = "";
            resultado_busqueda_anterior.accion_con_permiso_de_usuario = "";
            resultado_busqueda_anterior.buscando = buscador;
            resultado_busqueda_anterior.encontrado_local = false;
            resultado_busqueda_anterior.encontrado_productos_db = true;
            resultado_busqueda_anterior.producto =
                encontrado_en_productos_db.producto;
            solicitando_agregado_de_folios = true;
        }

        if (!encontrado_en_el_pedido_actual && !encontrado_en_productos_db) {
            resultado_busqueda_anterior.accion_automatica = "Ninguna";
            resultado_busqueda_anterior.sugerencia =
                "Ingresa el folio en el sistema, y vuelve a intentarlo";
            resultado_busqueda_anterior.accion_con_permiso_de_usuario = "";
            resultado_busqueda_anterior.buscando = buscador;
            resultado_busqueda_anterior.encontrado_local = false;
            resultado_busqueda_anterior.encontrado_productos_db = false;
            resultado_busqueda_anterior.producto = null;
        }

        if (encontrado_en_el_pedido_actual && !encontrado_en_productos_db) {
            resultado_busqueda_anterior.accion_automatica = "Ninguna";
            resultado_busqueda_anterior.sugerencia =
                "Borra el folio del pedido, ingresa el folio en el sistema , y vuelve a intentarlo";
            resultado_busqueda_anterior.accion_con_permiso_de_usuario =
                "Borrar del pedido actual?";
            resultado_busqueda_anterior.buscando = buscador;
            resultado_busqueda_anterior.encontrado_local = true;
            resultado_busqueda_anterior.encontrado_productos_db = false;
            resultado_busqueda_anterior.producto =
                encontrado_en_el_pedido_actual.producto;
        }
        setTimeout(() => {
            buscador = "";
        }, 1000);
    }

    function encontrar_en_folios_ya_agregados(folio) {
        console.log("------------- folio a buyscar" + folio);
        if ($pedido.lista.length == 0) {
            return null;
        }
        for (let i = 0; i < $pedido.lista.length; i++) {
            const element = $pedido.lista[i];
            let lista_tmp = element.folios;
            if (!lista_tmp) continue;

            let encontrado = lista_tmp.find((elem) => folio == elem);
            console.log("encontrado=" + encontrado);
            if (encontrado) {
                return element;
                break;
            }
            if (i + 1 == productos_db.length) {
                return null;
            }
        }
    }

    //       esta funcion devuelve el producto donde esta el folio buiscado por la pistola
    function encontrar_en_folios_productos_db(folio) {
        console.log("------------- folio a buyscar" + folio);
        if (productos_db.length == 0) {
            return null;
        }

        for (let i = 0; i < productos_db.length; i++) {
            const element = productos_db[i];
            let lista_tmp = element.lista_folios;

            let encontrado = lista_tmp.find((elem) => folio == elem);
            console.log("encontrado=" + encontrado);
            if (encontrado) {
                return element;
                break;
            }
            if (i + 1 == productos_db.length) {
                return null;
            }
        }
    }

    function realizar_accion_con_permiso_de_usuario() {
        console.log("Realizando accion");
    }

    function agregado_exitoso() {
        let registro = $pedido.lista.find(
            (elem) =>
                elem.producto._id == resultado_busqueda_anterior.producto.id
        );
        registro.folios.push(resultado_busqueda_anterior.buscando);
        $pedido.lista = $pedido.lista;
        $pedido = $pedido;
        $acciones.push({
            accion: "agregar",
            folio: resultado_busqueda_anterior.buscando,
            folios: [],
            realizado: true,
            fecha: new Date(),
        });

        $acciones = $acciones;
        solicitando_agregado_de_folios = false;
    }
</script>

<svelte:window on:keydown={handle_key} />
{#if visible}
    <div class="contenedor">
        <!-- come -->
        <div class="flex">
            <div>
                <Button on:click={() => (visible = false)}>
                    <i class="material-icons"> arrow_left </i> regresar
                </Button>
            </div>
            {#if $acciones.length > 0}
                <div>
                    <Button on:click={() => (viendo_logs = !viendo_logs)}>
                        <i class="material-icons"> fact_check </i>
                        {#if viendo_logs == true}
                            ocultar logs
                        {:else}
                            ver logs
                        {/if}
                    </Button>
                </div>
            {/if}
        </div>
        <div>
            <div class="flex">
                <h2>
                    Folio: <span class="folio">
                        {$pedido.folio}
                    </span>
                </h2>
                <h3 class="cliente">
                    {$pedido.cliente.nombre}
                </h3>
            </div>
            {#if buscador != ""}
                <div class="folio_leido">
                    {buscador}
                </div>
            {:else}
                <div class="listo">Listo !</div>
            {/if}
        </div>
        {#if viendo_logs == false}
            <!-- content here -->{#if resultado_busqueda_anterior.buscando != ""}
                <div class="contenedor_folio">
                    <div class=" titulo-folios-selectos  no_select">
                        Resultados de lectura y acciones
                    </div>
                    <div class="conpadding">
                        {#if resultado_busqueda_anterior.producto}
                            <div class="producto">
                                {#if resultado_busqueda_anterior.producto.imagen}
                                    <div
                                        class="imagen_row pointer"
                                        style={"background-image: url(" +
                                            resultado_busqueda_anterior.producto
                                                .imagen +
                                            ");"}
                                    />
                                {/if}

                                <div class="nombre">
                                    {resultado_busqueda_anterior.producto
                                        .nombre}
                                </div>
                            </div>
                        {/if}

                        <div class="encontrados">
                            <table>
                                <tr>
                                    <td>se buscó :</td>
                                    <td>
                                        <i class="material-icons icono-medio"
                                            >search</i
                                        >
                                        <span class="folio"
                                            >{resultado_busqueda_anterior.buscando}</span
                                        >
                                    </td>
                                </tr>
                                <tr>
                                    <td> Pedido actual:</td>
                                    <td>
                                        <i
                                            class="material-icons icono-medio "
                                            class:check_ok={resultado_busqueda_anterior.encontrado_local ==
                                                true}
                                            class:rojo={resultado_busqueda_anterior.encontrado_local ==
                                                false}
                                        >
                                            {resultado_busqueda_anterior.encontrado_local ==
                                            true
                                                ? "check"
                                                : "cancel"}
                                        </i>
                                        {resultado_busqueda_anterior.encontrado_productos_db ==
                                        true
                                            ? " Existe"
                                            : " No existe"}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Bodega:</td>
                                    <td>
                                        <i
                                            class="material-icons icono-medio "
                                            class:check_ok={resultado_busqueda_anterior.encontrado_productos_db ==
                                                true}
                                            class:rojo={resultado_busqueda_anterior.encontrado_productos_db ==
                                                false}
                                        >
                                            {resultado_busqueda_anterior.encontrado_productos_db ==
                                            true
                                                ? "check"
                                                : "cancel"}
                                        </i>
                                        {resultado_busqueda_anterior.encontrado_productos_db ==
                                        true
                                            ? " Existe"
                                            : " No existe"}
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <div class="accion">
                            <span class="gris">Acciones</span> <br />
                            Automática :
                            <span class="acciones"
                                >{resultado_busqueda_anterior.accion_automatica}</span
                            >
                            {#if resultado_busqueda_anterior.sugerencia != ""}
                                <!-- content here -->
                                <div class="tag">Sugerencia:</div>
                                <div class="sugerencia">
                                    {resultado_busqueda_anterior.sugerencia}
                                </div>
                            {/if}
                            <br />
                            {#if resultado_busqueda_anterior.accion_con_permiso_de_usuario != ""}
                                Solicito permiso para : {resultado_busqueda_anterior.accion_con_permiso_de_usuario}
                                <Button
                                    on:click={realizar_accion_con_permiso_de_usuario}
                                >
                                    Ok
                                </Button>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        {:else}
            <Logs />
        {/if}

        {#if $pedido.lista}
            <div class="lista">
                <!-- content here -->
                {#each $pedido.lista as item, i}
                    <Row
                        bind:folio_buscado={resultado_busqueda_anterior.buscando}
                        bind:producto_encontrado={resultado_busqueda_anterior.producto}
                        bind:cantidad={item.cantidad}
                        bind:cantidad_agregada={item.cantidad_agregada}
                        bind:producto={item.producto}
                        indice={i}
                        folios={item.folios ? item.folios : []}
                    />
                {:else}
                    <!-- empty list -->
                    Sin productos
                {/each}
            </div>
        {/if}
    </div>

    <Solicitar_productos_y_sus_folios
        on:resultado_exitoso={se_tiene_resultado}
        on:resultado_error
        on:resultado_error_catch
        print_resultados="true"
        bind:volver_a_consultar
        bind:numero_total
        bind:resultado
        bind:resultado_ok
        url="app/productos/Almacen/Empaque/folios_que_puede_usar_el_pedido"
        data={{ carrito_id: $pedido._id }}
    />

    {#if solicitando_agregado_de_folios == true}
        <Solicitar_agregado_folios
            url="app/productos/Almacen/Empaque/agregado_de_folios_de_pedido"
            bind:resultado={resultado_de_agregado}
            data={{
                folio: resultado_busqueda_anterior.buscando,
                carrito_id: $pedido._id,
                producto_id: resultado_busqueda_anterior.producto.id,
            }}
            bind:resultado_ok
            mensaje_bueno_txt="Se ha agregado el folio"
            mensaje_malo_txt="No se pudo agregar el folio"
            on:resultado_exitoso={agregado_exitoso}
        />
    {/if}
{/if}

<style>
    .titulo-folios-selectos {
        text-decoration: underline;
        font-weight: 400;
        color: white;
        background: #0065ff;
        font-size: 0.8em;
        padding-left: 54px;
    }
    .sugerencia {
        color: green;
    }
    .cliente {
        margin-left: 20px;
        display: flex;
        align-items: center;
    }
    .check_ok {
        color: green;
        vertical-align: middle;
    }
    .rojo {
        color: red;
        vertical-align: middle;
    }
    .flex {
        display: flex;
    }
    .producto {
        display: flex;
        align-items: center;
        margin-right: 10px;
    }
    .gris {
        color: gray;
    }
    .acciones {
        color: green;
    }
    .nombre {
        font-size: 1.5em;
        margin-right: 10px;
    }
    .icono-medio {
        vertical-align: middle;
    }
    .imagen_row {
        margin-right: 10px;
        margin-bottom: 10px;
        grid-area: imagen_perfil;
        overflow: hidden;
        border-radius: 36px;
        padding-bottom: 0px;
        text-align: center;
        box-shadow: 0px 1px 8px 0px rgb(148 148 148);
        height: 70px;
        width: 70px;
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
        border: 1px solid white;
    }
    .contenedor_folio {
        width: calc(100% - 52px);
        border: 1px gray solid;
        /* padding: 10px; */
        margin: 10px 0px;
    }
    .conpadding {
        padding: 10px;
    }
    .folio_leido {
        color: #0065ff;
        position: absolute;
        transform: translateY(-15px);
    }
    .listo {
        position: absolute;
        transform: translateY(-15px);
    }

    .folio {
        font-weight: 800;
        color: #0065ff;
    }
    .lista {
        height: 50vh;
        overflow-y: auto;
        width: 98%;
    }
    .contenedor {
        padding-top: 10px;
        padding-left: 10px;
        width: 100%;
        height: calc(100vh - 10px);
        background: white;
        position: absolute;
        z-index: 4;
        left: 0px;
        top: 0px;
    }
</style>
