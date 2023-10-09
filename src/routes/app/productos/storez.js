///     Este stores usara el paquete storez que cuenta con varias propiedades comodas como retrazar cambio , historial , undo etc

import { buscadores, productos,postData ,paginas_actuales} from "./../../stores"
import storez from "storez";
import { writable } from "svelte/store";
import { get } from 'svelte/store';



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
      activo
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