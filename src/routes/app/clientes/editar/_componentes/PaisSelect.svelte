<script>
    import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
    import { onMount, createEventDispatcher } from "svelte";
    export var estado;
    export var activar;
    export var actualizar;
    const dispatch = createEventDispatcher();
    onMount(() => {
        lista = estados;
    });
</script>
<style>

</style>

