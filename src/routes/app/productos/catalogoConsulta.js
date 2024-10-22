import { Catalogo } from "../../../models/Catalogos";
import * as accesos from "../accesos";
import * as mongoose from 'mongoose';

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    // res.send({ ok: true, mensaje: "Consulta de catálogos" , recibe: req.body.tipo});
    if (req.body.tipo === "consulta") {
        try {
            console.log("entro a consulta");
            // res.send({ ok: true, mensaje: "Consulta de catálogos" });
            let catalogos = await Catalogo.findOne().exec();
            if (!catalogos) {
                res.send({ ok: true, mensaje: "No se encontraron catálogos", catalogos: [] });
            } else {
                res.send({ ok: true, catalogos });
            }
        } catch (error) {
            console.log("Error en la consulta:", error);
            res.send({ ok: false, mensaje: "Ocurrió un error al obtener los catálogos", error });
        }
    }

    if (req.body.tipo === "guardar") {
        try {
            let id = req.body.id;
            if (id == "SinDatos") {
                console.log(req.body);
                let catalogos = {};
                if (req.body.catalogo == "Marcas") {
                    catalogos.Marcas = req.body.dato;
                }
                if (req.body.catalogo == "Unidades") {
                    catalogos.Unidades = req.body.dato;
                }
                if (req.body.catalogo == "Cuentas") {
                    catalogos.Cuentas = req.body.dato;
                }
                console.log("-----", catalogos);
                let nuevoCatalogo = new Catalogo(catalogos);

                nuevoCatalogo.save()
                    .then((resultado) => {
                        res.send({ ok: true, mensaje: "Catálogo guardado exitosamente", resultado });
                    })
                    .catch((error) => {
                        console.log("Error al guardar el catálogo:", error);
                        res.send({ ok: false, mensaje: "Ocurrió un error al guardar el catálogo", error });
                    });
                // res.send({ ok: true, mensaje: "zasd" });                
            }
            if (id != "SinDatos") {
                console.log(req.body);
                if (req.body.catalogo == "Marcas") {
                    let catalogoExistente = await Catalogo.findById(id).exec();
                    if (catalogoExistente) {
                        catalogoExistente.Marcas.push(req.body.dato);
                        await catalogoExistente.save();
                        res.send({ ok: true, mensaje: "Catálogo actualizado exitosamente", catalogoExistente });
                    } else {
                        res.send({ ok: false, mensaje: "Catálogo no encontrado" });
                    }
                }
                if (req.body.catalogo == "Unidades") {
                    let catalogoExistente = await Catalogo.findById(id).exec();
                    if (catalogoExistente) {
                        catalogoExistente.Unidades.push(req.body.dato);
                        await catalogoExistente.save();
                        res.send({ ok: true, mensaje: "Catálogo actualizado exitosamente", catalogoExistente });
                    } else {
                        res.send({ ok: false, mensaje: "Catálogo no encontrado" });
                    }
                }
                if (req.body.catalogo == "Cuentas") {
                    let catalogoExistente = await Catalogo.findById(id).exec();
                    if (catalogoExistente) {
                        catalogoExistente.Cuentas.push(req.body.dato);
                        await catalogoExistente.save();
                        res.send({ ok: true, mensaje: "Catálogo actualizado exitosamente", catalogoExistente });
                    } else {
                        res.send({ ok: false, mensaje: "Catálogo no encontrado" });
                    }
                } else {
                    res.send({ ok: false, mensaje: "Tipo de catálogo no reconocido" });
                }

            }
        } catch (error) {
            console.log("Error en la consulta:", error);
            res.send({ ok: false, mensaje: "Ocurrió un error al guardar los catálogos", error });
        }
    }


    // Catalogo.find()
    //     .then((catalogos) => {
    //         res.send({ ok: true, catalogos: catalogos })
    //     })
    //     .catch((err) => {
    //         res.send({ ok: false, mensaje: "Ocurrio un error al obtener los catalogos", err: err })
    //     })
}
