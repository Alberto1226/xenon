<script>
    import Fecha from './fecha.svelte';
export var correo
export var telefono
export var fecha_nacimiento
</script>

<style>

</style>
<div class="col20p">
<i class="material-icons vertical-alineado">email</i> {correo} <br>
<i class="material-icons  vertical-alineado">contact_phone</i>  {telefono} <br>
 <div title="Cambiar formato de fechas">
    <Fecha fecha={fecha_nacimiento} cumple={true}/>
 </div>
</div>