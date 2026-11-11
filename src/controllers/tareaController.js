const mongoose = require('mongoose');
const Tarea = require('../models/Tarea');
const Materia = require('../models/Materia');
const manejarError = require('../utils/manejarError');
const { filtroEstado, marcarEntregada } = require('../utils/tareaEstado');

const esId = (id) => mongoose.Types.ObjectId.isValid(id);

const textoFalta = (dias) => {
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día(s)`;
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
};

// HU06: Crear tarea
exports.crearTarea = async (req, res) => {
  try {
    const { materia, titulo, tipo, fechaEntrega } = req.body;

    if (!materia || !titulo || !fechaEntrega) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La materia, el título y la fecha de entrega son obligatorios'
      });
    }
    if (!esId(materia)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
    }

    const existeMateria = await Materia.findOne({ _id: materia, usuario: req.usuarioId });
    if (!existeMateria) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    const tarea = await Tarea.create({
      usuario: req.usuarioId, materia, titulo, tipo, fechaEntrega
    });

    res.status(201).json({ ok: true, mensaje: 'Tarea creada correctamente', tarea });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU07: Tareas pendientes con días restantes
exports.tareasPendientes = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    const tareas = await Tarea
      .find({ usuario: req.usuarioId, ...filtroEstado('pendiente') })
      .sort({ fechaEntrega: 1 });

    const materias = await Materia.find({ usuario: req.usuarioId });
    const porId = {};
    materias.forEach((m) => { porId[String(m._id)] = m; });

    const pendientes = tareas.map((t) => {
      const m = porId[String(t.materia)];
      const diasRestantes = Math.round((new Date(t.fechaEntrega) - hoy) / 86400000);
      return {
        id: t._id,
        titulo: t.titulo,
        tipo: t.tipo,
        materia: m ? m.nombre : null,
        color: m ? m.color : null,
        fechaEntrega: t.fechaEntrega,
        diasRestantes,
        falta: textoFalta(diasRestantes)
      };
    });

    res.status(200).json({ ok: true, total: pendientes.length, pendientes });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU24: Listar tareas de una materia (filtro opcional por estado)
exports.listarTareas = async (req, res) => {
  try {
    const { materia, estado } = req.query;
    const filtro = { usuario: req.usuarioId };

    if (materia) {
      if (!esId(materia)) {
        return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
      }
      filtro.materia = materia;
    }
    if (estado) Object.assign(filtro, filtroEstado(estado));

    const tareas = await Tarea.find(filtro).sort({ fechaEntrega: 1 });
    res.status(200).json({ ok: true, total: tareas.length, tareas });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU25: Ver una tarea
exports.obtenerTarea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de tarea inválido' });

    const tarea = await Tarea.findOne({ _id: id, usuario: req.usuarioId });
    if (!tarea) return res.status(404).json({ ok: false, mensaje: 'La tarea no existe' });

    res.status(200).json({ ok: true, tarea });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU26: Editar una tarea
exports.actualizarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de tarea inválido' });

    const tarea = await Tarea.findOne({ _id: id, usuario: req.usuarioId });
    if (!tarea) return res.status(404).json({ ok: false, mensaje: 'La tarea no existe' });

    ['titulo', 'tipo', 'fechaEntrega'].forEach((c) => {
      if (req.body[c] !== undefined) tarea[c] = req.body[c];
    });
    await tarea.save();

    res.status(200).json({ ok: true, mensaje: 'Tarea actualizada correctamente', tarea });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU27: Marcar una tarea como entregada
exports.entregarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de tarea inválido' });

    const tarea = await Tarea.findOne({ _id: id, usuario: req.usuarioId });
    if (!tarea) return res.status(404).json({ ok: false, mensaje: 'La tarea no existe' });

    if (!marcarEntregada(tarea)) {
      return res.status(500).json({
        ok: false,
        mensaje: 'El modelo Tarea no tiene un campo de estado (entregada, completada, estado o hecha)'
      });
    }
    await tarea.save();

    res.status(200).json({ ok: true, mensaje: 'Tarea marcada como entregada', tarea });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU28: Eliminar una tarea
exports.eliminarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de tarea inválido' });

    const tarea = await Tarea.findOneAndDelete({ _id: id, usuario: req.usuarioId });
    if (!tarea) return res.status(404).json({ ok: false, mensaje: 'La tarea no existe' });

    res.status(200).json({ ok: true, mensaje: 'Tarea eliminada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
};