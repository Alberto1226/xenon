<script>
 var inyeccion = true;
 var descuento = true;
 var sobreescribir = true;
 var cambio_apartado_nuevo = true;
 var cambio_apartado_cambiar = true;
 var cambio_apartado_borrar = true;
import {movimientos_del_producto} from './../../../stores';

$: if(inyeccion || descuento || sobreescribir || cambio_apartado_nuevo || cambio_apartado_cambiar || cambio_apartado_borrar){
    $movimientos_del_producto.filtros_acciones.inyeccion = inyeccion;
    $movimientos_del_producto.filtros_acciones.descuento = descuento;
    $movimientos_del_producto.filtros_acciones.sobreescribir = sobreescribir;
    $movimientos_del_producto.filtros_acciones.cambio_apartado_nuevo = cambio_apartado_nuevo;
    $movimientos_del_producto.filtros_acciones.cambio_apartado_cambiar = cambio_apartado_cambiar;
    $movimientos_del_producto.filtros_acciones.cambio_apartado_borrar = cambio_apartado_borrar;
}

</script>
<style>
.cambio_de_apartado{
    padding: 5px;
    border:1px solid gray;
}
</style>
<!-- <label>
	<input type=checkbox bind:checked={inyeccion}>
	Inyeccion de inventario
</label> -->
<label>
	<input type=checkbox bind:checked={descuento}>
	Descuento de inventario
</label>
<label>
	<input type=checkbox bind:checked={sobreescribir}>
	Sobre-escribir inventario (admin)
</label>

<div class="cambio_de_apartado">

    <label>
        <input type=checkbox bind:checked={cambio_apartado_nuevo}>
        Agregado a un pedido (nuevo en pedido)
    </label>


    <label>
        <input type=checkbox bind:checked={cambio_apartado_cambiar}>
        Cambiado cantidad en un pedido 
    </label>


    <label>
        <input type=checkbox bind:checked={cambio_apartado_borrar}>
        Borrado de un pedido
    </label>
</div>