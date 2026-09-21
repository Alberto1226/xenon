// Fuente única de verdad: qué campos se consideran obligatorios para operar (aunque el
// formulario de registro/edición ya no los exija), usada tanto al guardar el cliente como
// al limitar cotizaciones con datos incompletos.

const CAMPOS_DIRECCION_OBLIGATORIOS = [
    "calle",
    "numero_exterior",
    "colonia",
    "localidad_nombre",
    "cp",
    "estado",
    "municipio",
];

const CAMPOS_FISCALES_OBLIGATORIOS = ["rfc", "tipo_persona", "cfdi", "rfiscal"];

// Cotizaciones permitidas con datos incompletos antes de bloquear la creación de pedidos
export const LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS = 3;

function vacio(valor) {
    return valor === undefined || valor === null || String(valor).trim() === "";
}

export function evaluar_datos_completos(cliente, direccion) {
    const campos_faltantes = [];
    const direccion_a_validar =
        direccion || (cliente.direcciones_asociadas && cliente.direcciones_asociadas[0]) || {};

    CAMPOS_DIRECCION_OBLIGATORIOS.forEach((campo) => {
        if (vacio(direccion_a_validar[campo])) campos_faltantes.push(campo);
    });

    if (vacio(cliente.telefono)) campos_faltantes.push("telefono");

    const datos_fiscales = cliente.datos_fiscales || {};
    CAMPOS_FISCALES_OBLIGATORIOS.forEach((campo) => {
        if (vacio(datos_fiscales[campo])) campos_faltantes.push(`datos_fiscales.${campo}`);
    });

    return {
        completos: campos_faltantes.length === 0,
        campos_faltantes,
    };
}
