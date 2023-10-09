//      Funcion para frontend unicamente
//      

import { postData } from "./../../../../stores";
export async function obtener_analisis_promos_de_carrito(id) {
  
    return  postData("app/pedidos/devolver_analisis_promos_pedido", {        
        id
      })
        .then( res => {
          console.log("acaaa------------------------->");
          return {ok:true,resumen:res};
        })
        .catch(err => {
          console.log(err);
          return { ok: false, err };
          //http_ocupado = false;
        });
  }