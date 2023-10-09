import { writable, get } from 'svelte/store';
import { goto } from '@sapper/app';
import { mensaje_bueno, mensaje_error } from './stores';

export const stores_productos = writable({

    usando_id: null,
    paqueteria_default: null,
    prueba: null

})



//      conf_mensajes = { exito: true, error: true, neutro: true };
export const http = {
    obtener: {
        solicitar: async function (datos = {}, ruta, storedesde) {
            //  
            //console.log(Producto.stores_productos);
            //console.log({ datos, ruta, store });
            //store.set(null);
            const resp = await postDataStatus(datos, ruta);
            //      SOLO DATOS CORRECTOS EN UN STATUS 200 PUEDEN SER GUARDADOS
            if (resp.status == 200) {
                var tmp = get(storedesde);
                tmp.paqueteria_default = resp.response
                storedesde.set(tmp);
                console.log("----");
                console.log(get(storedesde));
                console.log("----");
            }

            return new respuesta(resp);
            //  
        },
    },

}

export const Producto = {
    http: http,
}

export var respuesta = function (
    { status = null,
        response = null },
) {
    this.status = status;
    this.response = response;
    this.mensaje = response.mensaje;
    this.ok = status == 200;
    this.mensaje_bueno = mensaje_bueno;
    this.mensaje_error = mensaje_error;
    this.log = function () {
        console.log({ status: this.status, response: this.response })
    }

    return this
}



/// Post asyn usado en muchas partes
export async function postDataStatus(data = {}, ruta) {
    // Default options are marked with *
    console.log({ ruta });
    const response = await fetch(ruta.url, {
        method: ruta.metodo, // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: ruta.cache, // *default, no-cache, reload, force-cache, only-if-cached
        credentials: ruta.credentials, // include, *same-origin, omit
        headers: ruta.headers,
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *client
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    });

    return { response: await response.json(), status: response.status }; // parses JSON response into native JavaScript objects
}


export const RUTA = {
    producto: {
        cual_es_paqueteria_default: {
            url: 'api/productos/producto/paqueteria_default',
            modelo: 'Producto',
            metodo: 'POST',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
                // 'Content-Type': 'application/x-www-form-urlencoded',
            }
        }
        ,
        nuevo_registro: {
            url: 'api/productos/producto',
            modelo: 'Producto',
            metodo: 'POST',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
                // 'Content-Type': 'application/x-www-form-urlencoded',
            }
        }
    }
}


/*
nuevo_registro: {
            url: 'api/productos/producto',
            modelo:'producto',
            metodo: 'POST',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
                // 'Content-Type': 'application/x-www-form-urlencoded',
            }
        }

*/