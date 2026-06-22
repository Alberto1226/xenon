import { Pedimento } from "../../../models/pedimento";
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    
    const esAdmin = accesos.tiene_permisos_administrativos(req);
    const esGerente = accesos.tiene_permisos_gerenciales(req);

    if (!esAdmin && !esGerente) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const {
        id_pedimento,
        numero_pedimento,
        clave_pedimento,
        fecha_pedimento,
        tipo_cambio,
        gastos_importacion,
        productos,
        fecha_arribo,
        // Campos SAT
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

    if (!id_pedimento || !numero_pedimento || !productos || !Array.isArray(productos) || productos.length === 0) {
        res.send({ ok: false, mensaje: "Datos incompletos o inválidos" });
        return;
    }

    try {
        const pedimentoOriginal = await Pedimento.findById(id_pedimento).exec();
        if (!pedimentoOriginal) {
            res.send({ ok: false, mensaje: "Pedimento no encontrado" });
            return;
        }

        // Verificar duplicados de número de pedimento
        const existeOtro = await Pedimento.findOne({ 
            numero_pedimento, 
            _id: { $ne: id_pedimento } 
        }).lean().exec();

        if (existeOtro) {
            res.send({ ok: false, mensaje: "Ya existe otro pedimento registrado con ese número" });
            return;
        }

        // Extraer IDs de productos
        const oldProductIds = pedimentoOriginal.productos.map(p => p.producto.toString());
        const newProductIds = productos.map(p => p.producto.toString());

        // Si es Gerente y no Administrador, restringir agregar o eliminar productos
        if (!esAdmin) {
            const oldSorted = [...oldProductIds].sort();
            const newSorted = [...newProductIds].sort();
            const esMismaLista = oldSorted.length === newSorted.length && oldSorted.every((val, idx) => val === newSorted[idx]);
            
            if (!esMismaLista) {
                res.send({ ok: false, mensaje: "Solo los administradores pueden agregar o eliminar productos del pedimento" });
                return;
            }
        }

        // --- MANEJO DE INVENTARIOS Y REFERENCIAS ---
        if (pedimentoOriginal.status === 'transito') {
            // El pedimento está en tránsito, actualizamos pedimento_actual en productos.
            
            // 1. Limpiar referencia en productos eliminados (old pero no new)
            const eliminados = oldProductIds.filter(id => !newProductIds.includes(id));
            for (const prodId of eliminados) {
                await Producto.findByIdAndUpdate(prodId, { $set: { pedimento_actual: null } });
            }

            // 2. Crear o actualizar referencia en productos nuevos/modificados
            for (const item of productos) {
                await Producto.findByIdAndUpdate(item.producto, {
                    $set: {
                        pedimento_actual: {
                            id_pedimento: id_pedimento,
                            cantidad_en_transito: item.cantidad,
                            precio_compra_usd: item.precio_compra_usd,
                            costo_fiscal_unitario_mxn: item.costo_fiscal_unitario_mxn || 0,
                            fecha_estimada_arribo: null
                        }
                    }
                });
            }
        } else if (pedimentoOriginal.status === 'arribado') {
            // El pedimento ya arribó. Debemos ajustar existencia.actual física.
            const oldQtyMap = {};
            pedimentoOriginal.productos.forEach(p => {
                oldQtyMap[p.producto.toString()] = p.cantidad || 0;
            });

            const newQtyMap = {};
            productos.forEach(p => {
                newQtyMap[p.producto.toString()] = p.cantidad || 0;
            });

            // 1. Productos eliminados (old pero no new): restar existencia anterior
            const eliminados = oldProductIds.filter(id => !newProductIds.includes(id));
            for (const prodId of eliminados) {
                const qty = oldQtyMap[prodId] || 0;
                if (qty > 0) {
                    await Producto.findByIdAndUpdate(prodId, { $inc: { 'existencia.actual': -qty } });
                }
            }

            // 2. Productos que permanecen: ajustar stock por la diferencia (nueva - anterior)
            for (const item of productos) {
                const prodIdStr = item.producto.toString();
                if (oldQtyMap[prodIdStr] !== undefined) {
                    const diff = item.cantidad - oldQtyMap[prodIdStr];
                    if (diff !== 0) {
                        await Producto.findByIdAndUpdate(item.producto, { $inc: { 'existencia.actual': diff } });
                    }
                }
            }

            // 3. Productos nuevos (new pero no old): agregar existencia
            const nuevos = newProductIds.filter(id => !oldProductIds.includes(id));
            for (const prodId of nuevos) {
                const qty = newQtyMap[prodId] || 0;
                if (qty > 0) {
                    await Producto.findByIdAndUpdate(prodId, { $inc: { 'existencia.actual': qty } });
                }
            }
        }

        // --- ACTUALIZAR DOCUMENTO DE PEDIMENTO ---
        pedimentoOriginal.numero_pedimento = numero_pedimento;
        pedimentoOriginal.clave_pedimento = clave_pedimento || 'A1';
        pedimentoOriginal.fecha_pedimento = fecha_pedimento;
        pedimentoOriginal.tipo_cambio = tipo_cambio;
        pedimentoOriginal.gastos_importacion = gastos_importacion;
        pedimentoOriginal.productos = productos;
        
        pedimentoOriginal.aduana_despacho = aduana_despacho || '160';
        pedimentoOriginal.patente = patente || '3387';
        pedimentoOriginal.regimen = regimen || 'IMD';
        pedimentoOriginal.peso_bruto = peso_bruto || 0;
        pedimentoOriginal.valor_dolares = valor_dolares || 0;
        pedimentoOriginal.valor_aduana_mxn = valor_aduana_mxn || 0;
        pedimentoOriginal.cove = cove || '';
        pedimentoOriginal.proveedor = proveedor || { nombre: '', tax_id: '', pais: 'CHN' };
        pedimentoOriginal.incrementables_sat = incrementables_sat || { fletes: 0, seguros: 0, otros: 0 };
        pedimentoOriginal.contribuciones_sat = contribuciones_sat || { dta: 0, prv: 0, igi: 0, iva: 0, total_efectivo: 0 };

        if (pedimentoOriginal.status === 'arribado' && fecha_arribo) {
            pedimentoOriginal.fecha_arribo = new Date(fecha_arribo);
        }

        const pedimentoGuardado = await pedimentoOriginal.save();

        // Popular productos para retorno a la vista de Svelte
        const pedimentoPopuladado = await Pedimento.findById(pedimentoGuardado._id)
            .populate('productos.producto', 'nombre codigo')
            .exec();

        res.send({ 
            ok: true, 
            mensaje: "Pedimento actualizado con éxito", 
            pedimento: pedimentoPopuladado 
        });

    } catch (err) {
        console.error("Error al editar pedimento:", err);
        res.send({ ok: false, mensaje: "Error al actualizar el pedimento: " + err.message });
    }
}
