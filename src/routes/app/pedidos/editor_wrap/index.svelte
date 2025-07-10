<script>
  import { editar_store, clientes } from "./../../../stores";
  import { onMount } from "svelte";
  import Page_2 from "./../editar/Paso_2.svelte";

  let cliente_db = null;
  let lista = [];

  let rutas = true;

  let id = null;
  let datoNullo = null;

  $: {
    id = $editar_store.pedido._id;
    console.log("ID del pedido actualizado:", $editar_store.pedido);
  }

  onMount(() => {
    console.log($editar_store.pedido);
    if ($editar_store.pedido.tenia_ficha === true)
      ficha_de_descuento = {
        descuento: $editar_store.pedido.descuento,
      };

    cliente_db = $clientes.lista.find(
      (element) => element._id === $editar_store.pedido.cliente.id,
    );
    if (cliente_db === undefined) {
      $editar_store.pedido.rutas = rutas;
    }
    console.log(cliente_db);
  });
  let ficha_de_descuento;
</script>

{#if cliente_db}
  <!-- content here -->
  <Page_2
    bind:id_carrito={$editar_store.pedido._id}
    lista_productos={lista}
    bind:ficha_de_descuento
    bind:pedido_nuevo={$editar_store.pedido}
    bind:cliente={cliente_db}
  />
{/if}

{#if cliente_db === undefined}
  {#if id !== null}
    <Page_2
      bind:id_carrito={id}
      lista_productos={lista}
      bind:ficha_de_descuento
      bind:pedido_nuevo={$editar_store.pedido}
      bind:cliente={datoNullo}
    />
  {/if}
{/if}
