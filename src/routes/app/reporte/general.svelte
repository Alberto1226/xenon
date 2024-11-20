<script>
    import { Datefield, Button, Dialog, Icon } from "svelte-mui/src";
    import Desde_Hasta from "../graficos/Desde_Hasta.svelte";
    import { mensajes_app, postData, formato_precio } from "../../stores";
    import { onMount } from "svelte";

    let hasta = new Date();
    let format = "D.MM.YYYY";
    let desde = new Date();
    let ultima_fecha_de_consulta = null;
    let http_ocupado = false;
    desde.setMonth(desde.getMonth() - 1);

    let total_cantidad_vendida = 0;
    let total_monetario = 0;
    let total_productos_unicos = 0;
    let total_pedidos = 0;

    let cards = [
        // {
        //     title: "Ventas Realizadas",
        //     number: total_pedidos,
        //     color: "blue",
        //     icon: "bi-cart",
        //     // link: "#",
        // },
        // {
        //     title: "Ventas Cancelada",
        //     number: 2,
        //     color: "red",
        //     icon: "bi-x-circle",
        //     link: "#",
        // },
    ];

    onMount(() => {
        desde = new Date();
        desde.setMonth(desde.getMonth() - 1);
        hasta = new Date();
        obtenerPancake();
    });

    function cambio_fecha(evt) {
        if (ultima_fecha_de_consulta)
            setTimeout(() => {
                //  comienza validacion para checar que no sea un click sin desear cambios
                const mismo_desde =
                    desde.getTime() ==
                    new Date(ultima_fecha_de_consulta.desde).getTime();
                const mismo_hasta =
                    hasta.getTime() ==
                    new Date(ultima_fecha_de_consulta.hasta).getTime();
                //  ejecutar validacion
                if (mismo_hasta && mismo_desde) return;
                obtenerPancake();
            }, 200);
    }

    function obtenerPancake() {
        http_ocupado = true;

        // resultado_ventas.lista_pedidos = [];
        postData("app/pedidos/consultas/General", {
            desde,
            hasta,
        })
            .then((respuesta) => {
                http_ocupado = false;
                // guardar en que momento se hizo la ultiam consulta

                ultima_fecha_de_consulta = {
                    desde: JSON.parse(JSON.stringify(desde)),
                    hasta: JSON.parse(JSON.stringify(hasta)),
                };
                //  Checar si se logro guardar el cliente
                if (respuesta.ok) {
                    console.log("ffff", respuesta);
                    total_cantidad_vendida = respuesta.total_cantidad_vendida;
                    total_monetario = respuesta.total_monetario;
                    total_productos_unicos = respuesta.total_productos_unicos;
                    total_pedidos = respuesta.total_registros;

                    // Actualiza el contenido de las tarjetas
                    cards = [
                        {
                            title: "Ventas Realizadas",
                            number: total_pedidos,
                            color: "blue",
                            icon: "bi-cart",
                        },
                        {
                            title: "Total de Productos",
                            number: total_productos_unicos,
                            color: "purple",
                            icon: "bi-gem",
                        },
                        {
                            title: "Cantidad Vendida Total",
                            number: total_cantidad_vendida,
                            color: "green",
                            icon: "bi-box-seam",
                        },
                        {
                            title: "Total Monetario",
                            number: formato_precio(total_monetario),
                            color: "orange",
                            icon: "bi-cash-stack",
                        },
                    ];
                }
                // else {
                //     $mensajes_app.push({
                //         tipo: "error",
                //         mensaje: respuesta.resumen,
                //     });
                //     $mensajes_app = $mensajes_app;
                // }
                // console.log(respuesta);
            })
            .catch((err) => {
                http_ocupado = false;
                console.log(err);
                $mensajes_app.push({
                    tipo: "error",
                    mensaje: "No se pudo obtener el estudio.",
                });
                $mensajes_app = $mensajes_app;
            });
    }
</script>

<link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.8.1/font/bootstrap-icons.min.css"
/>

<div class="container">
    <div class="filtro">
        <Desde_Hasta bind:desde bind:hasta on:cambio_fecha={cambio_fecha} />
    </div>

    <div class="cards-container">
        {#each cards as card}
            <div class="card {card.color}">
                <div class="card-header">
                    <span>{card.number}</span>
                    <i class="bi {card.icon} icon"></i>
                </div>
                <div class="card-body">
                    <p>{card.title}</p>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    /* Estilo para centrar el contenido */
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 45vh;
        padding: 20px;
    }

    /* Estilos para el filtro */
    .filtro {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: antiquewhite;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
        width: 100%; /* Ocupa todo el ancho */
        max-width: 600px; /* Ajusta un máximo si deseas limitar el tamaño */
    }

    /* Contenedor para las tarjetas */
    .cards-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
    }

    /* Estilos para las tarjetas */
    .card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-radius: 10px;
        color: white;
        padding: 10px;
        width: 180px;
        height: 120px;
        margin: 10px;
        text-align: center; /* Centra el contenido de texto */
    }

    .blue {
        background-color: #007bff;
    }

    .red {
        background-color: #dc3545;
    }

    .green {
        background-color: #28a745;
    }

    .purple {
        background-color: #6f42c1;
    }

    .orange {
        background-color: #fd7e14;
    }

    .icon {
        font-size: 3rem;
        opacity: 0.7;
    }

    .info-link {
        color: white;
        text-decoration: none;
    }

    .info-link:hover {
        text-decoration: underline;
    }
</style>
