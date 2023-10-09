
//import {Usuario} from "../../../models/usuario";
var passport = require('passport');
import {estados} from './estados'
import {municipios} from './municipios'
import {paises} from './paises'
import {productos} from './productos'
import {medidas} from './medidas'
import {imagenes} from './imagenes'
import {Producto} from '../../../models/producto';
export async function get(req,res,next){
    
    let productos_tmp = JSON.parse(JSON.stringify(productos));
    let respuesta_txt=''
    let arreglo =[];
    let contador={
        exito:0,error:0
    }
    let total = productos_tmp.length;
   //console.log('total='+total)
    //let total = 3
    for (let i = 0; i < total; i++) {
        const producto = productos_tmp[i];
       // console.log(i)
        let nuevo_producto = await constructor(producto);
        arreglo.push(nuevo_producto)
      // console.log(nuevo_producto.nombre)
        respuesta_txt +='<div>'+ i+')'+ JSON.stringify(nuevo_producto)  +'</div><br>';
        //let proceso = await guardar_producto(nuevo_producto)       
       // if(proceso.ok)contador.exito++;
       // else contador.error++;
        if(i+1==total){
           //console.log(contador);            
            return res.send(respuesta_txt);
        }       
    }
}

async function constructor(producto){
    return new Promise((resolve)=>{
        var nuevo_producto ={
            aplicar_descuento_distribuidor :producto.aplica_perfil==='si',
            caracteristicas_tecnicas:[],
            carritos:[],
            categoria:'',
            codigo:producto.codigo,
            descripcion:producto.descripcion,
            existencia:{
                actual:0,
                minimo:0,
                maximo:100000,
            },
            galeria_imagenes:[convertir_imagen(producto.id_producto)],
            marca:convertir_marca(producto.id_marca),
            medida:convertir_medida(producto.id_medida),
            nombre:producto.nombre,
            para_venta_publico:producto.tipo == "venta",
            precio:parseFloat(producto.precio),
            unidad:convertir_unidad(producto.id_unidad),
            uid_previo:producto.id_producto
        }
        resolve(nuevo_producto);
    })
}

function guardar_producto(producto_nuevo) {
    return new Promise((resolve,reject)=>{
        let producto_nuevo_tmp = new Producto(producto_nuevo);
        producto_nuevo_tmp.save()
        .then(()=>{
          resolve({ok:true});
          return
        })
        .catch((err)=>{
            console.log(err);
            reject({ok:false});
            return;
        })
    })
}

function convertir_unidad(id) {
    switch (id) {
      case "1":
        return "Pieza";
        break;
      case "2":
        return "Caja";
        break;
      case "3":
        return "Par";
        break;
      case "4":
        return "Paquetería";
        break;
      case "5":
        return "Millar";
        break;  
      default:
        return "Pieza";
        break;
    }
  }
  
  function convertir_marca(numero) {
    switch (numero) {
      case "1":
        return "Puma Security";
        break;
      case "2":
        return "Star Watt";
        break;
      case "3":
        return "Carbon Xenon";
        break;
      case "6":
        return "Carbon Audio";
        break;
      case "7":
        return "Sixty";
        break;
      case "8":
        return "Carbon Led";
        break;  
      case "14":
        return "Kompak";
        break;
      case "15":
        return "Vision2";
        break;
      case "16":
        return "Osram";
        break;
      case "17":
        return "Denka";
        break;
      case "18":
        return "Sixty C6";
        break;  
      default:
        return "Carbon Audio";
        break;
    }
  }
  

function convertir_medida(id_medida) {
    let medida = medidas.find(element=> element.id_medida === id_medida);
    let temp ;
    if(medida===null || medida === undefined){
        temp ={
            medidas:{
                medida:'',
                categoria:'',
                bajas:'',
                wattaje:'',
           }
        }
        return temp
    }
    temp ={
        medidas:{
            medida:medida.medida,
            categoria:medida.categoria,
            bajas:medida.bajas,
            wattaje:medida.wattaje,
       }
    }
    return temp
}


function convertir_imagen(id_producto) {
    let imagen = imagenes.find(element=> element.id_producto === id_producto);
    let temp ;
    if(imagen===null || imagen === undefined || imagen===''){
        temp =null
        return temp
    }
    
    
    temp = 'productos/'+imagen.imagen
    return temp
}