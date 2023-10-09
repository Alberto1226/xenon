import {writable} from 'svelte/store';
import {postData} from './../../../stores';



export const recargar_lista = writable(false)
export async function mandar_a_historicos(id) {
    const url = "app/pedidos/publicos/mandar_a_historicos"
    return postData(url,{id})
    .then((res)=>{
   
        return res 
    })
    .catch((err)=>{
        return {err,ok:false}
    })
}

