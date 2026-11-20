function evaluar(cantidad, movimientos, corregido) {
    if (corregido) return { elegible: false, motivo: 'Ya se registró una corrección para este producto y folio.' };
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
        return { elegible: false, motivo: 'La cantidad del pedido no es válida.' };
    }
    if (movimientos.length !== 2) {
        return { elegible: false, motivo: `Se encontraron ${movimientos.length} salidas; se requieren exactamente dos.` };
    }
    const verificables = movimientos.every(m =>
        m.cantidad === cantidad &&
        Number.isFinite(m.inventario_antes && m.inventario_antes.existencias) &&
        Number.isFinite(m.inventario_despues && m.inventario_despues.existencias) &&
        m.inventario_antes.existencias - m.inventario_despues.existencias === cantidad
    );
    if (!verificables) {
        return { elegible: false, motivo: 'Las cantidades o variaciones de existencias no coinciden; requiere revisión manual.' };
    }
    return { elegible: true, motivo: 'Dos salidas coinciden con la cantidad del pedido. Verifica los movimientos antes de corregir.' };
}

module.exports = { evaluar };
