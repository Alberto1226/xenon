import { Rutas } from "../../../models/rutas";
import { Cliente } from "../../../models/cliente";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    // console.log("Datos de la ruta", req.body);
    let tipo = req.body.tipo;

    if (tipo == "consulta_clientes") {
        const clientes = await Cliente.find({}, { _id: 1, nombre: 1 }).lean();
        // console.log("Clientes encontrados:", clientes);

        if (!clientes || clientes.length === 0) {
            res.send({ ok: false, mensaje: "No se encontraron clientes" });
            return;
        } else {
            res.send({ ok: true, mensaje: "Clientes encontrados", clientes: clientes });
            return;
        }
    }

    if (tipo == "crear_ruta") {
        const { nombre, descripcion, clientes: clientesSeleccionados } = req.body;

        // Validar campos requeridos
        if (!nombre || typeof nombre !== "string" || nombre.trim() === "") {
            res.send({ ok: false, mensaje: "El nombre de la ruta es requerido" });
            return;
        }
        if (!descripcion || typeof descripcion !== "string" || descripcion.trim() === "") {
            res.send({ ok: false, mensaje: "La descripción de la ruta es requerida" });
            return;
        }
        if (!Array.isArray(clientesSeleccionados) || clientesSeleccionados.length === 0) {
            res.send({ ok: false, mensaje: "Debe seleccionar al menos un cliente para la ruta" });
            return;
        }

        // Crear la ruta
        try {
            const nuevaRuta = new Rutas({
                nombre_ruta: nombre.trim(),
                descripcion: descripcion.trim(),
                ids_clientes: clientesSeleccionados,
                // fecha_creacion: new Date()
            });
            await nuevaRuta.save();
        } catch (error) {
            res.send({ ok: false, mensaje: "Error al crear la ruta", error: error.message });
            return;
        }

    }

    if (tipo === "consulta_rutas") {
        try {
            const rutas = await Rutas.find({}).lean();
            if (!rutas || rutas.length === 0) {
                res.send({ ok: false, mensaje: "No se encontraron rutas" });
                return;
            }

            // Obtener todos los IDs de clientes de todas las rutas
            const todosIdsClientes = [
                ...new Set(rutas.flatMap(ruta => ruta.ids_clientes.map(id => id.toString())))
            ];

            // Consultar los nombres de los clientes asociados
            const clientes = await Cliente.find(
                { _id: { $in: todosIdsClientes } },
                { _id: 1, nombre: 1 }
            ).lean();

            const clientesMap = {};
            clientes.forEach(cliente => {
                clientesMap[cliente._id.toString()] = cliente.nombre;
            });

            // Asociar nombres de clientes a cada ruta
            const rutasConClientes = rutas.map(ruta => ({
                ...ruta,
                clientes: ruta.ids_clientes.map(id => ({
                    id,
                    nombre: clientesMap[id.toString()] || "Desconocido"
                }))
            }));

            res.send({ ok: true, mensaje: "Rutas encontradas", rutas: rutasConClientes });
            return;
        } catch (error) {
            res.send({ ok: false, mensaje: "Error al consultar las rutas", error: error.message });
            return;
        }

    }


    if (tipo === "editar_ruta") {
        const { id, nombre, descripcion, clientes: clientesSeleccionados } = req.body;

        // Validar campos requeridos
        if (!id || !nombre || typeof nombre !== "string" || nombre.trim() === "") {
            res.send({ ok: false, mensaje: "El ID y el nombre de la ruta son requeridos" });
            return;
        }
        if (!descripcion || typeof descripcion !== "string" || descripcion.trim() === "") {
            res.send({ ok: false, mensaje: "La descripción de la ruta es requerida" });
            return;
        }
        if (!Array.isArray(clientesSeleccionados) || clientesSeleccionados.length === 0) {
            res.send({ ok: false, mensaje: "Debe seleccionar al menos un cliente para la ruta" });
            return;
        }

        // Actualizar la ruta
        try {
            const rutaActualizada = await Rutas.findByIdAndUpdate(
                id,
                {
                    nombre_ruta: nombre.trim(),
                    descripcion: descripcion.trim(),
                    ids_clientes: clientesSeleccionados
                },
                { new: true }
            ).lean();

            if (!rutaActualizada) {
                res.send({ ok: false, mensaje: "Ruta no encontrada o no se pudo actualizar" });
                return;
            }

            res.send({ ok: true, mensaje: "Ruta actualizada correctamente", ruta: rutaActualizada });
            return;
        } catch (error) {
            res.send({ ok: false, mensaje: "Error al actualizar la ruta", error: error.message });
            return;
        }

    }

    if (tipo === "eliminar_ruta") {
        const { id } = req.body;

        // Validar ID
        if (!id) {
            res.send({ ok: false, mensaje: "El ID de la ruta es requerido" });
            return;
        }

        // Eliminar la ruta
        try {
            const rutaEliminada = await Rutas.findByIdAndDelete(id).lean();
            if (!rutaEliminada) {
                res.send({ ok: false, mensaje: "Ruta no encontrada o no se pudo eliminar" });
                return;
            }

            res.send({ ok: true, mensaje: "Ruta eliminada correctamente" });
            return;
        } catch (error) {
            res.send({ ok: false, mensaje: "Error al eliminar la ruta", error: error.message });
            return;
        }

    }

    // Generar rutas ficticias para pruebas
    if (tipo === "datos_ficticios") {
        try {
            // Obtener todos los clientes disponibles
            const clientes = await Cliente.find({}, { _id: 1 }).lean();
            if (!clientes || clientes.length === 0) {
                res.send({ ok: false, mensaje: "No hay clientes para generar rutas ficticias" });
                return;
            }
            const clienteIds = clientes.map(c => c._id);

            // Función para obtener un subconjunto aleatorio de IDs de clientes
            function obtenerIdsAleatorios(arr, min, max) {
                const cantidad = Math.floor(Math.random() * (max - min + 1)) + min;
                const copia = [...arr];
                const seleccionados = [];
                for (let i = 0; i < cantidad && copia.length > 0; i++) {
                    const idx = Math.floor(Math.random() * copia.length);
                    seleccionados.push(copia[idx]);
                    copia.splice(idx, 1);
                }
                return seleccionados;
            }

            // Generar 25 rutas ficticias
            const rutasFicticias = [];
            for (let i = 1; i <= 25; i++) {
                rutasFicticias.push({
                    nombre_ruta: `Ruta Ficticia ${i}`,
                    descripcion: `Descripción de la ruta ficticia ${i}`,
                    ids_clientes: obtenerIdsAleatorios(clienteIds, 1, Math.min(5, clienteIds.length))
                });
            }

            // Insertar las rutas en la base de datos
            await Rutas.insertMany(rutasFicticias);

            res.send({ ok: true, mensaje: "25 rutas ficticias generadas correctamente" });
            return;
        } catch (error) {
            res.send({ ok: false, mensaje: "Error al generar rutas ficticias", error: error.message });
            return;
        }
    }

    res.send({ ok: true, mensaje: "Ruta creada correctamente" });
}