


import * as accesos from "../accesos"
import {estados} from './jsons/estados';
import {municipios} from './jsons/municipios';
import {paises} from './jsons/paises';

export function post(req, res, next) {
    const estado_nombre = req.body.estado.nombre;
    const estado_id = obtener_estado_id(estado_nombre);
    if(estado_id===null) return res.send({ok:false,mensaje:'No se encontro el Municipio'})
    const lista_filtrada = municipios.filter(element=>element.estado_id ===estado_id)
    res.send({lista:lista_filtrada ,ok:true});
}




function obtener_estado_id(nombre) {
  let estado = estados.find(element => element.nombre === nombre);
  let temp;
  if (estado === null || estado === undefined || estado === '') {
    return null;
  }
  
  return estado.id;
}

