const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
  correo: {
    type: String,
    required: [true, 'El correo es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Correo inválido']
  },
  contrasena: { type: String, required: [true, 'La contraseña es obligatoria'], minlength: 6 },
  institucion: { type: String, trim: true },
  carrera: { type: String, trim: true },
  periodoActual: { type: String, default: '2026-2' }
}, { timestamps: true, collection: 'usuarios' });

usuarioSchema.pre('save', async function () {
  if (!this.isModified('contrasena')) return;
  this.contrasena = await bcrypt.hash(this.contrasena, 10);
});

usuarioSchema.methods.compararContrasena = function (plana) {
  return bcrypt.compare(plana, this.contrasena);
};

module.exports = mongoose.model('Usuario', usuarioSchema);