const OBJETOS_IMPUESTO = ["01", "02", "03", "04"];
const OPCIONES_IVA = ["16", "8", "0", "exento", "no_aplica"];

export function obtenerDatosFiscalesProducto(snapshot, productoActual) {
    const guardado = snapshot || {};
    const actual = productoActual || {};
    const impuestosGuardados = guardado.impuestos_venta || {};
    const impuestosActuales = actual.impuestos_venta || {};
    const snapshotConfigurado = !!(
        guardado.sat_clave_prod_serv &&
        guardado.sat_clave_unidad &&
        guardado.sat_objeto_impuesto &&
        impuestosGuardados.iva
    );

    return {
        sat_clave_prod_serv: guardado.sat_clave_prod_serv || actual.sat_clave_prod_serv || "",
        sat_clave_unidad: guardado.sat_clave_unidad || actual.sat_clave_unidad || "",
        sat_objeto_impuesto: guardado.sat_objeto_impuesto || actual.sat_objeto_impuesto || "",
        impuestos_venta: {
            iva: impuestosGuardados.iva || impuestosActuales.iva || "",
            ieps_tasa_porcentaje: snapshotConfigurado
                ? Number(impuestosGuardados.ieps_tasa_porcentaje || 0)
                : Number(impuestosActuales.ieps_tasa_porcentaje || 0)
        }
    };
}

export function validarConfiguracionFiscalProducto(producto) {
    const claveProdServ = String(producto.sat_clave_prod_serv || "").trim();
    const claveUnidad = String(producto.sat_clave_unidad || "").trim().toUpperCase();
    const objetoImpuesto = String(producto.sat_objeto_impuesto || "");
    const impuestos = producto.impuestos_venta || {};
    const iva = String(impuestos.iva || "");
    const ieps = impuestos.ieps_tasa_porcentaje;

    if (claveProdServ && !/^\d{8}$/.test(claveProdServ)) {
        return "La clave SAT de producto o servicio debe tener 8 dígitos.";
    }
    if (claveUnidad && !/^[A-Z0-9]{2,3}$/.test(claveUnidad)) {
        return "La clave SAT de unidad debe tener entre 2 y 3 caracteres alfanuméricos.";
    }
    if (objetoImpuesto && !OBJETOS_IMPUESTO.includes(objetoImpuesto)) {
        return "Selecciona una clave válida de objeto de impuesto SAT.";
    }
    if (iva && !OPCIONES_IVA.includes(iva)) {
        return "Selecciona un tratamiento de IVA válido.";
    }
    if (ieps !== undefined && ieps !== null && ieps !== "") {
        const tasa = Number(ieps);
        if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) {
            return "La tasa de IEPS debe ser un porcentaje entre 0 y 100.";
        }
        if (tasa > 0 && objetoImpuesto !== "02") {
            return "Para configurar IEPS, el objeto de impuesto debe ser 02.";
        }
    }
    if (objetoImpuesto === "02" && !iva) {
        return "Selecciona el tratamiento de IVA o indica que no aplica para este producto.";
    }
    if (objetoImpuesto && objetoImpuesto !== "02" && iva && iva !== "no_aplica") {
        return "Solo los productos con objeto de impuesto 02 pueden trasladar IVA.";
    }

    return "";
}
