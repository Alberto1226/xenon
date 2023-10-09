import {writable} from 'svelte/store';
import {postData} from './../../../stores';


export const lista = writable([]);
export const recargar_lista = writable(false);
export const buscando = writable("");
export const solicitud_selecta = writable(null);
export const viendo_lista_solicitudes = writable(true);
export const viendo_detalles_de_solicitud = writable(false);

export async function obtener_lista({buscando,activo}) {
    const url = "app/clientes_nuevos/lista_de_clientes_nuevos"
    return postData(url,{buscando,activo})
    .then((res)=>{
   
        return res 
    })
    .catch((err)=>{
        return {err,ok:false}
    })
}

export async function crear_nuevo({agente,perfil,cliente_nuevo_id,region}) {
    const url = "app/clientes_nuevos/guardar_cliente_nuevo"
    return postData(url,{agente,perfil,cliente_nuevo_id,region})
    .then((res)=>{
   
        return res 
    })
    .catch((err)=>{
        return {err,ok:false}
    })
}

export async function borrar({cliente_a_borrar_id}) {
    const url = "app/clientes_nuevos/borrar_registro"
    return postData(url,{cliente_a_borrar_id})
    .then((res)=>{
   
        return res 
    })
    .catch((err)=>{
        return {err,ok:false}
    })
}
/*
export const formulario = writable({
    nombre:'nombre',
    correo:'correo@hotm.com',
    fecha:'',
    telefono:'442136522',
    password:'123456789',
    password2:'123456789',
    calle:'calle tal ',
    entre_calle:"entre calle",
    y_calle:"y calle",
    no_ext:'no exteriro',
    no_int:'no interior',
    colonia:'colo',
    localidad:'local lidad',
    municipio:'Asientos',
    estado:'Aguascalientes',
    cp:'',
    paso_1_ok:false,
    paso_2_ok:false,
    actualizar_municipio:true,
    token:""
})
*/
