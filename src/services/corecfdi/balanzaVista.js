/**
 * Balanza de ingresos y egresos: formatos, estado vacío y geometría de la gráfica.
 * Funciones puras: las usa la pantalla (navegador) y se prueban sin API.
 */

/** Monto con separador de miles y 2 decimales. Sin código de moneda: la respuesta no lo trae. */
export function monto(valor) {
    return (Math.round((Number(valor) || 0) * 100) / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** El margen llega como porcentaje sin redondear (11.628112): se redondea solo al mostrar. */
export function porcentaje(valor, decimales = 2) {
    return (Number(valor) || 0).toLocaleString("es-MX", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + "%";
}

/** Año sin CFDI descargados (o empresa sin RFC / FIEL: la respuesta no permite distinguirlo). */
export function sinMovimiento(acumulados) {
    return !acumulados || ((Number(acumulados.ingresos) || 0) === 0 && (Number(acumulados.egresos) || 0) === 0);
}

/** Años del selector, del más reciente al más antiguo. Incluye el seleccionado aunque no tenga CFDI. */
export function opcionesDeYear(years, yearSeleccionado) {
    const lista = (years || []).slice();
    if (yearSeleccionado && !lista.includes(yearSeleccionado)) lista.push(yearSeleccionado);
    return lista.sort((a, b) => b - a);
}

/** Mensaje de una respuesta con error de la ruta: en un 422 es el de `errors.year`. */
export function mensajeDeError(res) {
    const deYear = res && res.errors && res.errors.year;
    if (Array.isArray(deYear) && deYear.length > 0) return deYear[0];
    return (res && res.mensaje) || "No se pudo consultar la balanza.";
}

// Paso "redondo" (1, 2 o 5 por una potencia de 10) para que el eje tenga unas 4 marcas.
function pasoDeEje(rango) {
    const bruto = rango / 4;
    const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
    const fraccion = bruto / potencia;
    return (fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10) * potencia;
}

function compacto(valor) {
    const abs = Math.abs(valor);
    if (abs >= 1e6) return (valor / 1e6).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " M";
    if (abs >= 1e3) return (valor / 1e3).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " k";
    return valor.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

/**
 * Geometría de la gráfica mensual en un SVG de `ancho` x `alto`: dos barras por mes (ingresos y
 * egresos) y la balanza como línea, todo sobre un solo eje. El eje baja de 0 cuando hay meses con
 * balanza negativa. Con todo en 0 devuelve barras de altura 0, sin dividir entre 0.
 */
export function geometriaGrafica(mensualidades, { ancho = 960, alto = 300 } = {}) {
    const margen = { izq: 64, der: 12, arriba: 12, abajo: 28 };
    const anchoUtil = ancho - margen.izq - margen.der;
    const altoUtil = alto - margen.arriba - margen.abajo;
    const meses = mensualidades || [];

    const valores = meses.reduce((lista, m) => lista.concat(m.ingresos, m.egresos, m.balanza), [0]);
    const paso = pasoDeEje(Math.max(...valores) - Math.min(...valores) || 1);
    const minimo = Math.floor(Math.min(...valores) / paso) * paso;
    const maximo = Math.max(Math.ceil(Math.max(...valores) / paso) * paso, minimo + paso);

    const y = (valor) => margen.arriba + ((maximo - valor) / (maximo - minimo)) * altoUtil;
    const banda = anchoUtil / Math.max(meses.length, 1);
    const anchoBarra = Math.min(banda * 0.3, 24);

    const marcas = [];
    for (let i = 0; minimo + i * paso <= maximo + paso / 2; i++) {
        const valor = minimo + i * paso;
        marcas.push({ valor, y: y(valor), texto: compacto(valor) });
    }

    const columnas = meses.map((m, i) => {
        const centro = margen.izq + banda * i + banda / 2;
        const barra = (valor, x) => ({ x, y: y(Math.max(valor, 0)), alto: Math.abs(y(valor) - y(0)), ancho: anchoBarra });
        return {
            mes: m,
            x: margen.izq + banda * i,
            ancho: banda,
            centro,
            // 2 px de separación entre las dos barras del mes.
            ingresos: barra(m.ingresos, centro - anchoBarra - 1),
            egresos: barra(m.egresos, centro + 1),
            balanza: { x: centro, y: y(m.balanza) }
        };
    });

    return {
        ancho,
        alto,
        izquierda: margen.izq,
        derecha: ancho - margen.der,
        arriba: margen.arriba,
        base: alto - margen.abajo,
        cero: y(0),
        marcas,
        columnas,
        linea: columnas.map((c) => `${c.balanza.x},${c.balanza.y}`).join(" ")
    };
}
