import { Pedimento } from "../../../models/pedimento";
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const { id_pedimento, metodologia, factor_fijo = 0, preview = false } = req.body;

    if (!id_pedimento || !metodologia) {
        res.send({ ok: false, mensaje: "Datos incompletos" });
        return;
    }

    try {
        const pedimento = await Pedimento.findById(id_pedimento).exec();
        if (!pedimento) {
            res.send({ ok: false, mensaje: "Pedimento no encontrado" });
            return;
        }

        // 1. Calcular total compra de mercancías en MXN
        let totalCompraMXN = 0;
        let totalPiezas = 0;
        for (const item of pedimento.productos) {
            totalCompraMXN += item.cantidad * item.precio_compra_usd * pedimento.tipo_cambio;
            totalPiezas += item.cantidad;
        }

        if (totalCompraMXN === 0 || totalPiezas === 0) {
            res.send({ ok: false, mensaje: "El pedimento no tiene productos con cantidades o precios válidos" });
            return;
        }

        // 2. Sumar gastos indirectos totales en MXN
        const g = pedimento.gastos_importacion || {};
        const impuesto = parseFloat(g.Impuesto_Aduanal) || 0;
        const flete = parseFloat(g.Flete) || 0;
        const agente = parseFloat(g.Agente_Aduanal) || 0;
        const seguridad = parseFloat(g.Seguridad) || 0;
        
        let otrosMonto = 0;
        if (g.otros && Array.isArray(g.otros)) {
            otrosMonto = g.otros.reduce((acc, current) => acc + (parseFloat(current.monto) || 0), 0);
        }

        const totalIndirectos = impuesto + flete + agente + seguridad + otrosMonto;

        // 3. Aplicar metodología seleccionada
        const productosActualizados = [];

        for (const item of pedimento.productos) {
            const precioBaseMXN = item.precio_compra_usd * pedimento.tipo_cambio;
            let costoFiscalUnitario = 0;

            if (metodologia === 'ad-valorem') {
                const factor = totalIndirectos / totalCompraMXN;
                costoFiscalUnitario = precioBaseMXN * (1 + factor);
            } else if (metodologia === 'unitario') {
                const gastoPorPieza = totalIndirectos / totalPiezas;
                costoFiscalUnitario = precioBaseMXN + gastoPorPieza;
            } else if (metodologia === 'mixto') {
                // Impuesto y agente aduanal van por valor
                const gastosValor = impuesto + agente;
                const factorValor = gastosValor / totalCompraMXN;
                
                // Flete, seguridad y otros van por cantidad física
                const gastosCantidad = flete + seguridad + otrosMonto;
                const gastoPorPieza = gastosCantidad / totalPiezas;

                costoFiscalUnitario = (precioBaseMXN * (1 + factorValor)) + gastoPorPieza;
            } else if (metodologia === 'fijo') {
                const factor = parseFloat(factor_fijo) || 0;
                costoFiscalUnitario = precioBaseMXN * (1 + factor / 100);
            } else {
                res.send({ ok: false, mensaje: "Metodología de cálculo no soportada" });
                return;
            }

            // Redondear a 2 decimales para evitar problemas de coma flotante
            costoFiscalUnitario = Math.round(costoFiscalUnitario * 100) / 100;

            item.costo_fiscal_unitario_mxn = costoFiscalUnitario;
            productosActualizados.push(item);

            // Solo actualizar en el Producto correspondiente si NO es previsualización
            if (!preview) {
                // Se utiliza updateOne con filtro exacto para evitar errores si 'pedimento_actual' es null (ya arribó)
                await Producto.updateOne(
                    { _id: item.producto, 'pedimento_actual.id_pedimento': id_pedimento },
                    {
                        $set: {
                            'pedimento_actual.costo_fiscal_unitario_mxn': costoFiscalUnitario
                        }
                    }
                );
            }
        }

        pedimento.productos = productosActualizados;

        if (preview) {
            // Popular el documento en memoria sin guardar en la base de datos
            await pedimento.populate({
                path: 'productos.producto',
                select: 'nombre codigo'
            }).execPopulate();

            res.send({
                ok: true,
                mensaje: `Previsualización de cálculo fiscal lista (${metodologia}).`,
                pedimento: pedimento
            });
        } else {
            const pedimentoCalculado = await pedimento.save();

            // Popular referencias para evitar campos undefined en la vista de Svelte
            const pedimentoPopuladado = await Pedimento.findById(pedimentoCalculado._id)
                .populate('productos.producto', 'nombre codigo')
                .exec();

            res.send({ 
                ok: true, 
                mensaje: `Cálculo fiscal completado y guardado con éxito (${metodologia}).`, 
                pedimento: pedimentoPopuladado 
            });
        }

    } catch (err) {
        console.error("Error al calcular costos fiscales:", err);
        res.send({ ok: false, mensaje: "Error al realizar el cálculo fiscal: " + err.message });
    }
}
