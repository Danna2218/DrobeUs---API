const mongoose = require('mongoose');

const materiaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  nombre: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
  profesor: { type: String, trim: true },
  aula: { type: String, trim: true },
  color: { type: String, default: '#FF4FA3' },
  periodo: { type: String, required: true, default: '2026-2' },
  horario: [{
    dia: {
      type: String,
      enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
      required: true
    },
    horaInicio: { type: String, required: true },
    horaFin: { type: String, required: true }
  }]
}, { timestamps: true, collection: 'materias' });

module.exports = mongoose.model('Materia', materiaSchema);