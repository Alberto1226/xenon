import * as accesos from "../accesos";
import * as mongoose from 'mongoose';
import { Pais } from "../../../models/Pais";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    // res.send({ ok: true, mensaje: "Paises", recibe: req.body });

    if (req.body.tipo === "guardarPais") {
        let nuevoPais = new Pais();
        nuevoPais.nombre = req.body.dato.pais;
        nuevoPais.codigo = req.body.dato.nomenclatura;

        nuevoPais.save()
            .then((resultado) => {
                res.send({ ok: true, mensaje: "País guardado exitosamente", resultado });
            })
            .catch((error) => {
                console.log("Error al guardar el país:", error);
                res.send({ ok: false, mensaje: "Ocurrió un error al guardar el país", error });
            });
    }

    if (req.body.tipo === "consultaPaises") {
        try {
            let paises = await Pais.find().exec();
            if (!paises) {
                res.send({ ok: true, mensaje: "No se encontraron paises", paises: [] });
            } else {
                res.send({ ok: true, paises, mensaje: "Consulta de paises" });
            }
        } catch (error) {
            console.log("Error en la consulta:", error);
            res.send({ ok: false, mensaje: "Ocurrió un error al obtener los paises", error });
        }
    }

    if (req.body.tipo === "guardarEstado") {
        // res.send({ ok: true, mensaje: "Guardar estado", recibe: req.body });
        try {
            let id = req.body.dato.id;
            let pais = await Pais.findById(id).exec();
            if (!pais) {
                res.send({ ok: false, mensaje: "No se encontró el país" });
            } else {
                pais.estados.push({
                    nombreEstado: req.body.dato.estado,
                    codigoEstado: req.body.dato.nomenclatura
                });

                pais.save()
                    .then((resultado) => {
                        res.send({ ok: true, mensaje: "Estado guardado exitosamente", estados: resultado.estados });
                        //estados: paises.map(pais => pais.estados).flat()
                    })
                    .catch((error) => {
                        console.log("Error al guardar el estado:", error);
                        res.send({ ok: false, mensaje: "Ocurrió un error al guardar el estado", error });
                    });
            }
        } catch (error) {
            console.log("Error en la consulta:", error);
            res.send({ ok: false, mensaje: "Ocurrió un error al obtener el pais", error });
        }

    }

    if (req.body.tipo === "guardarMunicipio") {
        // res.send({ ok: true, mensaje: "Guardar municipio", recibe: req.body });
        try {
            let idPais = req.body.dato.pais;
            let IdEstado = req.body.dato.estado;
            let municipio = req.body.dato.municipio;

            let pais = await Pais.findById(idPais).exec();
            // let pais = await Pais.findById('idPais').exec();
            if (!pais) {
                res.send({ ok: false, mensaje: "No se encontró el país seleccionado" });
            } else {
                let estado = pais.estados.id(IdEstado);
                // let estado = pais.estados.id('IdEstado');
                if (!estado) {
                    res.send({ ok: false, mensaje: "No se encontró el estado seleccionado en el pais que selecciono" });
                } else {
                    estado.municipios.push({
                        nombreMunicipio: municipio,
                    });

                    pais.save()
                        .then((resultado) => {
                            res.send({
                                ok: true, mensaje: "Municipio guardado exitosamente",
                                municipios: resultado.estados.id(IdEstado).municipios
                            });
                        })
                        .catch((error) => {
                            console.log("Error al guardar el municipio:", error);
                            res.send({ ok: false, mensaje: "Ocurrió un error al guardar el municipio", error });
                        });
                }
            }
        } catch (error) {
            console.log("Error en la consulta:", error);
            res.send({ ok: false, mensaje: "Ocurrió un error al obtener el pais al intentar guardar el municipio", error });

        }
    }
}