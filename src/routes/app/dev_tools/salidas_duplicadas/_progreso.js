async function procesar(elegidos, corregir, informar) {
    let completados = 0;
    for (const item of elegidos) {
        informar({ completados, total: elegidos.length, actual: item.nombre });
        try {
            await corregir(item);
        } catch (error) {
            return { completados, total: elegidos.length, fallido: item.nombre, error };
        }
        completados++;
        informar({ completados, total: elegidos.length, actual: null });
    }
    return { completados, total: elegidos.length };
}

module.exports = { procesar };
