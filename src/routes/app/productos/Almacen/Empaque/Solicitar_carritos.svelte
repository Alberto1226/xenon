<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { Button } from "svelte-mui/src";

    import {
        postData,
        mensaje_bueno,
        mensaje_error,
    } from "./../../../../stores";
    const dispatch = createEventDispatcher();

    export var resultado = { lista: [] };
    export var url = "";
    export var data = {};
    export var numero_total = 0;
    //      En caso de exito en la consulta
    export var mensaje_bueno_txt = "";
    //      En caso de error enla consutla
    export var mensaje_malo_txt = "";
    export var volver_a_consultar = false;

    var ocupado = false;
    export var resultado_ok = null;
    var print_resultados = true;

    onMount(() => {
        post_http();
    });

    $: if (volver_a_consultar == true) {
        reintentar();
    }

    function reintentar() {
        volver_a_consultar = false;
        ocupado = false;

        post_http();
    }

    async function post_http() {
        if (print_resultados == true)
            console.log("Iniciando post http***********");
        resultado = { lista: [] };
        try {
            if (ocupado == true) return;
            ocupado = true;

            resultado = await postData(url, data);
            if (print_resultados == true) console.log(resultado);
            // estado_actual = "mandando datos";
            ocupado = false;
            //estado_actual = "terminado";
            if (resultado.ok == true) {
                dispatch("resultado_exitoso");

                if (mensaje_bueno_txt != "") mensaje_bueno(mensaje_bueno_txt);
                numero_total = resultado.numero_total;
                resultado_ok = true;
            } else {
                dispatch("resultado_error");
                resultado_ok = false;
                if (mensaje_malo_txt != "") mensaje_error(mensaje_malo_txt);
            }
        } catch (err) {
            dispatch("resultado_error_catch");
            ocupado = false;
            resultado_ok = false;
            console.log(err);
            if (mensaje_malo_txt != "") mensaje_error(mensaje_malo_txt);
        }
    }
</script>
