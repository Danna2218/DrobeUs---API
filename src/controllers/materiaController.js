const mongoose = require('mongoose');
const Materia = require('../models/Materia');
const Usuario = require('../models/Usuario');

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// FUNCIONALIDAD 3: Crear materia
exports.crearMateria = async (req, res) => {
  try {
    const { usuario, nombre, profesor, aula, color, periodo, horario } = req.body;

    if (!usuario || !nombre) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El usuario y el nombre de la materia son obligatorios'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
    }

    const existeUsuario = await Usuario.findById(usuario);
    if (!existeUsuario) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario no existe' });
    }

    const materia = await Materia.create({
      usuario, nombre, profesor, aula, color, periodo, horario
    });

    res.status(201).json({
      ok: true,
      mensaje: 'Materia creada correctamente',
      materia
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ ok: false, mensaje: mensajes.join(', ') });
    }
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// FUNCIONALIDAD 4: Clases de hoy, ordenadas por hora
exports.clasesHoy = async (req, res) => {
  try {
    const { usuario, dia } = req.query;

    if (!usuario) {
      return res.status(400).json({ ok: false, mensaje: 'El parámetro usuario es obligatorio' });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
    }

    // Si no se manda "dia", se usa el día actual del servidor
    const diaBuscado = (dia || DIAS[new Date().getDay()]).toLowerCase();

    if (!DIAS.includes(diaBuscado)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Día inválido. Usa: lunes, martes, miercoles, jueves, viernes, sabado o domingo'
      });
    }

    const materias = await Materia.find({
      usuario,
      'horario.dia': diaBuscado
    });

    const clases = [];
    materias.forEach(m => {
      m.horario
        .filter(h => h.dia === diaBuscado)
        .forEach(h => {
          clases.push({
            materiaId: m._id,
            materia: m.nombre,
            profesor: m.profesor,
            aula: m.aula,
            color: m.color,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin
          });
        });
    });

    clases.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

    res.status(200).json({
      ok: true,
      dia: diaBuscado,
      total: clases.length,
      clases
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};