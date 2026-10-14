const mongoose = require('mongoose');
const Tarea = require('../models/Tarea');
const Materia = require('../models/Materia');

// FUNCIONALIDAD 6: Crear tarea / parcial / informe
exports.crearTarea = async (req, res) => {
  try {
    const { usuario, materia, titulo, tipo, fechaEntrega } = req.body;

    if (!usuario || !materia || !titulo || !fechaEntrega) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario, materia, título y fecha de entrega son obligatorios'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario) || !mongoose.Types.ObjectId.isValid(materia)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario o materia inválido' });
    }

    if (isNaN(new Date(fechaEntrega).getTime())) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Fecha inválida. Usa el formato AAAA-MM-DD (ejemplo: 2026-10-20)'
      });
    }

    const existeMateria = await Materia.findById(materia);
    if (!existeMateria) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    if (existeMateria.usuario.toString() !== usuario) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La materia no pertenece a este usuario'
      });
    }

    const tarea = await Tarea.create({ usuario, materia, titulo, tipo, fechaEntrega });

    res.status(201).json({
      ok: true,
      mensaje: 'Tarea registrada correctamente',
      tarea
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ ok: false, mensaje: mensajes.join(', ') });
    }
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// FUNCIONALIDAD 7: Entregas pendientes con días restantes
exports.tareasPendientes = async (req, res) => {
  try {
    const { usuario } = req.query;

    if (!usuario) {
      return res.status(400).json({ ok: false, mensaje: 'El parámetro usuario es obligatorio' });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
    }

    const tareas = await Tarea.find({ usuario, completada: false })
      .populate('materia', 'nombre color')
      .sort({ fechaEntrega: 1 });

    const MS_DIA = 1000 * 60 * 60 * 24;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const pendientes = tareas.map(t => {
      const entrega = new Date(t.fechaEntrega);
      entrega.setHours(0, 0, 0, 0);
      const dias = Math.round((entrega - hoy) / MS_DIA);

      let textoFalta;
      if (dias < 0) textoFalta = `Vencida hace ${Math.abs(dias)} día(s)`;
      else if (dias === 0) textoFalta = 'Hoy';
      else if (dias === 1) textoFalta = 'Mañana';
      else textoFalta = `En ${dias} días`;

      return {
        id: t._id,
        titulo: t.titulo,
        tipo: t.tipo,
        materia: t.materia ? t.materia.nombre : null,
        color: t.materia ? t.materia.color : null,
        fechaEntrega: t.fechaEntrega,
        diasRestantes: dias,
        falta: textoFalta
      };
    });

    res.status(200).json({
      ok: true,
      total: pendientes.length,
      pendientes
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};