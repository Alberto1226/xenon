<script>
    import { Dialog, Button } from "svelte-mui/src";
    import {
        formato_precio,
        pedido_selecto,
        mensajes_app,
        pedidos,
        cargando_mensajes_app,
        postData,
        mensaje_error,
    } from "./../../../stores";
    import { RUTA, Producto, stores_productos } from "./../../../store_http";
    export var pedido;
    export let visible = false;
    import { createEventDispatcher, onMount } from "svelte";
    import { get } from "svelte/store";
    import {
        visible_ventana_de_detalles,
        lista_detalle,
    } from "./store_folios_que_ya_no_existen";

    const dispatch = createEventDispatcher();
    let procesando = false;
    let mensaje_envio = "Envío (Descontar)";
    let contador = 0;
    var costo_envio = 0;
    var todos_los_botones_visibles = true;
    var producto_para_envios_existe = false;

    $: if (visible == false) {
        resetear();
    }

    $: if (visible == true) {
        descargar_producto_envios();
    }

    async function descargar_producto_envios() {
        try {
            var res = await Producto.http.obtener.solicitar(
                {},
                RUTA.producto.cual_es_paqueteria_default,
                stores_productos
            );

            res.log();
            producto_para_envios_existe = res.ok;
        } catch (err) {
            console.log(err);
        }
        //$stores_productos.paqueteria_default = res.response;
    }

    function resetear() {
        //console.log("cerrado");
        contador = 0;
        costo_envio = 0;
        todos_los_botones_visibles = true;
    }

    function cambiar_status(status) {
        procesando = true;
        postData("/app/pedidos/cambiar_status", { status, id: pedido._id })
            .then((respuesta) => {
                if (respuesta.ok) {
                    setTimeout(() => {
                        $mensajes_app.push({
                            tipo: "exito",
                            mensaje: "Status cambiado a " + status,
                        });
                        $mensajes_app = $mensajes_app;
                        dispatch("recargar_lista");
                    }, 100);
                    procesando = false;
                    visible = false;
                    //actualizar_local(status);
                }
            })
            .catch((err) => {
                console.log(err);
                $mensajes_app.push({
                    tipo: "error",
                    mensaje: "No se pudo hacer el cambio-- a " + status,
                });
                $mensajes_app = $mensajes_app;
                procesando = false;
            });
    }

    function actualizar_local(status) {
        let lista = $pedidos.lista;
        let pedido_actual = lista.find(
            (element) => element.folio === pedido.folio
        );
        pedido_actual.status = status;
        $pedidos.lista = lista;
        $pedidos = $pedidos;
    }

    function borrar_local() {
        let lista = $pedidos.lista;
        let lista_nueva = lista.filter((element) => element._id !== pedido._id);
        $pedidos.lista = lista_nueva;
        $pedidos = $pedidos;
        dispatch("recargar_lista");
    }
    function cambiar_status_a_envio() {
        if (procesando === true) return;
        if (contador == 0) {
            contador++;
            mensaje_envio = `Confirma ${2 - contador + 1} veces`;
            todos_los_botones_visibles = false;
            return;
        }
        if (contador == 1) {
            contador++;
            mensaje_envio = `Confirma ${2 - contador + 1} vez más`;
            return;
        }
        procesando = true;
        mensaje_envio = "Subiendo...";
        // dispatch('procesando_cambio_status_a_envio');
        postData("/app/pedidos/cambiar_status_a_envio", {
            id: pedido._id,
            producto_para_envios_existe,
            costo_envio,
            producto_para_envios_id:
                producto_para_envios_existe == true
                    ? $stores_productos.paqueteria_default._id
                    : null,
        })
            .then((respuesta) => {
                console.log({ respuesta });

                if (respuesta.ok == true) {
                    setTimeout(() => {
                        $mensajes_app.push({
                            tipo: "exito",
                            mensaje: "Status cambiado a " + status,
                        });
                        $mensajes_app = $mensajes_app;
                        var reporte = respuesta.reporte_de_folios_para_frontend;
                        if (reporte) {
                            $visible_ventana_de_detalles = true;
                            $lista_detalle = reporte;
                        }
                        dispatch("recargar_lista");
                    }, 100);
                    //procesando = false;
                    visible = false;
                } else {
                    procesando = false;
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: respuesta.mensaje,
                    });
                    $mensajes_app = $mensajes_app;
                    var reporte = respuesta.reporte_de_folios_para_frontend;
                    if (reporte) {
                        $visible_ventana_de_detalles = true;
                        $lista_detalle = reporte;
                    }
                    console.log($visible_ventana_de_detalles);
                    visible = false;
                }
            })
            .catch((err) => {
                console.log(err);
                $mensajes_app.push({
                    tipo: "error",
                    mensaje: "No se pudo hacer el cambio a " + status,
                });
                $mensajes_app = $mensajes_app;
                //procesando = false;
                dispatch("cambio_a_status_envio");
            });
    }

    function cambiar_status_a_enviado() {
        //  ultimo status
        if (procesando == true) return;
        procesando = true;
        mensaje_envio = "Subiendo...";
        //dispatch('procesando_cambio_status_a_envio');

        postData("/app/pedidos/cambiar_status_a_enviado", { id: pedido._id })
            .then((respuesta) => {
                //console.log(respuesta);

                if (respuesta.ok) {
                    setTimeout(() => {
                        $mensajes_app.push({
                            tipo: "exito",
                            mensaje: "Status cambiado a " + status,
                        });
                        $mensajes_app = $mensajes_app;
                        dispatch("recargar_lista");
                    }, 100);
                    procesando = false;
                    visible = false;
                }
            })
            .catch((err) => {
                console.log(err);
                $mensajes_app.push({
                    tipo: "error",
                    mensaje: "No se pudo hacer el cambio a " + status,
                });
                $mensajes_app = $mensajes_app;
                procesando = false;
                dispatch("cambio_a_status_envio");
            });
    }
</script>

<Dialog width="500" bind:visible>
    <div slot="title">
        <div class="centrado">Status pedido {pedido.folio}</div>
    </div>
    {#if pedido.status !== "Envío"}
        {#if procesando == false}
            <!-- content here -->
            {#if todos_los_botones_visibles == true}
                <table>
                    <tr>
                        <td>
                            <span class="indice_row">1)</span>
                            <Button
                                style="width:150px;height:150px"
                                disabled={procesando ||
                                    pedido.status === "Envío"}
                                raised
                                on:click={() => {
                                    cambiar_status("Pedido");
                                }}
                                >Pedido
                            </Button></td
                        >
                        <td>
                            <span class="indice_row">2)</span>
                            <Button
                                style="width:150px;height:150px"
                                disabled={procesando ||
                                    pedido.status === "Envío"}
                                raised
                                on:click={() => {
                                    cambiar_status("Ficha Pago");
                                }}
                                >Ficha Pago
                            </Button></td
                        >
                        <td>
                            <span class="indice_row">3)</span>
                            <Button
                                style="width:150px;height:150px"
                                disabled={procesando ||
                                    pedido.status === "Envío"}
                                raised
                                on:click={() => {
                                    cambiar_status("Pagado");
                                }}
                            >
                                Pagado</Button
                            ></td
                        >
                    </tr>
                    <tr>
                        <td>
                            <span class="indice_row">4)</span>
                            <Button
                                style="width:150px;height:150px"
                                disabled={procesando ||
                                    pedido.status === "Envío"}
                                raised
                                on:click={() => {
                                    cambiar_status("Empaque");
                                }}
                                >Empaque
                            </Button></td
                        >
                        <td>
                            <span class="indice_row">5)</span>
                            <Button
                                style="width:150px;height:150px"
                                disabled={procesando ||
                                    pedido.status === "Envío"}
                                color="#0065ff"
                                title="Descontar de inventario"
                                raised
                                on:click={cambiar_status_a_envio}
                                >{mensaje_envio}
                            </Button></td
                        >
                        <td>
                            <span class="indice_row">6)</span>
                            <Button
                                style="width:150px;height:150px"
                                disabled={true}
                                color="#a5a5a5"
                            >
                                <i class="material-icons">flight_land</i> Entregado
                            </Button></td
                        >
                    </tr>
                </table>
            {:else}
                <!-- -->
                <div class="contenedor">
                    {#if producto_para_envios_existe == true}
                        <!-- content here -->
                        <div class="centrado">
                            <label for="input" title="Costo de paquetería">
                                <div class="label_txt">
                                    Costo de paquetería de <b
                                        >{$stores_productos.paqueteria_default
                                            .nombre}</b
                                    >:
                                </div>
                                <span class="label_txt">$ </span>
                                <input
                                    class="input"
                                    type="number"
                                    min="0"
                                    placeholder="Precio"
                                    bind:value={costo_envio}
                                />
                            </label>
                        </div>
                    {:else}
                        <div class="centrado">
                            Para cambiar el costo de envio modifica algun
                            producto, marcandolo como default para paquetería.
                        </div>
                    {/if}

                    <div class="centrado totales">
                        {pedido.cliente.nombre}
                    </div>

                    <div class="centrado totales">
                        {#if costo_envio == 0}
                            total: $ {formato_precio(pedido.total_pedido)}
                        {:else if isNaN(costo_envio) == true}
                            <div class="rojo">Error</div>
                        {:else}
                            <span class="gris-claro">
                                total: $ {formato_precio(pedido.total_pedido)}
                            </span>
                            <i class="material-icons vertical-alineado"
                                >arrow_forward</i
                            >
                            $ {formato_precio(
                                pedido.total_pedido + costo_envio
                            )}
                        {/if}
                    </div>

                    <div class="centrado">
                        <Button
                            style="width:150px;height:150px"
                            disabled={procesando ||
                                pedido.status === "Envío" ||
                                isNaN(costo_envio) == true ||
                                costo_envio < 0}
                            color="#0065ff"
                            title="Cambiar a Envío ,en este paso se descuenta de inventario"
                            raised
                            on:click={cambiar_status_a_envio}
                            >{mensaje_envio}
                        </Button>
                    </div>
                </div>
            {/if}
        {:else}
            <div class="centrado">Procesando...</div>
        {/if}
    {:else}
        <div class="centrado">
            {#if pedido.mensajeria.empresa === ""}
                <!-- content here -->
                <div class="centrado alerta">
                    No se ha guardado los datos de paquetería. <br />
                    Si se procede no se podrá guardar despues.
                </div>
                <br />
            {:else}
                <tabla style="text-align:left;width:100%;padding-bottom:20px;">
                    <tr>
                        <td> Paquetería </td>
                        <td> <b>{pedido.mensajeria.empresa}</b> </td>
                    </tr>
                    <tr>
                        <td> Codigo de rastreo </td>
                        <td><b>{pedido.mensajeria.codigo_de_rastreo}</b></td>
                    </tr>
                </tabla>
            {/if} <br />
            {#if procesando == false}
                <!-- content here -->
                <Button
                    disabled={procesando == true}
                    raised
                    on:click={cambiar_status_a_enviado}
                >
                    <i class="material-icons">flight_land</i> Entregado
                </Button>
            {/if}
        </div>
    {/if}

    <div slot="actions" class="actions center">
        Selecciona el status correspondiente actual del pedido .
    </div>
</Dialog>

<style>
    .gris-claro {
        color: rgb(161, 161, 161);
    }
    .label_txt {
        font-size: 12px;
    }
    .totales {
        margin: 16px 0px;
    }
    label {
        text-align: left;
        width: fit-content;
        margin: 16px auto;
    }
    .input {
        height: 32px;
        width: 256px;
        margin: 0px;
    }
    .alerta {
        color: red;
    }
</style>
