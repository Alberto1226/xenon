import { Pedido } from "../../../models/pedido";
import { Cliente } from "../../../models/cliente";
import { Pedimento } from "../../../models/pedimento";
import { ConfiguracionFiscal } from "../../../models/configuracion_fiscal";
import { Producto } from "../../../models/producto";
import { obtenerDatosFiscalesProducto } from "../../../services/validarConfiguracionFiscalProducto";
import { ConfiguracionFacturacion } from "../../../models/configuracion_facturacion";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const pedido = await Pedido.findById(req.body.pedido_id).lean().exec();
        if (!pedido) {
            return res.send({ ok: false, mensaje: "No se encontró el pedido" });
        }

        const cliente = pedido.cliente && pedido.cliente.id
            ? await Cliente.findById(pedido.cliente.id).lean().exec()
            : null;
        const configuracion = await ConfiguracionFiscal.findOne().select("ambiente").lean().exec();
        const configFacturacion = await ConfiguracionFacturacion.findOne().select("requerir_pedimentos").lean().exec();
        const requerirPedimentos = !!(configFacturacion && configFacturacion.requerir_pedimentos);
        const productoIds = (pedido.lista || [])
            .map(item => item.producto && item.producto._id)
            .filter(Boolean);
        const productosActuales = productoIds.length > 0
            ? await Producto.find({ _id: { $in: productoIds } })
                .select("sat_clave_prod_serv sat_clave_unidad sat_objeto_impuesto impuestos_venta")
                .lean()
                .exec()
            : [];
        const productosPorId = new Map(productosActuales.map(producto => [String(producto._id), producto]));
        const pedimentos = requerirPedimentos && productoIds.length > 0
            ? await Pedimento.find({ "productos.producto": { $in: productoIds } })
            .select("numero_pedimento productos.producto status")
            .sort({ fecha_pedimento: -1 })
            .lean()
            .exec()
            : [];
        const direccionFiscal = cliente && Array.isArray(cliente.direcciones_asociadas)
            ? cliente.direcciones_asociadas.find(direccion =>
                ["fiscal", "facturacion"].includes(String(direccion.tipo || "").toLowerCase())
            ) || {}
            : {};

        res.send({
            ok: true,
            pedido: {
                _id: pedido._id,
                folio: pedido.folio,
                total_pedido: pedido.total_pedido,
                moneda: pedido.moneda,
                facturacion: pedido.facturacion || [],
                lista: (pedido.lista || []).map((item, indice) => {
                    const fiscal = obtenerDatosFiscalesProducto(
                        item.producto,
                        item.producto && productosPorId.get(String(item.producto._id))
                    );
                    return {
                        indice,
                        cantidad: item.cantidad,
                        pedimento_origen: item.pedimento_origen,
                        producto: item.producto ? {
                            _id: item.producto._id,
                            nombre: item.producto.nombre,
                            codigo: item.producto.codigo,
                            precio: item.producto.precio,
                            ...fiscal
                        } : null
                    };
                })
            },
            cliente: cliente ? {
                nombre: cliente.nombre,
                correo: cliente.correo,
                datos_fiscales: cliente.datos_fiscales || {},
                direccion_fiscal: direccionFiscal,
                tipo_persona: direccionFiscal.tipo_persona || (cliente.datos_fiscales && cliente.datos_fiscales.tipo_persona) || ""
            } : null,
            preparacion_factura: pedido.preparacion_factura || null,
            requerir_pedimentos: requerirPedimentos,
            ambiente_facturacion: (configuracion && configuracion.ambiente) || "sandbox",
            pedimentos: pedimentos.map(pedimento => ({
                _id: pedimento._id,
                numero_pedimento: pedimento.numero_pedimento,
                status: pedimento.status,
                productos: (pedimento.productos || []).map(item => String(item.producto))
            }))
        });
    } catch (err) {
        console.error("Error al preparar datos de factura:", err);
        res.send({ ok: false, mensaje: "No se pudieron cargar los datos para facturar" });
    }
}
