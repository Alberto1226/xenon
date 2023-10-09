//    Funcion e para frontend para solicitar una promocion
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