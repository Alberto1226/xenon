<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { postData } from "../../../stores";

    const dispatch = createEventDispatcher();
    export var pedido_id = null;

    var resultado = null;
    const url = "app/pedidos/checar_si_todos_los_folios_cumplen";
    var data = { pedido_id };
    onMount(() => {
        console.log(data);
        console.log("data");
        solicitar(url, data);
    });

    async function solicitar(url, data) {
        try {
            resultado = await postData(url, data);
            console.log(resultado);
            if (resultado.ok == true) {
                dispatch("termino",{ ok: true, resultado });
                return { ok: true };
            } else {
                dispatch("termino",{ ok: true, resultado });
                return { ok: true };
            }
        } catch (err) {
            console.log(err);
            dispatch("termino",{ ok: false, resultado });
            return { ok: false };
        }
    }
</script>
