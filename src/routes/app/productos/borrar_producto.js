
//   Como superadmin crea productos
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export function post(req, res, next) {

    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }



    const activo = req.body.activo;
    //console.log('activo='+activo);
    accesos.logActividad('productos/editar/borrar_de_forma_definitiva', req.user, JSON.stringify(req.body), req);
    Producto.findByIdAndDelete(req.body.id, req.body)
        .then(() => {
            res.send({ ok: true, mensaje: "producto borrado" });
        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false })
            return;
        })

}