<script>
export var indice=0;
export var direccion =null;
/*
export var direccion ={
   calle:"calle",
colonia:"centro",
cp:"76800",
entre_calle:"",
estado:"Querétaro",
localidad:"198825",
localidad_nombre:"",
municipio:"San Juan del Río",
nombre:"CLIENTE DE PRUEBA",
notas:"",
numero_exterior:"1",
numero_interior:"",
pais:"México",
y_calle:"",
rfc:"AAA010101AAA",
tipo:"envio/facturacion",
telefono:"4273066188",
correo:""
};
*/
import {onMount} from 'svelte';

var direccion_txt ="";
var municipio ="";
var estado = "";
var correo ="";
var telefono ="";

onMount(()=>{
    console.log(direccion);
    direccion_txt = arreglar_direccion(direccion);
    municipio = direccion.municipio ;
    estado = direccion.estado;
    correo = direccion.correo ;
    telefono = direccion.telefono;
})

  function arreglar_direccion(direccion_param) {
    let direccion = direccion_param.calle;
    direccion += ", #" + direccion_param.numero_exterior;
    direccion +=
      direccion_param.numero_interior == ""
        ? ""
        : ", Interior: " + direccion_param.numero_interior;
    direccion += ", Colonia :" + direccion_param.colonia;
    direccion += ", CP: " + direccion_param.cp;
    if(direccion_param.localidad!="")direccion += ", Localidad: " + direccion_param.localidad;
    /*    
    direccion += ", Municipio: " + direccion_param.municipio;
    direccion += ", Estado: " + direccion_param.estado;
    direccion += ", Telefono: " + direccion_param.telefono;
    direccion += ", Correo: " + direccion_param.correo;
    */
    return direccion
  }
</script>

<style>
.contenedor{
display: flex;
border-bottom: 1px solid #cacaca;
    padding: 4px 0px;
}
.indice{
    color:gray;
    font-size: .8em;    
    margin: auto 0;
    padding-right: 4px;

}
.col40{
    width:40%;
    min-width: 250px;
}
.col10{
    width:10%;
    min-width: 50px;
}
</style>

<div class="contenedor">
<div class="indice">
{indice+1})
</div> 

<div class="col40 izquierda">
{direccion_txt}
</div>

<div class="col10">
{municipio}
</div>
<div class="col10">
{estado}
</div>
<div class="col10">
{telefono}
</div>
<div class="col10">
{correo}
</div>
</div>