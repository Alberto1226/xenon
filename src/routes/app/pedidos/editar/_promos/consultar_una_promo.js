import {writable} from 'svelte/store';
import { postData } from "./../../../../stores";

export var producto_selecto =writable({nombre:''});

export const get_promocion = (id) => {
  
    return  postData("app/promociones/regresar_promocion", {        
        id
      })
        .then(async res => {   
          return res;
        })
        .catch(err => {
          console.log(err);
          return { ok: false, err };
          //http_ocupado = false;
        });
  }