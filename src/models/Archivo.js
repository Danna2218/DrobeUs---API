const mongoose = require('mongoose');

const archivoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true, index: true },
  nombre: { type: String, required: true, trim: true },
  mime: { type: String, default: 'application/octet-stream' },
  tamano: { type: Number, default: 0 },
  gridId: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true, collection: 'archivos_meta' });

module.exports = mongoose.model('Archivo', archivoSchema);
