const mongoose = require('mongoose');
const Apunte = require('../models/Apunte');
const Materia = require('../models/Materia');

// FUNCIONALIDAD 5: Crear apunte
exports.crearApunte = async (req, res) => {
  try {
    const { usuario, materia, titulo, tipo, contenido } = req.body;

    if (!usuario || !materia || !titulo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario, materia y título son obligatorios'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario) || !mongoose.Types.ObjectId.isValid(materia)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario o materia inválido' });
    }

    const existeMateria = await Materia.findById(materia);
    if (!existeMateria) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    // La materia debe pertenecer al usuario
    if (existeMateria.usuario.toString() !== usuario) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La materia no pertenece a este usuario'
      });
    }

    const apunte = await Apunte.create({ usuario, materia, titulo, tipo, contenido });

    res.status(201).json({
      ok: true,
      mensaje: `Apunte guardado en ${existeMateria.nombre}`,
      apunte
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ ok: false, mensaje: mensajes.join(', ') });
    }
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};