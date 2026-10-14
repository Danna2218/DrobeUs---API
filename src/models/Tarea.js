const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
  titulo: { type: String, required: [true, 'El título es obligatorio'], trim: true },
  tipo: { type: String, enum: ['taller', 'parcial', 'informe', 'tarea'], default: 'tarea' },
  fechaEntrega: { type: Date, required: [true, 'La fecha de entrega es obligatoria'] },
  completada: { type: Boolean, default: false }
}, { timestamps: true, collection: 'tareas' });

module.exports = mongoose.model('Tarea', tareaSchema);