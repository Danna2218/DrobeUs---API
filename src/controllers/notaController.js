const mongoose = require('mongoose');
const Nota = require('../models/Nota');
const Materia = require('../models/Materia');
const manejarError = require('../utils/manejarError');

const esId = (id) => mongoose.Types.ObjectId.isValid(id);
const redondear = (n) => Math.round(n * 100) / 100;

// HU 09 - Registrar nota
exports.crearNota = async (req, res) => {
  try {
    const { materia, descripcion, valor, porcentaje } = req.body;

    if (!materia || !descripcion || valor === undefined) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La materia, la descripción y el valor son obligatorios'
      });
    }
    if (!esId(materia)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
    }
    if (typeof valor !== 'number' || valor < 0 || valor > 5) {
      return res.status(400).json({ ok: false, mensaje: 'El valor debe ser un número entre 0 y 5' });
    }
    if (porcentaje !== undefined && (typeof porcentaje !== 'number' || porcentaje < 0 || porcentaje > 100)) {
      return res.status(400).json({ ok: false, mensaje: 'El porcentaje debe estar entre 0 y 100' });
    }

    const existeMateria = await Materia.findOne({ _id: materia, usuario: req.usuarioId });
    if (!existeMateria) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    const nota = await Nota.create({
      usuario: req.usuarioId, materia, descripcion, valor, porcentaje
    });

    res.status(201).json({ ok: true, mensaje: 'Nota registrada correctamente', nota });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 10 - Promedio ponderado del periodo y por materia
exports.promedio = async (req, res) => {
  try {
    const { periodo } = req.query;
    const filtroMaterias = { usuario: req.usuarioId };
    if (periodo) filtroMaterias.periodo = periodo;

    const materias = await Materia.find(filtroMaterias).sort({ nombre: 1 });
    const ids = materias.map((m) => m._id);
    const notas = await Nota.find({ usuario: req.usuarioId, materia: { $in: ids } });

    const porMateria = {};
    notas.forEach((n) => {
      const k = String(n.materia);
      (porMateria[k] = porMateria[k] || []).push(n);
    });

    const resultado = materias.map((m) => {
      const lista = porMateria[String(m._id)] || [];
      const sumaPorcentaje = lista.reduce((a, n) => a + (n.porcentaje || 0), 0);
      const ponderado = lista.reduce((a, n) => a + n.valor * (n.porcentaje || 0), 0);
      return {
        materiaId: m._id,
        materia: m.nombre,
        color: m.color,
        totalNotas: lista.length,
        porcentajeEvaluado: sumaPorcentaje,
        promedio: sumaPorcentaje > 0 ? redondear(ponderado / sumaPorcentaje) : null
      };
    });

    const conNota = resultado.filter((r) => r.promedio !== null);
    const promedioPeriodo = conNota.length
      ? redondear(conNota.reduce((a, r) => a + r.promedio, 0) / conNota.length)
      : null;

    res.status(200).json({
      ok: true,
      periodo: periodo || null,
      promedioPeriodo,
      materias: resultado
    });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 29 - Listar notas de una materia
exports.listarNotas = async (req, res) => {
  try {
    const { materia } = req.query;
    const filtro = { usuario: req.usuarioId };

    if (materia) {
      if (!esId(materia)) {
        return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
      }
      filtro.materia = materia;
    }

    const notas = await Nota.find(filtro).sort({ createdAt: 1 });
    res.status(200).json({ ok: true, total: notas.length, notas });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 30 - Editar una nota
exports.actualizarNota = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de nota inválido' });

    const { valor, porcentaje } = req.body;
    if (valor !== undefined && (typeof valor !== 'number' || valor < 0 || valor > 5)) {
      return res.status(400).json({ ok: false, mensaje: 'El valor debe ser un número entre 0 y 5' });
    }
    if (porcentaje !== undefined && (typeof porcentaje !== 'number' || porcentaje < 0 || porcentaje > 100)) {
      return res.status(400).json({ ok: false, mensaje: 'El porcentaje debe estar entre 0 y 100' });
    }

    const nota = await Nota.findOne({ _id: id, usuario: req.usuarioId });
    if (!nota) return res.status(404).json({ ok: false, mensaje: 'La nota no existe' });

    ['descripcion', 'valor', 'porcentaje'].forEach((c) => {
      if (req.body[c] !== undefined) nota[c] = req.body[c];
    });
    await nota.save();

    res.status(200).json({ ok: true, mensaje: 'Nota actualizada correctamente', nota });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 31 - Eliminar una nota
exports.eliminarNota = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de nota inválido' });

    const nota = await Nota.findOneAndDelete({ _id: id, usuario: req.usuarioId });
    if (!nota) return res.status(404).json({ ok: false, mensaje: 'La nota no existe' });

    res.status(200).json({ ok: true, mensaje: 'Nota eliminada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
};