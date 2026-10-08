import { ConfiguracionPedidos } from "../models/configuracion_pedidos";
import { Cliente } from "../models/cliente";

// Regla compartida por todos los flujos: admins y gerentes editan cualquier cliente;
// los agentes requieren el switch habilitado y una asignación al propio usuario.
export function esAgenteCliente(usuario) {
    return !!usuario && ["vendedor", "marketing", "ComercioExterior"].includes(usuario.rol);
}

export async function agentesPuedenEditarClientes() {
    const configuracion = await ConfiguracionPedidos.findOne()
        .select("permitir_edicion_clientes_agentes")
        .lean()
        .exec();
    return !!(configuracion && configuracion.permitir_edicion_clientes_agentes);
}

export async function puedeEditarCliente(usuario, cliente) {
    if (!usuario || !cliente) return false;
    if (usuario.rol === "administrador" || usuario.rol === "gerente") return true;
    if (!esAgenteCliente(usuario) || !(await agentesPuedenEditarClientes())) return false;
    return String(cliente.agente && cliente.agente.id) === String(usuario._id);
}

// Sin cliente_id devuelve el permiso general usado por el listado; con ID verifica propiedad.
export async function obtenerPermisosEdicionCliente(usuario, clienteId) {
    if (!usuario) {
        return { puede_editar: false, puede_reasignar: false };
    }
    if (!clienteId) {
        const puede_editar = usuario.rol === "administrador" ||
            usuario.rol === "gerente" ||
            (esAgenteCliente(usuario) && await agentesPuedenEditarClientes());
        return { puede_editar, puede_reasignar: usuario.rol === "administrador" };
    }
    const cliente = await Cliente.findById(clienteId).select("agente.id").lean().exec();
    return {
        puede_editar: await puedeEditarCliente(usuario, cliente),
        puede_reasignar: usuario.rol === "administrador"
    };
}

const CAMPOS_EDITABLES_CLIENTE = [
    "nombre",
    "alias",
    "correo",
    "telefono",
    "fecha_nacimiento",
    "perfil",
    "region",
    "observaciones",
    "datos_fiscales",
    "direcciones_asociadas",
    "localidad",
    "localidad_nombre",
    "location"
];

// Evita que un payload de edición modifique campos fuera de los datos permitidos del cliente.
export function filtrarCamposEditablesCliente(datos) {
    const salida = {};
    for (const campo of CAMPOS_EDITABLES_CLIENTE) {
        if (Object.prototype.hasOwnProperty.call(datos || {}, campo)) {
            salida[campo] = datos[campo];
        }
    }
    return salida;
}
