/**
 * Cuentas por cobrar / por pagar: filtros, totales y paginación sobre la lista ya recibida.
 * CoreCFDI manda todas las facturas pendientes en una sola respuesta y solo sabe filtrar por
 * `buscar`, así que todo lo demás se resuelve aquí, sin volver a llamar al servidor.
 * Funciones puras: las usa la pantalla (navegador) y se prueban sin API.
 */

export const RANGOS_ANTIGUEDAD = [
    { clave: "al_corriente", titulo: "Al corriente" },
    { clave: "vencido_1_30", titulo: "1 a 30 días" },
    { clave: "vencido_31_60", titulo: "31 a 60 días" },
    { clave: "vencido_61_90", titulo: "61 a 90 días" },
    { clave: "vencido_mas_90", titulo: "Más de 90 días" }
];

function redondear(valor) {
    return Math.round(valor * 100) / 100;
}

function porcentaje(parte, total) {
    return total > 0 ? Math.round((parte / total) * 1000) / 10 : 0;
}

function contiene(valor, texto) {
    return String(valor || "").toLowerCase().includes(texto);
}

/**
 * filtros: { buscar, estatus, rango, moneda, campoFecha, fechaInicio, fechaFin }
 *  - estatus: "" (todos) | "al_corriente" | "vencido"
 *  - campoFecha: "fecha" (emisión, por defecto) | "fechaVencimiento"
 *  - fechaInicio / fechaFin: YYYY-MM-DD, inclusive
 */
export function filtrarCuentas(facturas, filtros = {}) {
    const texto = String(filtros.buscar || "").trim().toLowerCase();
    const campoFecha = filtros.campoFecha === "fechaVencimiento" ? "fechaVencimiento" : "fecha";

    return facturas.filter((f) => {
        if (texto && !(contiene(f.folio, texto) || contiene(f.uuid, texto) || contiene(f.contraparte, texto) || contiene(f.rfc, texto))) return false;
        if (filtros.estatus && f.estatus !== filtros.estatus) return false;
        if (filtros.rango && f.rangoAntiguedad !== filtros.rango) return false;
        if (filtros.moneda && f.moneda !== filtros.moneda) return false;
        // Las fechas son YYYY-MM-DD: se comparan como texto, sin zona horaria.
        const fecha = f[campoFecha] || "";
        if (filtros.fechaInicio && (!fecha || fecha < filtros.fechaInicio)) return false;
        if (filtros.fechaFin && (!fecha || fecha > filtros.fechaFin)) return false;
        return true;
    });
}

/**
 * Totales de las facturas visibles, separados por moneda (nunca se suman monedas distintas).
 * Devuelve un elemento por moneda: { moneda, pendiente, vencido, conteo, conteoVencidos,
 * estratificacion: [{ clave, titulo, total, count, pct }] }. La estratificación trae siempre los
 * 5 rangos conocidos y, al final, cualquier rango que la API mande y no esté en la lista.
 */
export function resumirCuentas(facturas) {
    const porMoneda = new Map();

    facturas.forEach((f) => {
        const moneda = f.moneda || "";
        if (!porMoneda.has(moneda)) {
            porMoneda.set(moneda, { moneda, pendiente: 0, vencido: 0, conteo: 0, conteoVencidos: 0, rangos: new Map() });
        }
        const grupo = porMoneda.get(moneda);
        const saldo = Number(f.saldo) || 0;
        const vencida = f.estatus === "vencido";
        grupo.pendiente += saldo;
        grupo.conteo++;
        if (vencida) {
            grupo.vencido += saldo;
            grupo.conteoVencidos++;
        }
        const clave = f.rangoAntiguedad || "";
        const rango = grupo.rangos.get(clave) || { total: 0, count: 0 };
        rango.total += saldo;
        rango.count++;
        grupo.rangos.set(clave, rango);
    });

    return Array.from(porMoneda.values()).map((grupo) => {
        const conocidos = RANGOS_ANTIGUEDAD.map((r) => r.clave);
        const desconocidos = Array.from(grupo.rangos.keys())
            .filter((clave) => !conocidos.includes(clave))
            .map((clave) => ({ clave, titulo: clave || "Sin rango" }));

        return {
            moneda: grupo.moneda,
            pendiente: redondear(grupo.pendiente),
            vencido: redondear(grupo.vencido),
            conteo: grupo.conteo,
            conteoVencidos: grupo.conteoVencidos,
            estratificacion: RANGOS_ANTIGUEDAD.concat(desconocidos).map((r) => {
                const rango = grupo.rangos.get(r.clave) || { total: 0, count: 0 };
                return { clave: r.clave, titulo: r.titulo, total: redondear(rango.total), count: rango.count, pct: porcentaje(rango.total, grupo.pendiente) };
            })
        };
    });
}

/** Orden inicial de la tabla: más días vencidos primero; después, las que vencen antes. */
export function ordenarCuentas(facturas) {
    return facturas.slice().sort((a, b) => b.diasVencidos - a.diasVencidos || a.diasPorVencer - b.diasPorVencer);
}

export function monedasDe(facturas) {
    return Array.from(new Set(facturas.map((f) => f.moneda || ""))).sort();
}

export function paginar(lista, pagina, porPagina = 25) {
    const totalPaginas = Math.max(Math.ceil(lista.length / porPagina), 1);
    const actual = Math.min(Math.max(pagina, 1), totalPaginas);
    return { items: lista.slice((actual - 1) * porPagina, actual * porPagina), pagina: actual, totalPaginas, total: lista.length };
}
