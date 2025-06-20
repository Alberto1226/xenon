import * as accesos from "../accesos";
import * as mongoose from 'mongoose';
import { Pedido } from "../../../models/pedido";

export async function post(req, res, next) {
    console.log("Datos del reporte general", req.body);
    let NumRegistros = req.body.NumRegistros;
    let FechaInicio = req.body.FechaInicio;
    let FechaFin = req.body.FechaFin;
    let cliente_id = req.body.cliente_id;
    let agente_id = req.body.agente_id;
    let usuario = req.body.usuario;

    let resultados = [];

    // const match = {};
    const match = { precio_unitario: { $gt: 4500 } };
    if (FechaInicio && FechaFin) {
        match.fecha = { $gte: new Date(FechaInicio), $lte: new Date(FechaFin) };
    }
    if (cliente_id) {
        match["cliente.id"] = cliente_id;
    }
    if (agente_id) {
        match["agente.id"] = agente_id;
    }

    const pipeline = [
        {
            $project: {
                tipo: { $literal: "Pedido" },
                lista: 1,
                fecha: "$fecha_entregado",
                cliente: 1,
                usuario_que_registro: 1,
                agente: 1,
                total_pedido: 1,
                status: 1,
                folio: 1
            }
        },
        { $unwind: "$lista" },
        {
            $project: {
                tipo: 1,
                fecha: 1,
                producto_id: "$lista.producto._id",
                producto: "$lista.producto.nombre",
                // codigo: "$lista.producto.codigo",
                cantidad: "$lista.cantidad",
                precio_unitario: "$lista.producto.precio",
                total: { $multiply: ["$lista.cantidad", "$lista.producto.precio"] },
                cliente: "$cliente.nombre",
                cliente_id: "$cliente.id",
                usuario_nombre: "$usuario_que_registro.nombre",
                usuario: "$usuario_que_registro.usuario",
                agente: "$agente.nombre",
                status: 1,
                folio: 1
            }
        },
        { $match: match }
    ];

    console.log("Pipeline de agregación:", JSON.stringify(pipeline, null, 2));

    try {
        // resultados = await Pedido.aggregate(pipeline).limit(NumRegistros || 100);
        resultados = await Pedido.aggregate(pipeline);
        res.status(200).send({
            ok: true,
            mensaje: "Datos del reporte general obtenidos correctamente",
            resultados: resultados,
            total: resultados.length
        });
    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).send({ ok: false, mensaje: "Ocurrió un error al obtener los datos del reporte", error });
        return;
    }
}