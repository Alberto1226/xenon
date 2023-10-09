

import { Producto } from "../../../models/producto";
import * as accesos from "../../app/accesos"
import {categorias} from './../../../../static/json/categorias_arbol';
export async function post(req, res, next) {
   
    //  Checar si es correcto lo que se recibe
 
  
         res.send( {ok:true ,children:categorias});
    
}


