import { SalidasVentas } from "../../../models/salidasventas";
import { Carrito } from "../../../models/carrito";
import { Pedido } from "../../../models/pedido";
import { Producto } from "../../../models/producto";
import { Producto_snaplog } from "../../../models/producto_snaplog";
import { RutasFinalizadas } from "../../../models/rutas_finalizadas";
import { generar_siguiente_folio } from "../../app/pedidos/_servicios/folio_service";
import mongoose from "mongoose";

export async function put(req, res) {
    let session = null;
    try {
        const { idRuta } = req.params;
        const body = req.body || {};
        const pedidos = body.pedidos || [];
        const notasCierre = body.notas_cierre || "";

        console.log(`🏁 Finalizando ruta ${idRuta} con ${pedidos.length} ventas...`);

        // Intentar iniciar sesión de transacción Mongoose
        let useTransaction = false;
        try {
            session = await mongoose.startSession();
            session.startTransaction();
            useTransaction = true;
        } catch (eSession) {
            console.warn("⚠️ No se pudo iniciar transacción MongoDB (modo standalone):", eSession.message);
            session = null;
        }

        const sessionOptions = session ? { session } : {};

        // 1. Obtener registro de SalidasVentas
        let salidaDB = null;
        if (mongoose.Types.ObjectId.isValid(idRuta)) {
            salidaDB = await SalidasVentas.findById(idRuta, null, sessionOptions);
            if (!salidaDB) {
                salidaDB = await SalidasVentas.findOne({ id_carritos: idRuta }, null, sessionOptions);
            }
        }

        // 2. Obtener y cancelar el Carrito maestro de la ruta para liberar apartados
        let carritoRuta = null;
        let idCarritoMaestro = null;
        if (mongoose.Types.ObjectId.isValid(idRuta)) {
            carritoRuta = await Carrito.findById(idRuta, null, sessionOptions);
        }
        if (!carritoRuta && salidaDB && salidaDB.id_carritos) {
            carritoRuta = await Carrito.findById(salidaDB.id_carritos, null, sessionOptions);
        }

        if (carritoRuta) {
            idCarritoMaestro = carritoRuta._id;
            carritoRuta.status = 'Cancelado';
            await carritoRuta.save(sessionOptions);

            // Eliminar apartados huérfanos/en el limbo del id_carrito maestro en Producto.carritos
            await Producto.updateMany(
                { "carritos.id_carrito": idCarritoMaestro },
                { $pull: { carritos: { id_carrito: idCarritoMaestro } } },
                sessionOptions
            );
        }

        // 3. Procesar y guardar cada venta realizada en la app móvil en la colección PEDIDOS
        let carritosCreadosCount = 0;
        let pedidosGeneradosIds = [];
        let mapaVentasProd = new Map(); // idProd -> cantidad total sold
        let desglosePagos = { efectivo: 0, transferencia: 0, credito: 0 };
        let totalVendidoGeneral = 0;

        for (let venta of pedidos) {
            if (!venta.lista || venta.lista.length === 0) continue;

            const resFolio = await generar_siguiente_folio();
            if (!resFolio.ok) {
                console.error("Error generando folio para venta de ruta:", resFolio.err);
                continue;
            }

            const folio = resFolio.folio;
            const clienteObj = venta.cliente || {};
            const agenteObj = venta.agente || (carritoRuta ? carritoRuta.agente : {});

            let total_pedido = 0;
            let listaFormateada = [];

            for (let item of venta.lista) {
                const prod = item.producto || item;
                const cant = parseInt(item.cantidad) || 1;
                const precio = parseFloat(prod.precio) || 0;
                const subtotal = (precio * cant);
                total_pedido += subtotal;

                // Acumular cantidad vendida por producto para conciliación
                const prodIdStr = String(prod._id || prod.id);
                mapaVentasProd.set(prodIdStr, (mapaVentasProd.get(prodIdStr) || 0) + cant);

                listaFormateada.push({
                    cantidad: cant,
                    canMB: item.canMB || 0,
                    promo: item.promo || { con_promo: false },
                    fecha: new Date(),
                    producto: prod,
                    folios: item.folios || [],
                    preventa: false
                });

                // Descuento de existencia física en MongoDB
                if (prod._id && mongoose.Types.ObjectId.isValid(prod._id)) {
                    await Producto.findByIdAndUpdate(
                        prod._id,
                        { $inc: { "existencia.actual": -cant } },
                        sessionOptions
                    );

                    // Insertar Snaplogs de Auditoría para cada producto vendido
                    const logsArr = item.logs || [];
                    if (logsArr.length > 0) {
                        for (let logItem of logsArr) {
                            const snapDoc = new Producto_snaplog({
                                producto: {
                                    nombre: prod.nombre || prod.descripcion || "",
                                    id: prod._id
                                },
                                usuario: {
                                    nombre: agenteObj.nombre || "Vendedor Ruta",
                                    id: agenteObj.id || null
                                },
                                fecha: new Date(),
                                accion: logItem.accion || "2",
                                cantidad: cant,
                                cantidad_anterior: logItem.cantidad_anterior || 0,
                                pedido: {
                                    folio: folio,
                                    id: null, // Se asignará tras guardar el Pedido
                                    cliente: {
                                        nombre: clienteObj.nombre || "",
                                        id: clienteObj._id || clienteObj.id || null
                                    }
                                },
                                inventario_antes: logItem.inventario_antes || { existencias: 0, apartados: 0 },
                                inventario_despues: logItem.inventario_despues || { existencias: 0, apartados: 0 },
                                folios: item.folios || []
                            });
                            await snapDoc.save(sessionOptions);
                        }
                    } else {
                        // Snaplog fallback automático de descuento de inventario por venta de ruta
                        const snapDoc = new Producto_snaplog({
                            producto: {
                                nombre: prod.nombre || prod.descripcion || "",
                                id: prod._id
                            },
                            usuario: {
                                nombre: agenteObj.nombre || "Vendedor Ruta",
                                id: agenteObj.id || null
                            },
                            fecha: new Date(),
                            accion: "2", // 2: Descuento de inventario
                            cantidad: cant,
                            pedido: {
                                folio: folio,
                                cliente: {
                                    nombre: clienteObj.nombre || "",
                                    id: clienteObj._id || clienteObj.id || null
                                }
                            }
                        });
                        await snapDoc.save(sessionOptions);
                    }
                }
            }

            totalVendidoGeneral += total_pedido;

            // Registrar método de pago (desglose)
            const condicionPago = (venta.condicion_pago || 'contado').toLowerCase();
            const metodoPago = (venta.metodo_pago || 'efectivo').toLowerCase();

            if (condicionPago === 'credito') {
                desglosePagos.credito += total_pedido;
            } else if (metodoPago === 'transferencia') {
                desglosePagos.transferencia += total_pedido;
            } else {
                desglosePagos.efectivo += total_pedido;
            }

            const doc_nuevo_pedido = {
                folio,
                tenia_ficha: false,
                moneda: 'Pesos Mexicanos',
                tipo_de_cambio: 1,
                descuento: 0,
                lista: listaFormateada,
                fecha: venta.fecha ? new Date(venta.fecha) : new Date(),
                fecha_creado: new Date(),
                usuario_que_registro: {
                    id: agenteObj.id || null,
                    nombre: agenteObj.nombre || "Vendedor Ruta",
                    correo: agenteObj.correo || "",
                    usuario: "vendedor_movil"
                },
                agente: {
                    id: agenteObj.id || null,
                    nombre: agenteObj.nombre || "",
                    comision: agenteObj.comision || 0,
                    correo: agenteObj.correo || ""
                },
                cliente: {
                    id: clienteObj._id || clienteObj.id || null,
                    nombre: clienteObj.nombre || "Cliente de Ruta",
                    direccion: clienteObj.direccion || "",
                    correo: clienteObj.correo || "",
                    perfil: clienteObj.perfil || null
                },
                total_pedido,
                status: 'Entregado',
                fecha_entregado: new Date()
            };

            const nuevoPedido = new Pedido(doc_nuevo_pedido);
            const pedidoGuardado = await nuevoPedido.save(sessionOptions);
            pedidosGeneradosIds.push(pedidoGuardado._id);
            carritosCreadosCount++;
        }

        // 4. Conciliación de inventario inicial vs vendido vs devuelto
        let inventarioConciliacion = [];
        let totalCargadoEstimado = 0;

        if (carritoRuta && carritoRuta.lista) {
            for (let itemCargado of carritoRuta.lista) {
                const prod = itemCargado.producto || {};
                const prodIdStr = String(prod._id || prod.id);
                const cantCargada = parseInt(itemCargado.cantidad) || 0;
                const cantVendida = mapaVentasProd.get(prodIdStr) || 0;
                const cantDevuelta = Math.max(0, cantCargada - cantVendida);
                const precioUnit = parseFloat(prod.precio) || 0;

                totalCargadoEstimado += (cantCargada * precioUnit);

                inventarioConciliacion.push({
                    producto: {
                        id: prod._id || null,
                        nombre: prod.nombre || prod.descripcion || "Producto",
                        codigo: prod.codigo || "",
                        precio: precioUnit
                    },
                    cantidad_cargada: cantCargada,
                    cantidad_vendida: cantVendida,
                    cantidad_devuelta: cantDevuelta,
                    diferencia: (cantCargada - cantVendida - cantDevuelta)
                });
            }
        }

        // 5. Crear e insertar documento consolidado en RutasFinalizadas
        const idSalidaValido = salidaDB ? salidaDB._id : (mongoose.Types.ObjectId.isValid(idRuta) ? new mongoose.Types.ObjectId(idRuta) : new mongoose.Types.ObjectId());
        const idCarritoOrigenValido = idCarritoMaestro || (salidaDB ? salidaDB.id_carritos : idSalidaValido);
        const idRutaValido = (salidaDB && salidaDB.id_ruta) ? salidaDB.id_ruta : idSalidaValido;
        const agenteRef = (salidaDB && salidaDB.agente) ? salidaDB.agente : (carritoRuta ? carritoRuta.agente : { id: req.user ? req.user._id : null, nombre: "Agente", correo: "" });

        const docRutaFinalizada = new RutasFinalizadas({
            id_salida: idSalidaValido,
            id_carrito_origen: idCarritoOrigenValido,
            id_ruta: idRutaValido,
            nombre_ruta: (salidaDB && salidaDB.ruta && salidaDB.ruta.nombre_ruta) ? salidaDB.ruta.nombre_ruta : "Ruta Asignada",
            folio_salida: salidaDB ? (salidaDB.folio_salida || "SALIDA-1") : (carritoRuta ? carritoRuta.folio_salida : "SALIDA-1"),
            agente: {
                id: agenteRef.id || agenteRef._id || null,
                nombre: agenteRef.nombre || "Agente",
                correo: agenteRef.correo || ""
            },
            fecha_salida: salidaDB ? (salidaDB.fecha_salina || new Date()) : new Date(),
            fecha_finalizacion: new Date(),
            inventario_conciliacion: inventarioConciliacion,
            totales_financieros: {
                total_cargado_estimado: totalCargadoEstimado,
                total_vendido: totalVendidoGeneral,
                desglose_pagos: desglosePagos
            },
            pedidos_generados: pedidosGeneradosIds,
            notas_cierre: notasCierre,
            estatus_conciliacion: 'Correcto'
        });

        await docRutaFinalizada.save(sessionOptions);

        // 6. Marcar salidaDB como Finalizada
        if (salidaDB) {
            salidaDB.status = 'Finalizada';
            await salidaDB.save(sessionOptions);
        } else if (mongoose.Types.ObjectId.isValid(idRuta)) {
            await SalidasVentas.findByIdAndUpdate(idRuta, { status: 'Finalizada' }, sessionOptions);
        }

        // Commit de la transacción si estuvo activa
        if (useTransaction && session) {
            await session.commitTransaction();
            session.endSession();
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
            ok: true,
            mensaje: `Ruta finalizada correctamente. Se registraron ${carritosCreadosCount} pedidos en la colección pedidos y el historial en RutasFinalizadas.`,
            ventasProcesadas: carritosCreadosCount,
            pedidos_generados: pedidosGeneradosIds,
            id_ruta_finalizada: docRutaFinalizada._id
        }));
    } catch (err) {
        if (session) {
            try {
                await session.abortTransaction();
                session.endSession();
            } catch (eAbort) {
                console.error("Error al abortar transacción:", eAbort.message);
            }
        }
        console.error("Error en PUT /salidas/finalizar/:idRuta:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, mensaje: err.message }));
    }
}
