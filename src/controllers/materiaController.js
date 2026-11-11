const mongoose = require('mongoose');
const Materia = require('../models/Materia');
const Apunte = require('../models/Apunte');
const Tarea = require('../models/Tarea');
const Nota = require('../models/Nota');
const manejarError = require('../utils/manejarError');

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const esId = (id) => mongoose.Types.ObjectId.isValid(id);

// HU03: Crear materia
exports.crearMateria = async (req, res) => {
  try {
    const { nombre, profesor, aula, color, periodo, horario } = req.body;

    if (!nombre) {
      return res.status(400).json({ ok: false, mensaje: 'El nombre de la materia es obligatorio' });
    }

    const materia = await Materia.create({
      usuario: req.usuarioId, nombre, profesor, aula, color, periodo, horario
    });

    res.status(201).json({ ok: true, mensaje: 'Materia creada correctamente', materia });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU35: Cargar horario (crear varias materias de una vez)
exports.crearMateriasLote = async (req, res) => {
  try {
    const { periodo, materias } = req.body;

    if (!Array.isArray(materias) || materias.length === 0) {
      return res.status(400).json({ ok: false, mensaje: 'Envía una lista de materias' });
    }

    const docs = materias.map((m) => ({
      usuario: req.usuarioId,
      nombre: m.nombre,
      profesor: m.profesor,
      aula: m.aula,
      color: m.color,
      periodo: m.periodo || periodo,
      horario: m.horario
    }));

    const creadas = await Materia.insertMany(docs);

    res.status(201).json({
      ok: true,
      mensaje: `${creadas.length} materias creadas correctamente`,
      total: creadas.length,
      materias: creadas
    });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU04: Clases de hoy, ordenadas por hora
exports.clasesHoy = async (req, res) => {
  try {
    const diaBuscado = (req.query.dia || DIAS[new Date().getDay()]).toLowerCase();

    if (!DIAS.includes(diaBuscado)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Día inválido. Usa: lunes, martes, miercoles, jueves, viernes, sabado o domingo'
      });
    }

    const materias = await Materia.find({ usuario: req.usuarioId, 'horario.dia': diaBuscado });

    const clases = [];
    materias.forEach((m) => {
      m.horario
        .filter((h) => h.dia === diaBuscado)
        .forEach((h) => {
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

    res.status(200).json({ ok: true, dia: diaBuscado, total: clases.length, clases });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU12: Listar materias con total de apuntes y tareas
exports.listarMaterias = async (req, res) => {
  try {
    const filtro = { usuario: req.usuarioId };
    if (req.query.periodo) filtro.periodo = req.query.periodo;

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
    manejarError(res, error);
  }
};

// HU13: Ver una materia
exports.obtenerMateria = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });

    const materia = await Materia.findOne({ _id: id, usuario: req.usuarioId });
    if (!materia) return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });

    res.status(200).json({ ok: true, materia });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU14: Editar una materia
exports.actualizarMateria = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });

    const materia = await Materia.findOne({ _id: id, usuario: req.usuarioId });
    if (!materia) return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });

    ['nombre', 'profesor', 'aula', 'color', 'periodo', 'horario'].forEach((c) => {
      if (req.body[c] !== undefined) materia[c] = req.body[c];
    });
    await materia.save();

    res.status(200).json({ ok: true, mensaje: 'Materia actualizada correctamente', materia });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU15: Eliminar una materia y todo lo que depende de ella
exports.eliminarMateria = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });

    const materia = await Materia.findOne({ _id: id, usuario: req.usuarioId });
    if (!materia) return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });

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
    manejarError(res, error);
  }
};