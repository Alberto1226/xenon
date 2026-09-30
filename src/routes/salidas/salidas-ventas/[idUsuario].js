import { SalidasVentas } from "../../../models/salidasventas";
import { Carrito } from "../../../models/carrito";
import { Rutas } from "../../../models/rutas";
import { Cliente } from "../../../models/cliente";
import mongoose from "mongoose";

export async function get(req, res) {
    try {
        const { idUsuario } = req.params;
        let isValidId = mongoose.Types.ObjectId.isValid(idUsuario);
        let userObjId = isValidId ? new mongoose.Types.ObjectId(idUsuario) : null;

        // 1. Obtener salidas registradas en SalidasVentas asignadas al usuario/agente
        let salidas = isValidId ? await SalidasVentas.find({
            $or: [
                { id_usuario: idUsuario },
                { id_usuario: userObjId },
                { 'agente.id': idUsuario },
                { 'agente.id': userObjId }
            ],
            status: { $nin: ['Cancelado', 'Finalizada', 'Terminada'] }
        }).lean() : [];

        // 2. Obtener carritos de ruta asignados al agente / usuario
        let carritosAgente = isValidId ? await Carrito.find({
            rutas: true,
            $or: [
                { 'agente.id': idUsuario },
                { 'agente.id': userObjId },
                { 'usuario_que_registro.id': idUsuario },
                { 'usuario_que_registro.id': userObjId }
            ],
            status: { $nin: ['Cancelado', 'Finalizada', 'Terminada', 'Empaque', 'Entregado'] }
        }) : [];

        // Marcar estatus 'En Ruta' en la BD Web para bloquear edición de productos en la web
        for (let c of carritosAgente) {
            if (c.status === 'Pedido') {
                c.status = 'En Ruta';
                await c.save();
            }
        }
        carritosAgente = carritosAgente.map(c => c.toObject());

        let resultado = [];
        let carritosProcesados = new Set();

        // Procesar salidas en SalidasVentas
        for (let salida of salidas) {
            if (['Finalizada', 'Terminada', 'Cancelado'].includes(salida.status)) continue;

            let carritoObj = await Carrito.findById(salida.id_carritos).lean();

            // Si el carrito se eliminó o su estatus está cancelado/finalizado, omitir la salida
            if (!carritoObj) continue;
            if (['Cancelado', 'Finalizada', 'Terminada'].includes(carritoObj.status)) continue;

            let rutaObj = await Rutas.findById(salida.id_ruta).lean();

            if (!rutaObj && carritoObj && carritoObj.ruta && carritoObj.ruta.id) {
                rutaObj = await Rutas.findById(carritoObj.ruta.id).lean();
            }

            if (!rutaObj) {
                rutaObj = {
                    _id: salida.id_ruta || "default_ruta",
                    nombre_ruta: (carritoObj && carritoObj.ruta && carritoObj.ruta.nombre) ? carritoObj.ruta.nombre : "Ruta Principal",
                    descripcion: "Ruta asignada",
                    ids_clientes: []
                };
            }

            let clientesDetalle = [];
            if (rutaObj && rutaObj.ids_clientes && rutaObj.ids_clientes.length > 0) {
                let validClienteIds = rutaObj.ids_clientes
                    .filter(id => id && mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
                if (validClienteIds.length > 0) {
                    clientesDetalle = await Cliente.find({ _id: { $in: validClienteIds } }).lean();
                }
            }
            rutaObj.clientes = clientesDetalle;

            carritosProcesados.add(String(carritoObj._id));

            let usuarioObj = {
                id: (carritoObj && carritoObj.agente && carritoObj.agente.id) ? carritoObj.agente.id : idUsuario,
                nombre: (carritoObj && carritoObj.agente && carritoObj.agente.nombre) ? carritoObj.agente.nombre : "Agente"
            };

            resultado.push({
                _id: salida._id,
                id_ruta: salida.id_ruta || (rutaObj ? rutaObj._id : null),
                id_carritos: salida.id_carritos,
                folio_salida: salida.folio_salida || (carritoObj ? String(carritoObj.folio_salida || carritoObj.folio) : "SALIDA"),
                fecha_salina: salida.fecha_salina || new Date(),
                status: salida.status || "Activa",
                usuario: usuarioObj,
                clientes: clientesDetalle,
                ruta: rutaObj,
                carrito: carritoObj
            });
        }

        // Para carritos de ruta que aún no tengan registro explícito en SalidasVentas
        for (let carrito of carritosAgente) {
            if (carritosProcesados.has(String(carrito._id))) continue;
            if (['Cancelado', 'Finalizada', 'Terminada'].includes(carrito.status)) continue;

            let rutaObj = null;
            if (carrito.ruta && carrito.ruta.id) {
                rutaObj = await Rutas.findById(carrito.ruta.id).lean();
            }
            if (!rutaObj && carrito.ruta && carrito.ruta.nombre) {
                rutaObj = await Rutas.findOne({ nombre_ruta: carrito.ruta.nombre }).lean();
            }
            if (!rutaObj) {
                rutaObj = await Rutas.findOne({}).lean();
            }
            if (!rutaObj) {
                rutaObj = {
                    _id: "default_ruta",
                    nombre_ruta: (carrito.ruta && carrito.ruta.nombre) ? carrito.ruta.nombre : "Ruta Principal",
                    descripcion: "Ruta asignada",
                    ids_clientes: []
                };
            }

            let clientesDetalle = [];
            if (rutaObj && rutaObj.ids_clientes && rutaObj.ids_clientes.length > 0) {
                let validClienteIds = rutaObj.ids_clientes
                    .filter(id => id && mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
                if (validClienteIds.length > 0) {
                    clientesDetalle = await Cliente.find({ _id: { $in: validClienteIds } }).lean();
                }
            }
            rutaObj.clientes = clientesDetalle;

            let usuarioObj = {
                id: (carrito.agente && carrito.agente.id) ? carrito.agente.id : idUsuario,
                nombre: (carrito.agente && carrito.agente.nombre) ? carrito.agente.nombre : "Agente"
            };

            resultado.push({
                _id: carrito._id,
                id_ruta: rutaObj._id,
                id_carritos: carrito._id,
                folio_salida: carrito.folio_salida || String(carrito.folio),
                fecha_salina: carrito.fecha || new Date(),
                status: "Activa",
                usuario: usuarioObj,
                clientes: clientesDetalle,
                ruta: rutaObj,
                carrito: carrito
            });
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(resultado));
    } catch (err) {
        console.error("Error en GET /salidas/salidas-ventas/:idUsuario:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, mensaje: err.message }));
    }
}
