const CACHE_MS = 5 * 60 * 1000;
const RFC_GENERICO = "XAXX010101000";

const ENDPOINTS = {
    cobrar: "/tesoreria/cobranza",
    pagar: "/tesoreria/cuentas-por-pagar"
};

// "S/F", "N/A" y cadenas vacías son los rellenos de la API cuando falta el dato.
function limpiar(valor) {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim();
    return texto === "" || texto === "S/F" || texto === "N/A" ? null : texto;
}

function numero(valor) {
    return Number(valor) || 0;
}

function normalizarPago(pago) {
    return {
        folio: limpiar(pago.folio_pago),
        uuid: limpiar(pago.uuid_pago),
        tipoDocumento: limpiar(pago.tipo_documento),
        tipoCfdi: limpiar(pago.tipo_cfdi),
        fecha: limpiar(pago.fecha_pago),
        monto: numero(pago.monto),
        saldoAnterior: numero(pago.saldo_ant),
        nuevoSaldo: numero(pago.nuevo_saldo),
        parcialidad: pago.parcialidad === undefined ? null : pago.parcialidad,
        estado: limpiar(pago.status)
    };
}

/**
 * Lleva una factura de cobranza o de cuentas por pagar al mismo modelo:
 * `contraparte` es el cliente o el proveedor y `estatus` es estatus_cobro o estatus_pago.
 * `fecha` y `fechaVencimiento` quedan tal cual (YYYY-MM-DD, hora de México).
 */
export function normalizarCuenta(cruda) {
    return {
        id: cruda.id_factura,
        contraparte: limpiar(cruda.cliente !== undefined ? cruda.cliente : cruda.proveedor),
        rfc: limpiar(cruda.rfc),
        correo: limpiar(cruda.correo),
        telefono: limpiar(cruda.telefono),
        folio: limpiar(cruda.folio),
        uuid: limpiar(cruda.uuid),
        fecha: limpiar(cruda.fecha),
        // fechalimite no se usa: ya está considerada en fecha_vencimiento.
        fechaVencimiento: limpiar(cruda.fecha_vencimiento),
        // Puede llegar con decimales o en negativo.
        diasCredito: Math.max(Math.round(numero(cruda.dias_credito)), 0),
        importe: numero(cruda.importe),
        abonos: numero(cruda.abonos),
        saldo: numero(cruda.saldo),
        pctLiquidado: numero(cruda.pct_liquidado),
        diasVencidos: numero(cruda.dias_vencidos),
        diasPorVencer: numero(cruda.dias_por_vencer),
        estatus: (cruda.estatus_cobro !== undefined ? cruda.estatus_cobro : cruda.estatus_pago) || "",
        rangoAntiguedad: cruda.rango_antiguedad || "",
        moneda: limpiar(cruda.moneda) || "",
        pagos: (cruda.pagos_detalle || []).map(normalizarPago)
    };
}

// Ojo: el servidor suma monedas distintas sin convertir. Con más de una moneda en la lista, los
// totales se recalculan por moneda con resumirCuentas() (tesoreriaVista.js).
function normalizarAcumulados(crudos) {
    const a = crudos || {};
    return {
        // Estos dos incluyen las facturas ya liquidadas, que no vienen en la lista.
        totalFacturado: numero(a.total_facturado !== undefined ? a.total_facturado : a.total_compras),
        totalLiquidado: numero(a.total_recuperado !== undefined ? a.total_recuperado : a.total_pagado),
        totalPendiente: numero(a.total_pendiente),
        pctLiquidado: numero(a.pct_recuperacion !== undefined ? a.pct_recuperacion : a.pct_pagado),
        conteoVencidos: numero(a.conteo_vencidos),
        estratificacion: a.estratificacion || {},
        // Solo en cuentas por pagar: compras de contado (informativo).
        pueCount: a.pue_count === undefined ? null : numero(a.pue_count),
        pueTotal: a.pue_total === undefined ? null : numero(a.pue_total)
    };
}

/**
 * Cuentas por cobrar y por pagar que CoreCFDI calcula con los CFDI descargados del SAT.
 * Solo consulta: no marca facturas como pagadas ni envía nada a clientes o proveedores.
 *
 * dependencias:
 *  - cliente: cliente HTTP compartido (crearCoreCfdiCliente)
 *  - ambito:  tenant de la sesión; forma parte de la llave del cache
 */
export function crearCoreCfdiTesoreria({ cliente, ambito = "", ahora = () => Date.now() }) {
    const cache = new Map();

    /**
     * filtros: { buscar }  (el único filtro que funciona en el servidor)
     * opciones: { actualizar: true } ignora el cache y vuelve a llamar al servidor.
     * La consulta es pesada (recalcula toda la cartera): la respuesta se guarda 5 minutos.
     */
    async function consultar(tipo, filtros = {}, opciones = {}) {
        const buscar = String(filtros.buscar || "").trim();
        const llave = `${ambito}|${tipo}|${buscar.toLowerCase()}`;

        const guardada = cache.get(llave);
        if (guardada && !opciones.actualizar && ahora() - guardada.consultadoEn < CACHE_MS) {
            return { ...guardada, desdeCache: true };
        }

        const respuesta = await cliente.peticion({
            method: "GET",
            ruta: ENDPOINTS[tipo],
            // Solo `buscar`: estatus, per_page, page, fechas y antigüedad no tienen efecto hoy.
            // El cliente descarta el parámetro si está vacío.
            query: { buscar },
            timeoutMs: 60 * 1000,
            reintentos: 2
        });

        const data = respuesta.data || {};
        const empresa = data.empresa || {};
        const resultado = {
            empresa: {
                rfc: empresa.rfc || "",
                nombre: empresa.nombre || "",
                // RFC genérico: la empresa no ha configurado su RFC o FIEL y las listas pueden no ser confiables.
                rfcSinConfigurar: empresa.rfc === RFC_GENERICO
            },
            facturas: (data.facturas || []).map(normalizarCuenta),
            acumulados: normalizarAcumulados(data.acumulados),
            consultadoEn: ahora()
        };

        cache.forEach((valor, clave) => {
            if (ahora() - valor.consultadoEn >= CACHE_MS) cache.delete(clave);
        });
        cache.set(llave, resultado);
        return { ...resultado, desdeCache: false };
    }

    return {
        cuentasPorCobrar: (filtros, opciones) => consultar("cobrar", filtros, opciones),
        cuentasPorPagar: (filtros, opciones) => consultar("pagar", filtros, opciones)
    };
}
