var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    serie: { type: String, default: "A", unique: true },
    folio_siguiente: { type: Number, default: 1 }
});

export var FolioConfig = mongoose.model('FolioConfig', schema);
