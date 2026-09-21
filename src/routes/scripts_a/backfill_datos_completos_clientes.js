// Script de uso único: calcula datos_completos real para clientes existentes (backfill).
// Visitar una sola vez como administrador: GET /scripts_a/backfill_datos_completos_clientes
import { Cliente } from '../../models/cliente';
import { evaluar_datos_completos } from '../app/clientes/_datos_completos';
import * as accesos from '../app/accesos';

export async function get(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "requiere permisos administrativos" });
        return;
    }

    const clientes = await Cliente.find({});
    let actualizados = 0;
    let completos = 0;
    let incompletos = 0;

    for (const cliente of clientes) {
        const resultado = evaluar_datos_completos(cliente);
        if (cliente.datos_completos !== resultado.completos) {
            cliente.datos_completos = resultado.completos;
            await cliente.save();
            actualizados++;
        }
        if (resultado.completos) completos++;
        else incompletos++;
    }

    res.send({
        ok: true,
        total_clientes: clientes.length,
        actualizados,
        completos,
        incompletos,
    });
}
