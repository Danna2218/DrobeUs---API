const mongoose = require('mongoose');
const Materia = require('../models/Materia');
const Usuario = require('../models/Usuario');
const Apunte = require('../models/Apunte');
const Tarea = require('../models/Tarea');
const Nota = require('../models/Nota');

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


// FUNCIONALIDAD 12: Listar materias del usuario (con conteo de apuntes y tareas)
exports.listarMaterias = async (req, res) => {
  try {
    const { usuario, periodo } = req.query;

    if (!usuario) {
      return res.status(400).json({ ok: false, mensaje: 'El parámetro usuario es obligatorio' });
    }
    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
    }

    const filtro = { usuario };
    if (periodo) filtro.periodo = periodo;

    const materias = await Materia.find(filtro).sort({ nombre: 1 });

    const lista = await Promise.all(materias.map(async (m) => {
      const [totalApuntes, totalTareas] = await Promise.all([
        Apunte.countDocuments({ materia: m._id }),
        Tarea.countDocuments({ materia: m._id })
      ]);
      return {
        id: m._id,
        nombre: m.nombre,
        profesor: m.profesor,
        aula: m.aula,
        color: m.color,
        periodo: m.periodo,
        horario: m.horario,
        totalApuntes,
        totalTareas
      };
    }));

    res.status(200).json({ ok: true, total: lista.length, materias: lista });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// FUNCIONALIDAD 13: Ver una materia
exports.obtenerMateria = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
    }
    const materia = await Materia.findById(id);
    if (!materia) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }
    res.status(200).json({ ok: true, materia });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// FUNCIONALIDAD 14: Editar materia (PUT)
exports.actualizarMateria = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
    }

    const materia = await Materia.findById(id);
    if (!materia) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    const { nombre, profesor, aula, color, periodo, horario } = req.body;
    if (nombre !== undefined) materia.nombre = nombre;
    if (profesor !== undefined) materia.profesor = profesor;
    if (aula !== undefined) materia.aula = aula;
    if (color !== undefined) materia.color = color;
    if (periodo !== undefined) materia.periodo = periodo;
    if (horario !== undefined) materia.horario = horario;

    await materia.save();

    res.status(200).json({
      ok: true,
      mensaje: 'Materia actualizada correctamente',
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

// FUNCIONALIDAD 15: Eliminar materia (DELETE) y todo lo que depende de ella
exports.eliminarMateria = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
    }

    const materia = await Materia.findById(id);
    if (!materia) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    await Promise.all([
      Apunte.deleteMany({ materia: id }),
      Tarea.deleteMany({ materia: id }),
      Nota.deleteMany({ materia: id })
    ]);
    await materia.deleteOne();

    res.status(200).json({
      ok: true,
      mensaje: 'Materia eliminada junto con sus apuntes, tareas y notas'
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};