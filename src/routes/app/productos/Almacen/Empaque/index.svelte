<script>
    import { onMount } from "svelte";
    import Solicitar_carritos from "./Solicitar_carritos.svelte";
    import Indicador_pendientes from "./Indicador_pendientes.svelte";
    import Indicador from "./Indicador.svelte";
    import Row from "./Row.svelte";
    import Emergente from "./Emergente.svelte";
    import { pedidos, pedido } from "./store";

    var carritos = [];
    var visible = false;
    var volver_a_consultar = false;
    var data = {
        pagina_actual: 1,
        buscando: "",
    };
    var resultado_ok;
    var numero_total = 0;
    var resultado = {
        numero_total: 0,
        lista: [],
    };

    $: if (resultado) {
        console.log(resultado);
    }

    function abrir(item) {
        visible = true;

        $pedido = item;
        $pedido.lista = $pedido.lista.map((elem) => {
            return {
                cantidad: elem.cantidad,
                cantidad_agregada: elem.folios ? elem.folios.length : 0,
                folios: elem.folios ? elem.folios : [],
                producto: elem.producto,
                _id: elem._id,
            };
        });
    }
    function se_tiene_resultado() {
        $pedidos = resultado.lista;
    }
    //  CAAD08004PR21022676
</script>

<Solicitar_carritos
    on:resultado_exitoso={se_tiene_resultado}
    on:resultado_error
    on:resultado_error_catch
    print_resultados="true"
    bind:volver_a_consultar
    bind:numero_total
    bind:resultado
    bind:resultado_ok
    url="app/productos/Almacen/pedidos_listos_para_empaque"
    {data}
/>
<Emergente bind:visible />

<!-- resultado_ok={resultado_ok} <br />
{resultado_ok == true}
numero_total ={numero_total}
<br />
resultado={resultado.lista.length} -->
{#if resultado_ok == true}
    <Indicador cantidad={numero_total} />
    <!-- <Indicador_pendientes cantidad={resultado.numero_total} /> -->
    {#if $pedidos}
        {#each $pedidos as item}
            <Row {...item} on:click={() => abrir(item)} />
        {/each}
    {/if}
{:else if resultado_ok == false}
    Ocurrio un error al comunicarse con el servidor
{/if}
