// Datos históricos guardaban los ids como String (""). Al migrar los modelos a ObjectId,
// un "" provoca CastError y bloquea el guardado completo del documento.
// Este setter global convierte esos valores vacíos a null en todos los paths ObjectId.
// Debe importarse antes de definir cualquier modelo.
const mongoose = require('mongoose');

mongoose.Schema.Types.ObjectId.set('set', (v) => {
    if (typeof v === 'string') {
        const t = v.trim();
        if (t === '' || t === 'null' || t === 'undefined') return null;
    }
    return v;
});
