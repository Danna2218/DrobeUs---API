const mongoose = require('mongoose');
const { Readable } = require('stream');
const Archivo = require('../models/Archivo');
const Materia = require('../models/Materia');
const { bucket } = require('../utils/archivos');
const manejarError = require('../utils/manejarError');

const esId = (id) => mongoose.Types.ObjectId.isValid(id);

// Subir un archivo a una materia (foto, PDF, Word, etc.)
exports.subirArchivo = async (req, res) => {
  try {
    const { materia } = req.body;
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'Adjunta un archivo' });
    }
    if (!materia || !esId(materia)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
    }

    const existe = await Materia.findOne({ _id: materia, usuario: req.usuarioId });
    if (!existe) {
      return res.status(404).json({ ok: false, mensaje: 'La materia no existe' });
    }

    const nombre = (req.body.nombre || req.file.originalname || 'archivo').trim();
    const subida = bucket().openUploadStream(nombre, {
      contentType: req.file.mimetype,
      metadata: { usuario: req.usuarioId, materia }
    });

    await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer).pipe(subida).on('error', reject).on('finish', resolve);
    });

    const archivo = await Archivo.create({
      usuario: req.usuarioId,
      materia,
      nombre,
      mime: req.file.mimetype,
      tamano: req.file.size,
      gridId: subida.id
    });

    res.status(201).json({ ok: true, mensaje: 'Archivo guardado correctamente', archivo });
  } catch (error) {
    manejarError(res, error);
  }
};

// Listar los archivos de una materia
exports.listarArchivos = async (req, res) => {
  try {
    const { materia } = req.query;
    const filtro = { usuario: req.usuarioId };

    if (materia) {
      if (!esId(materia)) {
        return res.status(400).json({ ok: false, mensaje: 'ID de materia inválido' });
      }
      filtro.materia = materia;
    }

    const archivos = await Archivo.find(filtro).sort({ createdAt: -1 });
    res.status(200).json({ ok: true, total: archivos.length, archivos });
  } catch (error) {
    manejarError(res, error);
  }
};

// Descargar o abrir un archivo
exports.descargarArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de archivo inválido' });

    const archivo = await Archivo.findOne({ _id: id, usuario: req.usuarioId });
    if (!archivo) return res.status(404).json({ ok: false, mensaje: 'El archivo no existe' });

    res.set({
      'Content-Type': archivo.mime,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`
    });

    const flujo = bucket().openDownloadStream(archivo.gridId);
    flujo.on('error', () => {
      if (!res.headersSent) res.status(404).json({ ok: false, mensaje: 'El contenido del archivo no existe' });
      else res.end();
    });
    flujo.pipe(res);
  } catch (error) {
    manejarError(res, error);
  }
};

// Eliminar un archivo (metadatos y contenido)
exports.eliminarArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esId(id)) return res.status(400).json({ ok: false, mensaje: 'ID de archivo inválido' });

    const archivo = await Archivo.findOneAndDelete({ _id: id, usuario: req.usuarioId });
    if (!archivo) return res.status(404).json({ ok: false, mensaje: 'El archivo no existe' });

    try { await bucket().delete(archivo.gridId); } catch (e) { /* ya no existía */ }

    res.status(200).json({ ok: true, mensaje: 'Archivo eliminado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
};
