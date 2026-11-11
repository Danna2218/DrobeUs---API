const mongoose = require('mongoose');
const Apunte = require('../models/Apunte');
const Materia = require('../models/Materia');
const manejarError = require('../utils/manejarError');

const esId = (id) => mongoose.Types.ObjectId.isValid(id);

// HU 05 - Crear apunte
exports.crearApunte = async (req, res) => {
  try {
    const { materia, titulo, tipo, contenido } = req.body;

    if (!materia || !titulo) {
      return res.status(400).json({ ok: false, mensaje: 'La materia y el título son obligatorios' });
    }
    if (!esId(materia)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
    }

    const existeMateria = await Materia.findOne({ _id: materia, usuario: req.usuarioId });
    if (!existeMateria) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    const apunte = await Apunte.create({
      usuario: req.usuarioId, materia, titulo, tipo, contenido
    });

    res.status(201).json({ ok: true, mensaje: 'Apunte creado correctamente', apunte });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 20 - Listar apuntes de una materia 
exports.listarApuntes = async (req, res) => {
  try {
    const { materia, buscar } = req.query;
    const filtro = { usuario: req.usuarioId };

    if (materia) {
      if (!esId(materia)) {
        return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
      }
      filtro.materia = materia;
    }
    if (buscar) {
      const texto = buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtro.titulo = { $regex: texto, $options: 'i' };
    }

    const apuntes = await Apunte.find(filtro).sort({ createdAt: -1 });
    res.status(200).json({ ok: true, total: apuntes.length, apuntes });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 21 - Ver un apunte
exports.obtenerApunte = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de apunte inválido' });

    const apunte = await Apunte.findOne({ _id: id, usuario: req.usuarioId });
    if (!apunte) return res.status(404).json({ ok: false, mensaje: 'El apunte no existe' });

    res.status(200).json({ ok: true, apunte });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 22 - Editar un apunte
exports.actualizarApunte = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de apunte inválido' });

    const apunte = await Apunte.findOne({ _id: id, usuario: req.usuarioId });
    if (!apunte) return res.status(404).json({ ok: false, mensaje: 'El apunte no existe' });

    ['titulo', 'tipo', 'contenido'].forEach((c) => {
      if (req.body[c] !== undefined) apunte[c] = req.body[c];
    });
    await apunte.save();

    res.status(200).json({ ok: true, mensaje: 'Apunte actualizado correctamente', apunte });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 23 - Eliminar un apunte
exports.eliminarApunte = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de apunte inválido' });

    const apunte = await Apunte.findOneAndDelete({ _id: id, usuario: req.usuarioId });
    if (!apunte) return res.status(404).json({ ok: false, mensaje: 'El apunte no existe' });

    res.status(200).json({ ok: true, mensaje: 'Apunte eliminado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
};