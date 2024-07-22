import { Carrito_cancelado } from "../../../../models/carrito_cancelado";

export async function ChecarFolioEnCarritosCancelados(folio){
    const Cancelados = await Carrito_cancelado.find({ folio: folio });
    const existenRegistros = Cancelados.length > 0;
    return existenRegistros;
}