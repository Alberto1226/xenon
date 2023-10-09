<script>
    export var lista = [];
    import Producto from "./Producto.svelte";
</script>

{#each lista as item}
    <Producto
        _id={item._id}
        nombre={item.nombre}
        existencia={item.existencia}
        galeria_imagenes={item.galeria_imagenes}
    />
{:else}
    <!-- empty list -->
{/each}
