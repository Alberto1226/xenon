

import {Producto} from "../../../models/producto";
import * as accesos from "../accesos"
import { pedidos } from "../../stores";

export function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
  
    var producto = req.user;
    if(producto==null)return;
    //console.log("id usuairo = ",producto._id);    //  producto:{$ne: req.user.producto},  que no sea el mismo
    var query = {}
    Producto.find(query).sort({nombre: 1})
    .then((resDB)=>{
        res.send({ok:true,lista: resDB});
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false, mensaje:"error al buscar resultados."});
    })
    
}

function reorganizar_para_array_rapido(lista){
    return new Promise((resolve,reject)=>{
        if(lista.length===0) return resolve();
        let lista_nueva = [];
        for (let i = 0; i < lista.length; i++) {
            const element = lista[i];
            lista_nueva.push()
        }
    })
}



//rapido va a ser solo para los pedidos, asi se van a encontrar rapido los resultados
