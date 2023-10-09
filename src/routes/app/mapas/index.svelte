<script>
import Mapa from './_Mapa.svelte';
import {mostrar_emergente_de_cliente_selecto} from './../../stores'
import Emergente_info_cliente from './_componentes/Emergente_datos_de_cliente.svelte'
</script>
<style>

</style>
<Mapa/>
{#if $mostrar_emergente_de_cliente_selecto.mostrar==true}
     <Emergente_info_cliente/>
{/if}
