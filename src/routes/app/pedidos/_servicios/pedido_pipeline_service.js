import { Carrito } from "../../../../models/carrito";
import { Pedido } from "../../../../models/pedido";
import { Carrito_cancelado } from "../../../../models/carrito_cancelado";
import { Cliente } from "../../../../models/cliente";
import { Ficha_de_descuento } from "../../../../models/ficha_de_descuento";
import { Usuario } from "../../../../models/usuario";
import * as accesos from "../../accesos";
import * as FolioService from "./folio_service";
import * as InventarioReservaService from "./inventario_reserva_service";

/**
 * Servicio Orquestador Central para el ciclo de vida del pedido.
 */

export async function crear_pedido(data, usuario, req) {
    try {
        const cliente_id = data.pedido_nuevo.cliente._id;
        const cliente_db = await Cliente.findById(cliente_id);
        if (!cliente_db) {
            return { ok: false, mensaje: "El cliente especificado no existe" };
        }

        // 1. Borrar ficha de descuento temporal si existiera y obtener flag
        let tenia_ficha = false;
        const ficha_doc = await Ficha_de_descuento.findOne({ 'cliente.id': cliente_id });
        if (ficha_doc) {
            await Ficha_de_descuento.findOneAndDelete({ 'cliente.id': cliente_id });
            tenia_ficha = true;
        }

        // 2. Generar Folio Atómico
        const folio_res = await FolioService.generar_siguiente_folio({ serie: "A" });
        if (!folio_res.ok) {
            return { ok: false, mensaje: "No se pudo obtener el folio único" };
        }
        const folio = folio_res.folio;

        // 3. Determinar Descuento
        const descuento_sin_ficha = (cliente_db.perfil && cliente_db.perfil.porcentaje !== undefined) ? cliente_db.perfil.porcentaje : 0;
        const descuento_final = tenia_ficha ? data.pedido_nuevo.descuento : descuento_sin_ficha;

        // 4. Determinar Agente
        let agente = { nombre: '', comision: 0, correo: '', id: '' };
        if (cliente_db.agente && cliente_db.agente.id) {
            const agente_db = await Usuario.findById(cliente_db.agente.id);
            if (agente_db) {
                agente = {
                    nombre: agente_db.nombre,
                    comision: agente_db.comision || 0,
                    correo: agente_db.correo || '',
                    id: agente_db._id
                };
            }
        }

        let cliente_tmp = {
            porcentaje: descuento_sin_ficha,
            perfil: (cliente_db.perfil && cliente_db.perfil.perfil) ? cliente_db.perfil.perfil.replace(' ', '') : 'Mayoreo'
        };

        let doc_nuevo = {
            folio,
            tenia_ficha,
            moneda: data.pedido_nuevo.moneda || 'Pesos Mexicanos',
            tipo_de_cambio: parseFloat(data.pedido_nuevo.tipo_de_cambio || 1),
            descuento: descuento_final,
            lista: [],
            fecha: new Date(),
            usuario_que_registro: {
                id: usuario._id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                usuario: usuario.usuario
            },
            total_pedido: 0,
            agente,
            cliente: {
                nombre: data.pedido_nuevo.cliente.nombre,
                id: cliente_id,
                correo: data.pedido_nuevo.cliente.correo,
                direccion: data.pedido_nuevo.cliente_direccion,
                perfil: cliente_tmp
            },
            status: "Pedido"
        };

        const nuevo_carrito = new Carrito(doc_nuevo);
        await nuevo_carrito.save();

        // Vincular el folio al carrito_id en la colección Folio
        await FolioService.vincular_folio_a_estado(folio, { tipo: 'carrito', id_destino: nuevo_carrito._id });

        // Registrar auditoría en Log
        await accesos.logActividad('pedido/nuevo', usuario, { folio: folio, id: nuevo_carrito._id }, req);

        return { ok: true, carrito_creado: { ok: true, doc_nuevo: nuevo_carrito } };
    } catch (err) {
        console.error("Error en crear_pedido pipeline:", err);
        return { ok: false, err, mensaje: "Error al crear el pedido" };
    }
}

export async function cambiar_status_basico(carrito_id, nuevo_status, usuario, req) {
    try {
        const carrito = await Carrito.findById(carrito_id);
        if (!carrito) return { ok: false, mensaje: "El pedido no existe" };

        carrito.status = nuevo_status;
        await carrito.save();

        await accesos.logActividad('cambio_status_pedidos/' + nuevo_status.toLowerCase().replace(' ', '_'), usuario, { folio: carrito.folio, id: carrito._id, status: nuevo_status }, req);

        return { ok: true, mensaje: "Status actualizado a " + nuevo_status };
    } catch (err) {
        console.error("Error en cambiar_status_basico:", err);
        return { ok: false, err };
    }
}

export async function cambiar_status_a_envio(carrito_id, opciones, usuario, req) {
    try {
        const carrito = await Carrito.findById(carrito_id);
        if (!carrito) return { ok: false, mensaje: "El pedido no existe" };

        if (carrito.status === "Envío") {
            return { ok: true, mensaje: "El pedido ya está en fase de Envío" };
        }

        // Ejecutar deducción física de inventario y snaplogs
        const res_descuento = await InventarioReservaService.descontar_fisico_inventario(carrito, req);
        if (!res_descuento.ok) {
            return { ok: false, mensaje: "Error al descontar el inventario físico" };
        }

        carrito.status = "Envío";
        carrito.procesando = false;
        await carrito.save();

        await accesos.logActividad("pedidos/cambiar_status_a_envio", usuario, { exito: true, folio: carrito.folio, id: carrito._id }, req);

        return { ok: true, mensaje: "Status cambiado a Envío e inventario afectado correctamente" };
    } catch (err) {
        console.error("Error en cambiar_status_a_envio:", err);
        return { ok: false, err };
    }
}

export async function cambiar_status_a_entregado(carrito_id, usuario, req) {
    try {
        const carrito = await Carrito.findById(carrito_id);
        if (!carrito) return { ok: false, mensaje: "El pedido no existe en carritos activos" };

        let pedido_temp = JSON.parse(JSON.stringify(carrito));
        pedido_temp.fecha_entregado = new Date();
        pedido_temp.status = 'Enviado';
        delete pedido_temp._id;
        delete pedido_temp.__v;

        const pedido_nuevo = new Pedido(pedido_temp);
        await pedido_nuevo.save();

        // Vincular folio en la colección Folio
        await FolioService.vincular_folio_a_estado(carrito.folio, { tipo: 'pedido', id_destino: pedido_nuevo._id });

        // Borrar de carritos activos
        await Carrito.findByIdAndDelete(carrito_id);

        await accesos.logActividad('cambio_status_pedidos/enviado', usuario, { folio: carrito.folio, idcarrito: carrito_id, idpedido: pedido_nuevo._id }, req);

        return { ok: true, mensaje: "Pedido entregado y trasladado al histórico" };
    } catch (err) {
        console.error("Error en cambiar_status_a_entregado:", err);
        return { ok: false, err };
    }
}

export async function cancelar_pedido(carrito_id, usuario, req) {
    try {
        const carrito = await Carrito.findById(carrito_id);
        if (!carrito) return { ok: false, mensaje: "El pedido no existe" };

        if (carrito.status === "Envío") {
            return { ok: false, mensaje: "El pedido no se puede cancelar en fase de Envío" };
        }

        // 1. Liberar reservas específicas en productos
        await InventarioReservaService.liberar_apartados_de_carrito(carrito._id, carrito.cliente ? carrito.cliente.id : null);

        // 2. Trasladar a colección de cancelados
        let carrito_temp = JSON.parse(JSON.stringify(carrito));
        let id_original = carrito_temp._id;
        delete carrito_temp._id;
        delete carrito_temp.__v;

        let carrito_cancelado = new Carrito_cancelado(carrito_temp);
        carrito_cancelado.status = 'Cancelado';
        carrito_cancelado.fecha_de_cancelacion = new Date();
        carrito_cancelado.notas = (carrito_cancelado.notas || '') + ` | Cancelado por: ` + usuario.usuario;
        await carrito_cancelado.save();

        // 3. Vincular folio
        await FolioService.vincular_folio_a_estado(carrito.folio, { tipo: 'cancelado', id_destino: carrito_cancelado._id });

        // 4. Borrar de carritos activos
        await Carrito.findByIdAndDelete(id_original);

        await accesos.logActividad('carrito/cancelar/', usuario, { folio: carrito.folio, Carrito: carrito.lista, Cliente: carrito.cliente }, req);

        return { ok: true, mensaje: "Pedido cancelado exitosamente" };
    } catch (err) {
        console.error("Error en cancelar_pedido:", err);
        return { ok: false, err };
    }
}
