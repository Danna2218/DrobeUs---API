const mongoose = require('mongoose');

const notaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
  descripcion: { type: String, trim: true },
  valor: { type: Number, required: [true, 'El valor es obligatorio'], min: 0, max: 5 },
  porcentaje: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true, collection: 'notas' });

module.exports = mongoose.model('Nota', notaSchema);