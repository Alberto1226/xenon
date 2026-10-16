import mongoose from "mongoose";
import { CuentaBancaria } from "../../../../models/cuenta_bancaria";
import { autorizar } from "./_autorizar";

const RFC_BANCO = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;

// accion: "listar" | "guardar" | "activar"
export async function post(req, res, next) {
    if (!autorizar(req, res)) return;
    try {
        const accion = req.body.accion;
        if (accion === "listar") {
            const cuentas = await CuentaBancaria.find({}).sort({ banco: 1 }).lean().exec();
            return res.send({ ok: true, cuentas });
        }
        if (accion === "activar") {
            if (!mongoose.Types.ObjectId.isValid(req.body.id)) return res.send({ ok: false, mensaje: "Cuenta no válida." });
            await CuentaBancaria.updateOne({ _id: req.body.id }, { $set: { activa: req.body.activa === true } }).exec();
            return res.send({ ok: true });
        }
        if (accion === "guardar") {
            const banco = String(req.body.banco || "").trim().slice(0, 80);
            const rfc = String(req.body.rfc_banco || "").trim().toUpperCase();
            const numero = String(req.body.numero_cuenta || "").replace(/\s/g, "");
            if (!banco || !/^\d{10,18}$/.test(numero) || !RFC_BANCO.test(rfc)) {
                return res.send({ ok: false, mensaje: "Indica banco, RFC del banco y una cuenta de 10 a 18 dígitos." });
            }
            const datos = { banco, rfc_banco: rfc, numero_cuenta: numero, alias: String(req.body.alias || "").trim().slice(0, 60) };
            if (mongoose.Types.ObjectId.isValid(req.body.id)) {
                await CuentaBancaria.updateOne({ _id: req.body.id }, { $set: datos }).exec();
            } else {
                await new CuentaBancaria(datos).save();
            }
            return res.send({ ok: true, mensaje: "Cuenta guardada." });
        }
        res.send({ ok: false, mensaje: "Acción no válida." });
    } catch (err) {
        console.error(err);
        res.send({ ok: false, mensaje: "No se pudo procesar la cuenta." });
    }
}
