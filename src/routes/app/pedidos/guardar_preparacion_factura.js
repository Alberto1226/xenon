import { Pedido } from "../../../models/pedido";
import { Producto } from "../../../models/producto";
import { Pedimento } from "../../../models/pedimento";
import { esCombinacionFiscalValida } from "../../../services/catalogosFiscales";
import { obtenerDatosFiscalesProducto, validarConfiguracionFiscalProducto } from "../../../services/validarConfiguracionFiscalProducto";
import { ConfiguracionFacturacion } from "../../../models/configuracion_facturacion";
import * as accesos from "../accesos";

const formasPago = new Set([
    "01", "02", "03", "04", "05", "06", "08", "12", "13", "14", "15",
    "17", "23", "24", "25", "26", "27", "28", "29", "30", "31", "99"
]);
const metodosPago = new Set(["PUE", "PPD"]);

function textoValido(valor, longitudMaxima) {
    return typeof valor === "string" && valor.trim().length > 0 && valor.trim().length <= longitudMaxima;
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { pedido_id, receptor, metodo_pago, forma_pago, conceptos } = req.body;
        if (!receptor || !Array.isArray(conceptos) || !metodosPago.has(metodo_pago) || !formasPago.has(forma_pago)) {
            return res.send({ ok: false, mensaje: "Completa los datos fiscales y de pago requeridos" });
        }
        if (
            !textoValido(receptor.rfc, 13) ||
            !textoValido(receptor.nombre, 254) ||
            !/^\d{5}$/.test(String(receptor.codigo_postal || "")) ||
            !["FISICA", "MORAL"].includes(receptor.tipo_persona) ||
            !esCombinacionFiscalValida(receptor.tipo_persona, receptor.uso_cfdi, receptor.regimen_fiscal)
        ) {
            return res.send({ ok: false, mensaje: "Verifica RFC, razón social, código postal y claves fiscales" });
        }

        const pedido = await Pedido.findById(pedido_id).exec();
        if (!pedido) {
            return res.send({ ok: false, mensaje: "No se encontró el pedido" });
        }
        if (pedido.facturacion && pedido.facturacion.length > 0) {
            return res.send({ ok: false, mensaje: "No se puede modificar la preparación de un pedido que ya tiene factura." });
        }
        if (pedido.preparacion_factura && ["emitiendo", "requiere_revision", "emitida"].includes(pedido.preparacion_factura.estado)) {
            return res.send({ ok: false, mensaje: "La factura está en proceso o requiere revisión; no modifiques ni vuelvas a emitir hasta verificar su estado en CUCC." });
        }
        if (!Array.isArray(pedido.lista) || conceptos.length !== pedido.lista.length) {
            return res.send({ ok: false, mensaje: "Los conceptos no coinciden con los productos del pedido" });
        }
        const productoIds = pedido.lista.map(item => item.producto && item.producto._id).filter(Boolean);
        const productosActuales = await Producto.find({ _id: { $in: productoIds } })
            .select("sat_clave_prod_serv sat_clave_unidad sat_objeto_impuesto impuestos_venta")
            .lean()
            .exec();
        const productosPorId = new Map(productosActuales.map(producto => [String(producto._id), producto]));

        const configFacturacion = await ConfiguracionFacturacion.findOne().select("requerir_pedimentos").lean().exec();
        const requerirPedimentos = !!(configFacturacion && configFacturacion.requerir_pedimentos);

        const conceptosGuardados = [];
        for (let indice = 0; indice < pedido.lista.length; indice++) {
            const concepto = conceptos[indice];
            const producto = pedido.lista[indice].producto;
            if (
                !concepto ||
                concepto.indice !== indice ||
                String(concepto.producto_id) !== String(producto && producto._id) ||
                !producto ||
                !producto._id
            ) {
                return res.send({ ok: false, mensaje: "No se pudo validar un producto del pedido" });
            }
            const datosFiscalesProducto = obtenerDatosFiscalesProducto(
                producto,
                productosPorId.get(String(producto._id))
            );
            const errorFiscalProducto = validarConfiguracionFiscalProducto(datosFiscalesProducto);
            if (errorFiscalProducto) {
                return res.send({ ok: false, mensaje: `${producto.nombre || "El producto"}: ${errorFiscalProducto}` });
            }

            if (!requerirPedimentos) {
                // Sin pedimentos configurados: el concepto se timbra sin InformacionAduanera.
                conceptosGuardados.push({
                    indice,
                    producto_id: producto._id,
                    origen: "nacional",
                    pedimento_id: null,
                    ...datosFiscalesProducto
                });
            } else if (concepto.origen === "importado") {
                if (!concepto.pedimento_id) {
                    return res.send({ ok: false, mensaje: `Selecciona el pedimento del producto ${producto.nombre || indice + 1}` });
                }
                const pedimento = await Pedimento.findOne({
                    _id: concepto.pedimento_id,
                    "productos.producto": producto._id
                }).select("_id").lean().exec();
                if (!pedimento) {
                    return res.send({ ok: false, mensaje: `El pedimento no corresponde al producto ${producto.nombre || indice + 1}` });
                }
                conceptosGuardados.push({
                    indice,
                    producto_id: producto._id,
                    origen: "importado",
                    pedimento_id: pedimento._id,
                    ...datosFiscalesProducto
                });
            } else if (concepto.origen === "nacional") {
                conceptosGuardados.push({
                    indice,
                    producto_id: producto._id,
                    origen: "nacional",
                    pedimento_id: null,
                    ...datosFiscalesProducto
                });
            } else {
                return res.send({ ok: false, mensaje: `Indica si el producto ${producto.nombre || indice + 1} es importado o nacional` });
            }
        }

        pedido.preparacion_factura = {
            estado: "pendiente",
            receptor: {
                rfc: receptor.rfc.trim().toUpperCase(),
                nombre: receptor.nombre.trim().toUpperCase(),
                codigo_postal: receptor.codigo_postal.trim(),
                tipo_persona: receptor.tipo_persona,
                regimen_fiscal: receptor.regimen_fiscal.trim(),
                uso_cfdi: receptor.uso_cfdi.trim()
            },
            metodo_pago,
            forma_pago,
            factura_uuid: "",
            error_emision: "",
            conceptos: conceptosGuardados,
            fecha_actualizacion: new Date(),
            usuario_actualizacion: req.user._id
        };
        await pedido.save();

        return res.send({
            ok: true,
            mensaje: "Datos guardados para revisión. La factura todavía no se ha timbrado."
        });
    } catch (err) {
        console.error("Error al guardar preparación de factura:", err);
        return res.send({ ok: false, mensaje: "No se pudieron guardar los datos de facturación" });
    }
}
