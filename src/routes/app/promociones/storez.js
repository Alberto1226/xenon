///     Este stores usara el paquete storez que cuenta con varias propiedades comodas como retrazar cambio , historial , undo etc

import { buscadores, productos,postData ,paginas_actuales} from "./../../stores"
import storez from "storez";
import { writable } from "svelte/store";
import { get } from 'svelte/store';

export const promocion_nueva=writable({
  producto:null,
  regla_selecta:0,
  precio_promo:0,
  condiciones:[],
  
})

export const recargar_lista = writable(false);
export const storeWithDebounce = storez("", { debounce: 1000 });
export const pagina_actual = writable(1);


export var accion_buscar = writable({ valor: false });

const myStore = storez("my value");

const dispose = myStore.subscribe((newVal, oldVal) => {
  //console.log(`'${oldVal}' has been changed to '${newVal}'`);
});

myStore.set("changed value"); // console output: 'my value' has been changed to 'changed value'


export const get_productos = (buscar,pagina_actual,activo) => {
  return new Promise((resolver, rechazar) => {
    postData("app/productos/lista_de_productos", {
      buscando: buscar,
      pagina_actual: pagina_actual,
      activo:true
    })
      .then(async res => {
        resolver(res)
        return;
      })
      .catch(err => {
        console.log(err);
        return rechazar({ ok: false, err });
        //http_ocupado = false;
      });
  })
}



export const get_producto = (id) => {
  
  return  postData("app/productos/regresar_producto", {
      
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


/*
/*
//      PArametros que espera este serivicio
    
    const id= body.producto.id;
    const precio_promo= body.producto.precio_promo;
    const tipo_condicion= body.tipo_condicion;
    const condiciones= body.condiciones;
*/

export const guardar_promo_nueva = (producto , precio_promo ,tipo_condicion , condiciones) => {
  
  return  postData("app/promociones/nueva/promo_nueva", {
    producto , precio_promo ,tipo_condicion , condiciones
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



export const borrar_promo = (id_promocion ,id_producto) => {
  
  return  postData("app/promociones/borrar_una", {
    id_promocion ,id_producto
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


export const lista_productos_con_promo =writable([]);

export const get_productos_con_promo = (buscar,pagina_actual,activo) => {
  return new Promise((resolver, rechazar) => {
    postData("app/promociones/lista", {
      buscando: buscar,
      pagina_actual: pagina_actual,
      activo:true
    })
      .then(async res => {
        resolver(res)
        return;
      })
      .catch(err => {
        console.log(err);
        return rechazar({ ok: false, err });
        //http_ocupado = false;
      });
  })
}