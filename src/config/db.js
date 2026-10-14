const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Materia = require('../models/Materia');
const Apunte = require('../models/Apunte');
const Tarea = require('../models/Tarea');
const Nota = require('../models/Nota');

module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB conectado');

    for (const modelo of [Usuario, Materia, Apunte, Tarea, Nota]) {
      await modelo.createCollection();
      await modelo.syncIndexes();
    }
    console.log('Colecciones listas');
  } catch (err) {
    console.error('Error de conexión:', err.message);
    process.exit(1);
  }
};