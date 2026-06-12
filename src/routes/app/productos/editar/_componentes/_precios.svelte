<script>
export var precio_publico=0;
import {formato_precio} from "./../../../../stores";

let lista_descuentos = [];
// De 0 al 50 de 5 en 5
for (let i = 0; i <= 50; i += 5) {
    lista_descuentos.push(i);
}
// Del 50 al 60 de 1 en 1
for (let i = 51; i <= 60; i++) {
    lista_descuentos.push(i);
}

// Calculamos los precios dinámicamente según cambia precio_publico
let precios_calculados = [];
$: precios_calculados = lista_descuentos.map(p => {
    return {
        porcentaje: p,
        precio_final: precio_publico - (precio_publico * (p / 100))
    };
});

function obtener_color_descuento(p) {
    if (p === 0) return 'rgb(120, 120, 120)';
    if (p <= 20) return 'rgb(0, 150, 136)'; // Verde azulado
    if (p <= 40) return 'orange'; // Naranja
    if (p <= 50) return 'rgb(0, 51, 145)'; // Azul
    if (p <= 55) return 'rgb(66, 66, 66)'; // Gris oscuro
    return 'rgb(107, 0, 23)'; // Rojo vino
}
</script>
<style>
.contenedor-tabla {
    max-height: 250px;
    overflow-y: auto;
    border: 1px solid #ededed;
    border-radius: 8px;
    padding: 4px;
}
thead{
    font-size: .9em;
    font-weight: 600;
    color:rgb(153, 153, 153);
    text-align: center;
    position: sticky;
    top: 0;
    background-color: white;
    z-index: 1;
}
.col_2{
    border-radius: 5px;
    height: 3.2vh;
    width: 50%;
    text-align: center;
    font-size: .9em;
}
.col_3{
    width: 50%;
    text-align: right;
    padding-right: 15px;
}
.tag_desc {
    color: white;
    text-align: center;
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 0.95em;
    font-weight: 500;
    display: inline-block;
}
</style>
<div class="contenedor-tabla">
<table style="width:100%;text-align:left;">
<thead>
    <td>Descuento</td>
    <td style="text-align: right; padding-right: 15px;">Precio</td>
</thead>
{#each precios_calculados as item}
<tr>
    <td class="col_2"> 
        <span class="tag_desc" style="background-color: {obtener_color_descuento(item.porcentaje)}">
            {item.porcentaje}%
        </span> 
    </td>
    <td class="col_3"><span class="indice_row">$</span> {formato_precio(item.precio_final)}</td>
</tr>
{/each}
</table>
</div>