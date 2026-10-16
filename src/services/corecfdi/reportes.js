import { errorDeValidacion } from "./errores.js";

const CACHE_MS = 5 * 60 * 1000;
const YEAR_MINIMO = 2000;
const YEAR_MAXIMO = 2100;
// Rellenos de la API cuando al CFDI le falta el nombre o el RFC.
const RELLENOS = ["Cliente Indefinido", "Proveedor Indefinido", "N/A"];

function limpiar(valor) {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim();
    return texto === "" || RELLENOS.includes(texto) ? null : texto;
}

function numero(valor) {
    return Number(valor) || 0;
}

/**
 * Devuelve el año como entero, o null si no se indicó. Lanza un error de validación (el mismo
 * formato que el 422 del servidor) si no es un entero entre 2000 y 2100.
 */
export function validarYear(year) {
    if (year === undefined || year === null || year === "") return null;
    const texto = String(year).trim();
    const valor = Number(texto);
    if (typeof year === "boolean" || !/^\d+$/.test(texto) || valor < YEAR_MINIMO || valor > YEAR_MAXIMO) {
        throw errorDeValidacion({ year: [`El año debe ser un número entero entre ${YEAR_MINIMO} y ${YEAR_MAXIMO}.`] });
    }
    return valor;
}

function normalizarMes(crudo) {
    return {
        numero: numero(crudo.numero),
        nombre: crudo.nombre || "",
        ingresos: numero(crudo.ingresos),
        egresos: numero(crudo.egresos),
        balanza: numero(crudo.balanza)
    };
}

function normalizarTop(crudo) {
    return { nombre: limpiar(crudo.nombre), rfc: limpiar(crudo.rfc), total: numero(crudo.total) };
}

/**
 * Reportes que CoreCFDI calcula con los CFDI vigentes descargados del SAT. Solo consulta.
 *
 * dependencias:
 *  - cliente: cliente HTTP compartido (crearCoreCfdiCliente)
 *  - ambito:  tenant de la sesión; forma parte de la llave del cache
 */
export function crearCoreCfdiReportes({ cliente, ambito = "", ahora = () => Date.now() }) {
    const cache = new Map();

    /**
     * Balanza anual de lo facturado (no es flujo de efectivo ni balanza de comprobación): ingresos
     * = CFDI emitidos, egresos = CFDI recibidos, por fecha de emisión. Los importes suman monedas
     * distintas sin convertir y la respuesta no trae la moneda.
     *
     * year: entero entre 2000 y 2100. Sin year, el servidor usa el año más reciente con CFDI.
     * opciones: { actualizar: true } ignora el cache y vuelve a llamar al servidor.
     */
    async function balanza(year, opciones = {}) {
        const pedido = validarYear(year);
        const llave = (valor) => `${ambito}|${valor === null ? "" : valor}`;

        const guardada = cache.get(llave(pedido));
        if (guardada && !opciones.actualizar && ahora() - guardada.consultadoEn < CACHE_MS) {
            return { ...guardada, desdeCache: true };
        }

        const respuesta = await cliente.peticion({
            method: "GET",
            ruta: "/reportes/balanza",
            // `year` es el único parámetro del endpoint; el cliente lo descarta si no se indicó.
            query: { year: pedido },
            timeoutMs: 60 * 1000,
            reintentos: 2
        });

        const data = respuesta.data || {};
        const acumulados = data.acumulados || {};
        const resultado = {
            // Siempre 12 meses, de enero a diciembre; los que no tienen CFDI llegan en 0.
            mensualidades: (data.mensualidades || []).map(normalizarMes),
            // Se usan tal cual los manda el servidor: no se recalculan ni se redondean aquí.
            acumulados: {
                ingresos: numero(acumulados.ingresos),
                egresos: numero(acumulados.egresos),
                balanceNeto: numero(acumulados.balance_neto),
                // Porcentaje (no fracción), sin redondear; 0 si no hay ingresos.
                margen: numero(acumulados.margen)
            },
            topClientes: (data.topClientes || []).map(normalizarTop),
            topProveedores: (data.topProveedores || []).map(normalizarTop),
            years: (data.years || []).map(Number),
            // Es el año pedido aunque no tenga CFDI y no venga en `years`.
            yearSeleccionado: numero(data.yearSeleccionado) || pedido,
            consultadoEn: ahora()
        };

        cache.forEach((valor, clave) => {
            if (ahora() - valor.consultadoEn >= CACHE_MS) cache.delete(clave);
        });
        cache.set(llave(pedido), resultado);
        // La consulta sin año también sirve para el año que el servidor eligió.
        if (pedido === null && resultado.yearSeleccionado) cache.set(llave(resultado.yearSeleccionado), resultado);
        return { ...resultado, desdeCache: false };
    }

    return { balanza };
}
