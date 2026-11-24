import XLSX from 'xlsx';
import * as accesos from '../../accesos.js';
import { obtenerDatosReporteInventario } from '../../../../services/reporteInventarioService.js';

export async function post(req, res) {
    if (!accesos.esta_logueado(req)) {
        return res.status(401).send("Sesión expirada");
    }

    try {
        const { fecha_inicio, fecha_fin, incluir_inactivos, categoria, buscar } = req.body;

        const resultado = await obtenerDatosReporteInventario({
            fecha_inicio,
            fecha_fin,
            incluir_inactivos: incluir_inactivos === true,
            categoria,
            buscar
        });

        const { kpis, productos } = resultado;

        // Construir datos estructurados para Excel
        const filas = [];

        // Encabezado institucional
        filas.push(["XENON Y MAS - REPORTE DE MOVIMIENTOS DE INVENTARIO"]);
        filas.push([`Período: del ${kpis.fecha_inicio} al ${kpis.fecha_fin}`]);
        filas.push([`Fecha de Generación: ${new Date().toLocaleString('es-MX')} | Usuario: ${req.user ? (req.user.nombre || req.user.usuario) : 'Usuario'}`]);
        filas.push([`Filtros: Incluye Inactivos: ${kpis.incluir_inactivos ? 'SÍ' : 'NO'} | Total Productos: ${kpis.total_productos}`]);
        filas.push([]); // Renglón vacío

        // Encabezados de columnas
        filas.push([
            "#",
            "Código / SKU",
            "Producto",
            "Categoría",
            "Marca",
            "Estado",
            "Entradas (+)",
            "Salidas (-)",
            "Movimiento Neto",
            "Existencias Actuales",
            "Precio Venta Unitario (MXN)",
            "Valor Total Estimado (MXN)"
        ]);

        // Filas de datos
        for (const item of productos) {
            filas.push([
                item.indice,
                item.codigo,
                item.nombre,
                item.categoria,
                item.marca,
                item.activo ? "Activo" : "Inactivo",
                item.entradas,
                item.salidas,
                item.neto,
                item.existencia,
                item.precio,
                item.valorTotal
            ]);
        }

        // Fila de totales consolidada
        filas.push([]);
        filas.push([
            "TOTALES",
            "",
            `${kpis.total_productos} productos`,
            "",
            "",
            "",
            kpis.total_entradas,
            kpis.total_salidas,
            kpis.total_entradas - kpis.total_salidas,
            kpis.total_existencias,
            "",
            kpis.total_valor_inventario
        ]);

        // Crear libro y hoja
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(filas);

        // Anchos de columnas para lectura óptima
        ws['!cols'] = [
            { wch: 6 },   // #
            { wch: 18 },  // SKU
            { wch: 45 },  // Producto
            { wch: 20 },  // Categoría
            { wch: 15 },  // Marca
            { wch: 10 },  // Estado
            { wch: 14 },  // Entradas
            { wch: 14 },  // Salidas
            { wch: 16 },  // Neto
            { wch: 20 },  // Existencias
            { wch: 25 },  // Precio Venta
            { wch: 25 }   // Valor Total
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Inventario");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const nombreArchivo = `Reporte_Inventario_${kpis.fecha_inicio}_al_${kpis.fecha_fin}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);

    } catch (err) {
        console.error("Error al generar Excel de inventario:", err);
        res.status(500).send("Error al generar archivo Excel: " + err.message);
    }
}
