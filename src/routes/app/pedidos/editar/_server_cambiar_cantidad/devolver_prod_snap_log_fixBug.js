import { Producto_snaplog } from '../../../../../models/producto_snaplog';
var ObjectId = require('mongoose').Types.ObjectId;

export async function devolver_prod_snap_log_fixBug(Folio, Cliente_id, Producto_id) {

    const resultado4a = await Producto_snaplog.aggregate([
        {
            $match: {
                "pedido.folio": Folio,
                "pedido.cliente.id": ObjectId(Cliente_id),
                accion: "4a",
                "producto.id": ObjectId(Producto_id)
            }
        }, {
            $count: "total"
        }
    ]);

    const resultado4c = await Producto_snaplog.aggregate([
        {
            $match: {
                "pedido.folio": Folio,
                "pedido.cliente.id": ObjectId(Cliente_id),
                accion: "4c",
                "producto.id": ObjectId(Producto_id)
            }
        }, {
            $count: "total"
        }
    ]);

    //si los totales de ambas consultas son iguales no se puede agregar registros en el snaplog de los productos
    //esto es para tratar de mitigar el bug del registro multiple de snaplogs en la base de datos
    if (resultado4a.length > 0 && resultado4c.length > 0) {
        const A = parseInt(resultado4a[0].total);
        const C = parseInt(resultado4c[0].total);

        if (A == C) {
            // res.send({ ok: true })
            return true;
        } else {
            // res.send({ ok: false })
            return false;
        }

    } if (resultado4a.length > 0 && resultado4c.length == 0) {
        // res.send({ ok: false })
        return false;
    }if (resultado4a.length == 0 && resultado4c.length == 0) {
        return true;
    }

}