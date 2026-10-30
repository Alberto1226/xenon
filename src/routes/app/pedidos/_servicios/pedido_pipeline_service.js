import { Carrito } from "../../../../models/carrito";
import { Pedido } from "../../../../models/pedido";
import { Carrito_cancelado } from "../../../../models/carrito_cancelado";
import { Cliente } from "../../../../models/cliente";
import { Producto } from "../../../../models/producto";
import { Ficha_de_descuento } from "../../../../models/ficha_de_descuento";
import { Usuario } from "../../../../models/usuario";
import { SalidasVentas } from "../../../../models/salidasventas";
import * as accesos from "../../accesos";
import * as FolioService from "./folio_service";
import * as InventarioReservaService from "./inventario_reserva_service";
import { snap_por_cambio_en_pedido } from "../editar/_producto_snaplogs/snap_por_cambio_en_pedido";

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
        let agente = { nombre: '', comision: 0, correo: '', id: null };
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

const STATUS_NIVELES = {
    'Pedido': 1,
    'Ficha pago': 2,
    'Ficha Pago': 2,
    'Pagado': 3,
    'Empaque': 4,
    'Envío': 5,
    'Envio': 5,
    'Entregado': 6
};

export async function cambiar_status_basico(carrito_id, nuevo_status, usuario, req) {
    try {
        const carrito = await Carrito.findById(carrito_id);
        if (!carrito) return { ok: false, mensaje: "El pedido no existe" };

        const es_de_ruta = !!(carrito.rutas || (carrito.cliente && (carrito.cliente.id == "" || carrito.cliente.id == null || !carrito.cliente.nombre)) || carrito.folio_salida || carrito.ruta);

        if (es_de_ruta && (carrito.status === "En Ruta" || carrito.status === "En ruta")) {
            return {
                ok: false,
                mensaje: `El pedido de ruta está en estatus "${carrito.status}" y no se puede modificar desde la web.`
            };
        }

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

/**
 * Traslada el carrito al histórico (colección Pedido) y lo elimina de carritos activos.
 *
 * PROBLEMA ORIGINAL:
 * Esta función nunca llamaba a `liberar_apartados_de_carrito`. Dado que el
 * descuento de inventario ocurre en `cambiar_status_a_envio`, se assumía que
 * para este punto ya no había reservas en `producto.carritos`. Pero si
 * `cambiar_status_a_envio` había tenido un fallo parcial (ej. el $pull de 1
 * producto falló silenciosamente por disparidad ObjectId/String), la reserva
 * seguía en `producto.carritos`. Al ejecutar `Carrito.findByIdAndDelete()`,
 * el carrito desaparecía y la reserva quedaba huérfana permanentemente
 * (el caso del CONECTOR 2F1M, folio #29369).
 *
 * CORRECCIÓN:
 * Se agrega `liberar_apartados_de_carrito(carrito)` como RED DE SEGURIDAD
 * ANTES de borrar el carrito. Esto garantiza que:
 *   - Si `cambiar_status_a_envio` funcionó perfectamente: liberar encuentra
 *     cero reservas y termina sin hacer nada (inofensivo).
 *   - Si `cambiar_status_a_envio` dejó reservas residuales: se limpian aquí
 *     antes de que el carrito desaparezca, evitando huérfanos permanentes.
 *
 * El `liberar` se envuelve en su propio try/catch para que, si falla por
 * alguna razón, el flujo de entrega no quede bloqueado (el pedido debe
 * trasladarse al histórico de cualquier manera).
 *
 * @param {string|ObjectId} carrito_id
 * @param {Object} usuario
 * @param {Object} req
 */
// Bloqueos en memoria para prevenir peticiones concurrentes/doble-clic sobre el mismo pedido
const pedidos_en_cancelacion = new Set();
const pedidos_en_entrega = new Set();

export async function cambiar_status_a_entregado(carrito_id, usuario, req) {
    if (!carrito_id) return { ok: false, mensaje: "carrito_id es requerido" };
    const id_str = String(carrito_id);

    if (pedidos_en_entrega.has(id_str)) {
        return { ok: false, mensaje: "El pedido ya se está finalizando en este momento. Por favor espere." };
    }
    pedidos_en_entrega.add(id_str);

    try {
        const carrito = await Carrito.findById(carrito_id);
        if (!carrito) return { ok: false, mensaje: "El pedido no existe en carritos activos" };

        let pedido_temp = JSON.parse(JSON.stringify(carrito));
        pedido_temp.fecha_entregado = new Date();
        pedido_temp.status = 'Enviado';
        delete pedido_temp._id;
        delete pedido_temp.__v;

        // Datos legados pueden traer id de agente/cliente como string vacío en vez de null,
        // lo cual revienta el cast a ObjectId de Mongoose al crear el Pedido.
        if (pedido_temp.agente && pedido_temp.agente.id === '') pedido_temp.agente.id = null;
        if (pedido_temp.cliente && pedido_temp.cliente.id === '') pedido_temp.cliente.id = null;
        if (pedido_temp.usuario_que_registro && pedido_temp.usuario_que_registro.id === '') pedido_temp.usuario_que_registro.id = null;

        const pedido_nuevo = new Pedido(pedido_temp);
        await pedido_nuevo.save();

        // Vincular folio en la colección Folio
        await FolioService.vincular_folio_a_estado(carrito.folio, { tipo: 'pedido', id_destino: pedido_nuevo._id });

        // RED DE SEGURIDAD: liberar reservas residuales ANTES de borrar el carrito.
        // Si cambiar_status_a_envio dejó alguna reserva sin limpiar (por disparidad de
        // tipos ObjectId/String en MongoDB), este paso las elimina antes de que el
        // carrito desaparezca y las reservas queden huérfanas permanentemente.
        // Soporta: carrito_id como ObjectId y String, folio como Number y String.
        try {
            await InventarioReservaService.liberar_apartados_de_carrito(carrito);
        } catch (eLiberar) {
            console.error('cambiar_status_a_entregado: Error al liberar reservas residuales (no crítico):', eLiberar);
        }

        // Borrar de carritos activos (el liberar ya corrió, no habrá huérfanos)
        await Carrito.findByIdAndDelete(carrito_id);

        try {
            await accesos.logActividad('cambio_status_pedidos/enviado', usuario, { folio: carrito.folio, idcarrito: carrito_id, idpedido: pedido_nuevo._id }, req);
        } catch (eLog) {
            console.error('cambiar_status_a_entregado: Error no crítico en logActividad:', eLog);
        }

        return { ok: true, mensaje: "Pedido entregado y trasladado al histórico" };
    } catch (err) {
        console.error("Error en cambiar_status_a_entregado:", err);
        return { ok: false, mensaje: err.message || "Error al trasladar el pedido al histórico", err };
    } finally {
        pedidos_en_entrega.delete(id_str);
    }
}

export async function cancelar_pedido(carrito_id, usuario, req, opciones = {}) {
    if (!carrito_id) return { ok: false, mensaje: "ID de pedido no especificado" };
    const id_str = String(carrito_id);

    // 1. Bloqueo en memoria: si ya hay una petición cancelando este carrito, rechazar inmediatamente
    if (pedidos_en_cancelacion.has(id_str)) {
        return { ok: false, mensaje: "El pedido ya se está cancelando en este momento. Por favor espere." };
    }
    pedidos_en_cancelacion.add(id_str);

    let status_original = null;

    try {
        // 2. Bloqueo atómico a nivel base de datos:
        // Marcamos atómicamente el status como 'Cancelando' para evitar que otra instancia o hilo lo tome en paralelo
        const carrito = await Carrito.findOneAndUpdate(
            {
                _id: carrito_id,
                status: { $nin: ['Cancelando', 'Cancelado', 'Pagado', 'Empaque', 'Envío', 'Envio', 'En Ruta', 'Entregado', 'Finalizada'] }
            },
            {
                $set: { status: 'Cancelando' }
            },
            { new: false } // retorna documento antes de actualizar
        );

        if (!carrito) {
            const existe = await Carrito.findById(carrito_id).lean();
            if (!existe) {
                // Verificar si ya fue cancelado y está en Carrito_cancelado
                const ya_cancelado = await Carrito_cancelado.findOne({
                    $or: [
                        { _id: carrito_id },
                        { "folio": opciones.folio || null }
                    ]
                }).lean();
                if (ya_cancelado) {
                    return { ok: false, mensaje: "Este pedido ya fue cancelado previamente" };
                }
                return { ok: false, mensaje: "El pedido no existe o ya fue procesado" };
            }
            if (existe.status === 'Cancelando') {
                return { ok: false, mensaje: "El pedido ya se está cancelando en este momento" };
            }
            return { ok: false, mensaje: `El pedido no se puede cancelar en estatus ${existe.status}` };
        }

        status_original = carrito.status;

        // 3. Verificar si ya existe en Carrito_cancelado para evitar duplicados en la colección de cancelados
        if (carrito.folio != null) {
            const ya_en_cancelados = await Carrito_cancelado.findOne({ folio: carrito.folio }).lean();
            if (ya_en_cancelados) {
                // Ya existe registro de cancelación; borrar el carrito activo residual y liberar
                await Carrito.findByIdAndDelete(carrito._id).catch(() => { });
                await InventarioReservaService.liberar_apartados_de_carrito(carrito).catch(() => { });
                return { ok: true, mensaje: "El pedido ya había sido cancelado previamente" };
            }
        }

        // 4. Liberar reservas específicas en productos y generar snaplog '4d'
        if (Array.isArray(carrito.lista)) {
            const cliente_id_final = carrito.cliente ? (carrito.cliente.id || carrito.cliente._id || null) : null;
            const cliente_nombre_final = carrito.cliente ? (carrito.cliente.nombre || 'Cliente') : 'Cliente';
            const usuario_snap = usuario ? { nombre: usuario.nombre || usuario.usuario || 'Sistema', id: usuario._id || usuario.id || null } : { nombre: 'Sistema', id: null };

            for (let item of carrito.lista) {
                if (item.producto && item.producto._id) {
                    try {
                        const prod_db = await Producto.findById(item.producto._id).lean();
                        if (prod_db) {
                            await snap_por_cambio_en_pedido(
                                { nombre: prod_db.nombre, id: prod_db._id },
                                usuario_snap,
                                0, // Nueva cantidad
                                item.cantidad || 0, // Cantidad anterior
                                "4d", // Acción 4d: Borrado de pedido completo
                                { folio: carrito.folio, cliente: { nombre: cliente_nombre_final, id: cliente_id_final } },
                                prod_db
                            );
                        }
                    } catch (eSnap) {
                        console.error("Error en snaplog 4d durante cancelación:", eSnap);
                    }
                }
            }
        }

        // 5. Liberar apartados en inventario
        await InventarioReservaService.liberar_apartados_de_carrito(carrito);

        // 6. Trasladar a colección de cancelados
        let carrito_temp = JSON.parse(JSON.stringify(carrito));
        let id_original = carrito_temp._id;
        delete carrito_temp._id;
        delete carrito_temp.__v;

        let carrito_cancelado = new Carrito_cancelado(carrito_temp);
        carrito_cancelado.status = 'Cancelado';
        carrito_cancelado.fecha_de_cancelacion = new Date();
        carrito_cancelado.notas = (carrito_cancelado.notas || '') + ` | Cancelado por: ` + ((usuario && usuario.usuario) ? usuario.usuario : ((usuario && usuario.nombre) ? usuario.nombre : 'Sistema'));
        await carrito_cancelado.save();

        // 7. Vincular folio
        await FolioService.vincular_folio_a_estado(carrito.folio, { tipo: 'cancelado', id_destino: carrito_cancelado._id });

        // 8. Borrar de carritos activos
        await Carrito.findByIdAndDelete(id_original);

        try {
            await accesos.logActividad('carrito/cancelar/', usuario, { folio: carrito.folio, Carrito: carrito.lista, Cliente: carrito.cliente }, req);
        } catch (eLog) {
            console.error('cancelar_pedido: Error no crítico en logActividad:', eLog);
        }

        // 9. Cancelar SalidasVentas asociadas si es un pedido de ruta
        if (opciones.ruta) {
            try {
                await SalidasVentas.updateMany(
                    { "id_carritos": carrito._id.toString() },
                    { $set: { status: "Cancelado" } }
                );
            } catch (eSalidas) {
                console.error("Error al cancelar SalidasVentas asociadas:", eSalidas);
            }
        }

        return { ok: true, mensaje: "Pedido cancelado exitosamente" };

    } catch (err) {
        console.error("Error en cancelar_pedido:", err);
        // Si falló antes de completarse, restaurar el estatus original para evitar dejar el pedido trabado en 'Cancelando'
        if (status_original) {
            await Carrito.updateOne({ _id: carrito_id }, { $set: { status: status_original } }).catch(() => { });
        }
        return { ok: false, mensaje: err.message || "Error al cancelar el pedido", err };
    } finally {
        pedidos_en_cancelacion.delete(id_str);
    }
}
