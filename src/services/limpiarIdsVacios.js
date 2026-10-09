// Convierte a null los campos ObjectId del esquema que llegan como "" desde el formulario;
// Mongoose no puede castear "" y hace fallar todo el guardado.
export function limpiarIdsVacios(documento, schema) {
    schema.eachPath((ruta, tipo) => {
        if (tipo.instance !== "ObjectID" && tipo.instance !== "ObjectId") return;
        const partes = ruta.split(".");
        let nodo = documento;
        for (let i = 0; i < partes.length - 1; i++) {
            nodo = nodo && nodo[partes[i]];
        }
        const campo = partes[partes.length - 1];
        if (nodo && typeof nodo === "object" && nodo[campo] === "") nodo[campo] = null;
    });
    return documento;
}
