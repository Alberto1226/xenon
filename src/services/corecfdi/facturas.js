import { errorDeValidacion } from "./errores.js";
import { esFechaValida } from "./formato.js";

const LIMITE_DE_PAGINAS = 50;
const CATEGORIAS = ["gastos", "nomina", "todos"];

function rfcDePersona(persona) {
    if (!persona) return null;
    const deCliente = persona.persona_cliente && persona.persona_cliente.rfc;
    const deConfiguracion = persona.configuracion_persona && persona.configuracion_persona.rfc;
    return deCliente || deConfiguracion || null;
}

function normalizarPago(referencia) {
    const origen = referencia.factura_origen || {};
    return {
        monto: referencia.monto,
        parcialidad: referencia.parcialidad,
        saldoAnterior: referencia.saldo_ant,
        nuevoSaldo: referencia.nuevo_saldo,
        fecha: referencia.fecha || null,
        uuid: origen.uuid || null,
        fechaCfdi: origen.fecha || null,
        importe: origen.importe === undefined ? null : origen.importe,
        estado: origen.status || null,
        satUrl: origen.sat_url || null,
        tienePdf: !!origen.has_pdf
    };
}

/**
 * Convierte una factura de CoreCFDI al modelo de este sistema.
 * Ojo: en la API la clave `metodo_pago` trae la FORMA de pago (01, 03...) y `forma_pago` trae
 * el MÉTODO (PUE / PPD); aquí quedan en su lugar correcto.
 * `fecha` y `hora` son hora de México y se dejan tal cual, sin conversión de zona horaria.
 */
export function normalizarFactura(cruda) {
    const emisor = cruda.persona_emisor || {};
    const tipo = cruda.tipo_cfdi || {};
    const moneda = cruda.moneda_factura || {};
    const formaDePago = cruda.metodo_pago || {};
    const metodoDePago = cruda.forma_pago || {};

    return {
        id: cruda.id_factura,
        uuid: cruda.uuid || "",
        folio: cruda.foliofactura || "",
        fecha: cruda.fecha || "",
        hora: cruda.hora || "",
        proveedor: { nombre: emisor.nombre || "", rfc: rfcDePersona(emisor) },
        tipo: tipo.tipo_cfdi || "",
        tipoDescripcion: tipo.documento || "",
        moneda: moneda.codigo || "",
        subtotal: (Number(cruda.subtotal_gravado) || 0) + (Number(cruda.subtotal_cero) || 0) + (Number(cruda.subtotal_exento) || 0),
        subtotalGravado: Number(cruda.subtotal_gravado) || 0,
        descuento: Number(cruda.descuento) || 0,
        total: Number(cruda.importe) || 0,
        saldo: Number(cruda.saldo) || 0,
        formaPago: { clave: formaDePago.clave || "", descripcion: formaDePago.descripcion || "" },
        metodoPago: { clave: metodoDePago.clave || "", descripcion: metodoDePago.descripcion || "" },
        estado: cruda.status || "",
        esEfo: cruda.efos_emisor !== null && cruda.efos_emisor !== undefined,
        satUrl: cruda.sat_url || null,
        tienePdf: !!cruda.has_pdf,
        pagos: (cruda.facturas_referencia_destino || []).map(normalizarPago)
    };
}

function validarFiltros(filtros) {
    const errors = {};
    if (filtros.fecha_inicio && !esFechaValida(filtros.fecha_inicio)) errors.fecha_inicio = ["La fecha de inicio debe tener formato YYYY-MM-DD."];
    if (filtros.fecha_fin && !esFechaValida(filtros.fecha_fin)) errors.fecha_fin = ["La fecha de fin debe tener formato YYYY-MM-DD."];
    if (filtros.fecha_inicio && filtros.fecha_fin && !errors.fecha_inicio && !errors.fecha_fin && filtros.fecha_fin < filtros.fecha_inicio) {
        errors.fecha_fin = ["La fecha de fin no puede ser anterior a la fecha de inicio."];
    }
    if (filtros.per_page !== undefined && filtros.per_page !== null && filtros.per_page !== "") {
        const porPagina = Number(filtros.per_page);
        if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 100) errors.per_page = ["Los registros por página deben estar entre 1 y 100."];
    }
    if (filtros.categoria && !CATEGORIAS.includes(filtros.categoria)) errors.categoria = ["La categoría debe ser gastos, nomina o todos."];
    if (filtros.status && !["vigente", "cancelado"].includes(filtros.status)) errors.status = ["El estado debe ser vigente o cancelado."];
    if (filtros.buscar && String(filtros.buscar).length > 100) errors.buscar = ["La búsqueda no puede pasar de 100 caracteres."];
    if (Object.keys(errors).length > 0) throw errorDeValidacion(errors);
}

/**
 * Facturas recibidas (gastos / proveedores) registradas en CoreCFDI.
 */
export function crearCoreCfdiFacturas({ cliente }) {
    async function listarPagina(filtros, page) {
        validarFiltros(filtros);

        const respuesta = await cliente.peticion({
            method: "GET",
            ruta: "/facturas/recibidas",
            // El cliente descarta los parámetros vacíos.
            query: {
                categoria: filtros.categoria,
                buscar: filtros.buscar ? String(filtros.buscar).trim() : "",
                fecha_inicio: filtros.fecha_inicio,
                fecha_fin: filtros.fecha_fin,
                status: filtros.status,
                tipo_cfdi: filtros.tipo_cfdi,
                per_page: filtros.per_page,
                page
            },
            timeoutMs: 30 * 1000,
            reintentos: 2
        });

        const paginador = respuesta.data || {};
        return {
            items: (paginador.data || []).map(normalizarFactura),
            page: paginador.current_page || page,
            lastPage: paginador.last_page || 1,
            total: paginador.total || 0,
            categoria: paginador.categoria || filtros.categoria || "gastos",
            totales: paginador.totales || null,
            conteoCategorias: paginador.conteo_categorias || null,
            hayMas: !!paginador.next_page_url
        };
    }

    async function listarRecibidas(filtros = {}, page = 1) {
        const { hayMas, ...resultado } = await listarPagina(filtros, page);
        return resultado;
    }

    /** Recorre todas las páginas. Solo para exportaciones, no para pintar la pantalla. */
    async function listarTodas(filtros = {}) {
        const todas = [];
        let page = 1;
        while (page <= LIMITE_DE_PAGINAS) {
            const pagina = await listarPagina({ ...filtros, per_page: 100 }, page);
            todas.push(...pagina.items);
            if (!pagina.hayMas) break;
            page++;
        }
        return todas;
    }

    return { listarRecibidas, listarTodas };
}
