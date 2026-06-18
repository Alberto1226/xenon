import { Pedimento } from "../../../models/pedimento";
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const {
        numero_pedimento,
        clave_pedimento,
        fecha_pedimento,
        tipo_cambio,
        gastos_importacion,
        productos,
        // Nuevos campos SAT
        aduana_despacho,
        patente,
        regimen,
        peso_bruto,
        valor_dolares,
        valor_aduana_mxn,
        cove,
        proveedor,
        incrementables_sat,
        contribuciones_sat
    } = req.body;

    if (!numero_pedimento || !fecha_pedimento || !tipo_cambio || !productos || !Array.isArray(productos) || productos.length === 0) {
        res.send({ ok: false, mensaje: "Datos incompletos o inválidos" });
        return;
    }

    try {
        const existePedimento = await Pedimento.findOne({ numero_pedimento }).lean().exec();
        if (existePedimento) {
            res.send({ ok: false, mensaje: "Ya existe un pedimento registrado con ese número" });
            return;
        }

        const nuevoPedimento = new Pedimento({
            numero_pedimento,
            clave_pedimento: clave_pedimento || 'A1',
            fecha_pedimento,
            tipo_cambio,
            gastos_importacion,
            productos,
            status: 'transito',
            // Campos SAT oficiales
            aduana_despacho: aduana_despacho || '160',
            patente: patente || '3387',
            regimen: regimen || 'IMD',
            peso_bruto: peso_bruto || 0,
            valor_dolares: valor_dolares || 0,
            valor_aduana_mxn: valor_aduana_mxn || 0,
            cove: cove || '',
            proveedor: proveedor || { nombre: '', tax_id: '', pais: 'CHN' },
            incrementables_sat: incrementables_sat || { fletes: 0, seguros: 0, otros: 0 },
            contribuciones_sat: contribuciones_sat || { dta: 0, prv: 0, igi: 0, iva: 0, total_efectivo: 0 }
        });

        const pedimentoGuardado = await nuevoPedimento.save();

        // Actualizar el pedimento_actual en cada producto
        for (const item of productos) {
            await Producto.findByIdAndUpdate(item.producto, {
                $set: {
                    pedimento_actual: {
                        id_pedimento: pedimentoGuardado._id,
                        cantidad_en_transito: item.cantidad,
                        precio_compra_usd: item.precio_compra_usd,
                        costo_fiscal_unitario_mxn: 0,
                        fecha_estimada_arribo: null
                    }
                }
            });
        }

        res.send({ ok: true, mensaje: "Pedimento registrado en tránsito con éxito", pedimento: pedimentoGuardado });

    } catch (err) {
        console.error("Error al crear pedimento:", err);
        res.send({ ok: false, mensaje: "Error al registrar el pedimento: " + err.message });
    }
}
