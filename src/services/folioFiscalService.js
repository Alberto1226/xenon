import { FolioConfig } from "../models/folio_config";

export async function reservarFolioFiscal(serie) {
    await FolioConfig.findOneAndUpdate(
        { serie },
        { $setOnInsert: { serie, folio_siguiente: 1 } },
        { upsert: true, new: true }
    ).exec();
    const config = await FolioConfig.findOneAndUpdate(
        { serie },
        { $inc: { folio_siguiente: 1 } },
        { new: false }
    ).exec();
    if (!config) {
        throw new Error("No se pudo reservar un folio fiscal.");
    }
    return String(config.folio_siguiente);
}
