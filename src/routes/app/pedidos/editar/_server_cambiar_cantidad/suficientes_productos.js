

import {devolver_producto_db} from './devolver_producto_db';

export async function suficientes_productos(
    id_producto,
    necesarios) {
       
        const producto_proc = await devolver_producto_db(id_producto)
        if(producto_proc.ok ===false){
            return {ok:false}
        }
        const producto =producto_proc.producto ;
       const carritos = await producto.carritos;
       const existencias = producto.existencia.actual;
   // let total_reservado = 0;
    /*
    if (carritos.length == 0 || carritos == [""]) {
        total_reservado = 0;
        return existencias >= necesarios;
    }
    */
    
    let total_reservado = carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);

    let total_reservado_mas_necesarios = total_reservado + parseInt(necesarios);
    console.log({total_reservado});
    console.log({total_reservado_mas_necesarios});
    //console.log("existencias = " + existencias);
    //console.log('necesarios='+necesarios);
    const suficientes = ((+existencias - +total_reservado_mas_necesarios) >= 0);
    //console.log('suficientes='+suficientes + ' res= '+(+existencias - +total_reservado));


    return {suficientes,total_reservado,existencias,disponibles:existencias-total_reservado};
}
