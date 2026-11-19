import { Pedimento } from "../../../models/pedimento";
import { Producto } from "../../../models/producto";
import { calcularCostosFiscales } from "../../../services/calcularFiscalesService";
import * as accesos from "../accesos";

/**
 * POST /app/pedimentos/:id_pedimento/calcular_fiscales
 * 
 * Calcula costos fiscales unitarios de cada producto en el pedimento,
 * aplicando prorrateo según metodología seleccionada.
 * 
 * DECISIONES VALIDADAS CON CONTADOR (17 Nov 2026):
 * 1️⃣ IVA 100% ACREDITABLE - Se EXCLUYE del costo
 * 2️⃣ HONORARIOS AGENTE - Vienen de CFDI (UUID obligatorio)
 * 3️⃣ PAGOS NEGATIVOS - Válidos (devoluciones de anticipo)
 * 4️⃣ MÚLTIPLES UUIDs - Permitidos (1 a 4 UUIDs por pedimento)
 * 5️⃣ MÉTODO PEPS - Obligatorio (Art. 41 LISR)
 * 
 * FÓRMULA:
 * Costo = Precio Base + Prorrateo de Gastos (SIN incluir IVA)
 * 
 * Request body:
 * {
 *   "id_pedimento": "507f1f77bcf86cd799439011",
 *   "metodologia": "ad-valorem" | "unitario" | "mixto" | "fijo",
 *   "factor_fijo": 0,  // Si metodologia = "fijo", % a aplicar
 *   "preview": false   // Si true, retorna cálculo sin guardar
 * }
 */
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
        res.send({ ok: false, mensaje: "Datos incompletos: id_pedimento y metodologia requeridos" });
        return;
    }

    try {
        // 1. Validar que el pedimento existe
        const pedimento = await Pedimento.findById(id_pedimento).exec();
        if (!pedimento) {
            res.send({ ok: false, mensaje: "Pedimento no encontrado" });
            return;
        }

        // 2. Validar que el tipo de cambio sea válido
        const tipoCambio = parseFloat(pedimento.tipo_cambio) || 1;
        if (tipoCambio <= 0) {
            res.send({ ok: false, mensaje: "El tipo de cambio del pedimento debe ser mayor a cero." });
            return;
        }

        // 3. Validar que haya productos
        if (!pedimento.productos || pedimento.productos.length === 0) {
            res.send({ ok: false, mensaje: "El pedimento no tiene productos para calcular" });
            return;
        }

        // 4. Validación: Método PEPS es obligatorio (Art. 41 LISR)
        if (pedimento.metodo_valuacion && pedimento.metodo_valuacion !== 'PEPS') {
            res.send({ 
                ok: false, 
                mensaje: "Método de valuación debe ser PEPS según LISR Art. 41. No se permiten otros métodos." 
            });
            return;
        }

        // 5. Validación: Honorarios agente NO pueden estar vacíos
        const g = pedimento.gastos_importacion || {};
        const tieneHonorarios = (g.honorarios_agente && g.honorarios_agente.length > 0) || 
                                (parseFloat(g.Agente_Aduanal) > 0);
        
        if (!tieneHonorarios && metodologia !== 'fijo') {
            // Advertencia (no bloquea, ya que puede ser un pedimento aún en captura)
            console.warn(`⚠️ Pedimento ${id_pedimento}: Sin honorarios de agente registrados`);
        }

        // 6. Ejecutar cálculo usando el servicio
        const resultadoCalculo = calcularCostosFiscales(pedimento, metodologia, factor_fijo);
        const productosCalculados = resultadoCalculo.productos;
        const auditoria = resultadoCalculo.auditoria;

        // 7. Actualizar el costo fiscal unitario en los subdocumentos existentes de Mongoose
        for (const itemCalc of productosCalculados) {
            const prodSubdoc = pedimento.productos.id ? pedimento.productos.id(itemCalc._id) : null;
            if (prodSubdoc) {
                prodSubdoc.costo_fiscal_unitario_mxn = itemCalc.costo_fiscal_unitario_mxn;
            } else {
                const subdoc = pedimento.productos.find(p => p._id && p._id.toString() === (itemCalc._id && itemCalc._id.toString()));
                if (subdoc) {
                    subdoc.costo_fiscal_unitario_mxn = itemCalc.costo_fiscal_unitario_mxn;
                }
            }
        }

        // 8. Si NO es previsualización, guardar en base de datos
        if (!preview) {
            // Actualizar productos individuales en la tabla Producto
            for (const item of productosCalculados) {
                await Producto.updateOne(
                    { _id: item.producto, 'pedimento_actual.id_pedimento': id_pedimento },
                    {
                        $set: {
                            'pedimento_actual.costo_fiscal_unitario_mxn': item.costo_fiscal_unitario_mxn
                        }
                    }
                );
            }

            // Guardar pedimento con los nuevos costos
            const pedimentoCalculado = await pedimento.save();

            // Popular referencias para evitar campos undefined
            const pedimentoPopulado = await Pedimento.findById(pedimentoCalculado._id)
                .populate('productos.producto', 'nombre codigo')
                .exec();

            res.send({ 
                ok: true, 
                mensaje: `✅ Cálculo fiscal completado y guardado con éxito (${metodologia}).`, 
                pedimento: pedimentoPopulado,
                auditoria: auditoria
            });
        } else {
            // PREVISUALIZACIÓN: Retornar cálculo sin guardar
            await pedimento.populate({
                path: 'productos.producto',
                select: 'nombre codigo'
            }).execPopulate();

            res.send({
                ok: true,
                mensaje: `✅ Previsualización de cálculo fiscal lista (${metodologia}).`,
                pedimento: pedimento,
                auditoria: auditoria,
                preview: true
            });
        }

    } catch (err) {
        console.error("Error al calcular costos fiscales:", err);
        res.send({ 
            ok: false, 
            mensaje: "Error al realizar el cálculo fiscal: " + err.message 
        });
    }
}
