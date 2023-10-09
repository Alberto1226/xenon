<script>
export var precio_publico=0;
import {formato_precio} from "./../../../../stores";
var cuarenta =precio_publico-(precio_publico*0.4);
var cuarenta_y_cinco =precio_publico-(precio_publico*0.45);
var cincuenta =precio_publico-(precio_publico*0.5);
var cincuenta_y_cinco =precio_publico-(precio_publico*0.55);
var sesenta =precio_publico-(precio_publico*0.60);
$: cuarenta =precio_publico-(precio_publico*0.4);
$: cuarenta_y_cinco =precio_publico-(precio_publico*0.45);
$: cincuenta =precio_publico-(precio_publico*0.5);
$:  cincuenta_y_cinco =precio_publico-(precio_publico*0.55);
$: sesenta =precio_publico-(precio_publico*0.60);
</script>
<style>
thead{
    font-size: .9em;
    font-weight: 600;
    color:rgb(153, 153, 153);
    text-align: center;
}
.col_1{
    font-weight: 200;
    width: 33%;
    height: 3.5vh;
}
.col_2{
    border-radius: 5px;
    height: 16px;
    width: 33%;
    text-align: center;
    font-size: .9em;
}
.col_3{
    width: 33%;
    text-align: right;
}
.desc_40{
    background-color: orange;
    color:white;
    text-align:center;
    border-radius:7px;
    padding: 1px 5px;
}
.desc_45{
    background-color: rgb(0, 51, 145);
    color:white;
    text-align:center;
    border-radius:7px;
    padding: 1px 5px;
}

.desc_50{
    background-color: rgb(0, 119, 93);
    color:white;
    text-align:center;
    border-radius:7px;
    padding: 1px 5px;
}
.desc_55{
    background-color: rgb(66, 66, 66);
    color:white;
    text-align:center;
    border-radius:7px;
    padding: 1px 5px;
}
.desc_60{
    background-color: rgb(107, 0, 23);
    color:white;
    text-align:center;
    border-radius:7px;
    padding: 1px 5px;
}
</style>
<table style="width:100%;text-align:left;">
<thead>
    <td>Perfil</td>
    <td>Descuento</td>
    <td>Precio</td>
</thead>
<tr>
    <td class="col_1">MENUDEO</td>
    <td class="col_2 "> <span class="desc_40">40%</span> </td>
    <td class="col_3 "><span class="indice_row">$</span> {formato_precio(cuarenta)}</td>
</tr>

<tr>
    <td class="col_1">MAYOREO</td>
    <td class="col_2 "><span class="desc_45">45%</span> </td>
    <td class="col_3 "><span class="indice_row">$</span> {formato_precio(cuarenta_y_cinco)}</td>
</tr>

<tr>
    <td class="col_1">DISTRIBUIDOR</td>
    <td class="col_2 "><span class="desc_50">50%</span></td>
    <td class="col_3 "><span class="indice_row">$</span> {formato_precio(cincuenta)}</td>
</tr>

<tr>
    <td class="col_1">ELITE</td>
    <td class="col_2 "><span class="desc_55">55%</span></td>
    <td class="col_3 "><span class="indice_row">$</span> {formato_precio(cincuenta_y_cinco)}</td>
</tr>

<tr>
    <td class="col_1">ELITE 10</td>
    <td class="col_2 "><span class="desc_60">60%</span></td>
    <td class="col_3 "><span class="indice_row">$</span> {formato_precio(sesenta)}</td>
</tr>
</table>