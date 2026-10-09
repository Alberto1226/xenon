import mongoose from "mongoose";
import { Promocion } from "../models/promocion";

// Si promo.id_promocion trae un id (por ejemplo como string), confirma que la promoción exista
// y lo convierte a ObjectId. Si está vacío, es inválido o no existe, queda en null.
export async function validarPromocionProducto(producto) {
    if (!producto || !producto.promo) return producto;
    const id = producto.promo.id_promocion;
    if (!id) {
        producto.promo.id_promocion = null;
        return producto;
    }
    const texto = String(id);
    if (!mongoose.Types.ObjectId.isValid(texto)) {
        producto.promo.id_promocion = null;
        return producto;
    }
    const existe = await Promocion.exists({ _id: texto });
    producto.promo.id_promocion = existe ? mongoose.Types.ObjectId(texto) : null;
    return producto;
}
