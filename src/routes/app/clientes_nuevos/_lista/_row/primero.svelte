<script>
    import {convertir_a_fecha_humana,options} from './../../../../stores';
    import Fecha from './fecha.svelte';
export var nombre
export var createdAt

</script>

<style>
.nombre{
    font-weight: 700;
}
</style>
<div class="col20p">
<div class="nombre">
    <i class="material-icons vertical-alineado">person</i>
    {nombre}</div>
<br>
<div title="Cambiar formato de fecha">
    <Fecha fecha={createdAt} cumple={false}/>
</div>
</div>