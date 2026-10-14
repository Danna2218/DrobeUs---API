const mongoose = require('mongoose');
const Nota = require('../models/Nota');
const Materia = require('../models/Materia');

// FUNCIONALIDAD 9: Registrar nota
exports.crearNota = async (req, res) => {
  try {
    const { usuario, materia, descripcion, valor, porcentaje } = req.body;

    if (!usuario || !materia || valor === undefined || valor === null || valor === '') {
      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario, materia y valor son obligatorios'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario) || !mongoose.Types.ObjectId.isValid(materia)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario o materia inválido' });
    }

    if (typeof valor !== 'number' || valor < 0 || valor > 5) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El valor debe ser un número entre 0 y 5'
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

    // Regla de negocio: los porcentajes de una materia no pueden superar 100%
    if (porcentaje) {
      const acumulado = await Nota.aggregate([
        { $match: { materia: existeMateria._id } },
        { $group: { _id: null, total: { $sum: '$porcentaje' } } }
      ]);
      const yaUsado = acumulado.length ? acumulado[0].total : 0;
      if (yaUsado + porcentaje > 100) {
        return res.status(400).json({
          ok: false,
          mensaje: `Los porcentajes superan el 100%. Ya tienes ${yaUsado}% registrado en esta materia`
        });
      }
    }

    const nota = await Nota.create({ usuario, materia, descripcion, valor, porcentaje });

    res.status(201).json({
      ok: true,
      mensaje: `Nota registrada en ${existeMateria.nombre}`,
      nota
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ ok: false, mensaje: mensajes.join(', ') });
    }
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// FUNCIONALIDAD 10: Promedio por materia y del periodo
exports.promedio = async (req, res) => {
  try {
    const { usuario, periodo } = req.query;

    if (!usuario) {
      return res.status(400).json({ ok: false, mensaje: 'El parámetro usuario es obligatorio' });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
    }

    const filtroMateria = { usuario };
    if (periodo) filtroMateria.periodo = periodo;

    const materias = await Materia.find(filtroMateria);

    if (materias.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No hay materias para ese usuario y periodo'
      });
    }

    const resultado = [];
    for (const m of materias) {
      const notas = await Nota.find({ materia: m._id });

      let promedio = null;
      if (notas.length > 0) {
        const totalPorcentaje = notas.reduce((s, n) => s + (n.porcentaje || 0), 0);
        if (totalPorcentaje > 0) {
          // Promedio ponderado por porcentaje
          const suma = notas.reduce((s, n) => s + n.valor * (n.porcentaje || 0), 0);
          promedio = suma / totalPorcentaje;
        } else {
          // Sin porcentajes: promedio simple
          promedio = notas.reduce((s, n) => s + n.valor, 0) / notas.length;
        }
        promedio = Math.round(promedio * 10) / 10;
      }

      resultado.push({
        materiaId: m._id,
        materia: m.nombre,
        color: m.color,
        notasRegistradas: notas.length,
        promedio
      });
    }

    const conNotas = resultado.filter(r => r.promedio !== null);
    const promedioPeriodo = conNotas.length
      ? Math.round((conNotas.reduce((s, r) => s + r.promedio, 0) / conNotas.length) * 10) / 10
      : null;

    res.status(200).json({
      ok: true,
      periodo: periodo || 'todos',
      promedioPeriodo,
      materias: resultado
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};