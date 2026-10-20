import mongoose from "mongoose";
import { Cliente } from "../../../../models/cliente";
import { CuentaBancaria } from "../../../../models/cuenta_bancaria";
import { MovimientoSaldoCliente } from "../../../../models/movimiento_saldo_cliente";
import { autorizar } from "../pagos/_autorizar";

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;

    try {
        const clienteId = req.body.cliente_id;
        const monto = Math.round(((Number(req.body.monto) || 0) + Number.EPSILON) * 100) / 100;
        const formaPago = String(req.body.forma_pago || "03").trim();
        const referencia = String(req.body.referencia || "").trim().slice(0, 100);
        const nota = String(req.body.nota || req.body.notas || "").trim().slice(0, 300);
        const fecha = req.body.fecha ? new Date(req.body.fecha) : new Date();
        const cuentaDestinoId = mongoose.Types.ObjectId.isValid(req.body.cuenta_destino_id)
            ? req.body.cuenta_destino_id
            : null;

        if (!mongoose.Types.ObjectId.isValid(clienteId)) {
            return res.send({ ok: false, mensaje: "Selecciona un cliente válido." });
        }
        if (!(monto > 0)) {
            return res.send({ ok: false, mensaje: "El importe a abonar debe ser mayor a cero." });
        }

        const cliente = await Cliente.findById(clienteId).select("nombre rfc saldo_a_favor").exec();
        if (!cliente) {
            return res.send({ ok: false, mensaje: "No se encontró el cliente seleccionado." });
        }

        const saldoAnterior = Math.round(((cliente.saldo_a_favor || 0) + Number.EPSILON) * 100) / 100;
        const saldoNuevo = Math.round(((saldoAnterior + monto) + Number.EPSILON) * 100) / 100;

        const usuarioInfo = (req.user && req.user._id)
            ? { id: req.user._id, nombre: req.user.nombre || "" }
            : { id: null, nombre: "" };

        const mov = new MovimientoSaldoCliente({
            cliente_id: clienteId,
            tipo: "deposito",
            importe: monto,
            forma_pago: formaPago,
            referencia: referencia,
            cuenta_destino_id: cuentaDestinoId,
            saldo_anterior: saldoAnterior,
            saldo_nuevo: saldoNuevo,
            nota: nota || "Depósito / Abono a capital",
            fecha: isNaN(fecha.getTime()) ? new Date() : fecha,
            usuario: usuarioInfo
        });

        await mov.save();

        cliente.saldo_a_favor = saldoNuevo;
        await cliente.save();

        res.send({
            ok: true,
            mensaje: "Abono de $" + monto.toLocaleString("es-MX", { minimumFractionDigits: 2 }) + " registrado exitosamente.",
            saldo_nuevo: saldoNuevo,
            movimiento: mov
        });
    } catch (err) {
        console.error("Error al registrar depósito:", err);
        res.send({ ok: false, mensaje: err.message || "Error al registrar el abono." });
    }
}
