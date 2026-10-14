const mongoose = require('mongoose');

const apunteSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
  titulo: { type: String, required: [true, 'El título es obligatorio'], trim: true },
  tipo: { type: String, enum: ['texto', 'foto', 'pdf'], default: 'texto' },
  contenido: { type: String, default: '' }
}, { timestamps: true, collection: 'apuntes' });

module.exports = mongoose.model('Apunte', apunteSchema);