const Tarea = require('../models/Tarea');
const Materia = require('../models/Materia');
const manejarError = require('../utils/manejarError');
const { filtroEstado } = require('../utils/tareaEstado');

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const materiasPorId = async (usuarioId) => {
  const materias = await Materia.find({ usuario: usuarioId });
  const porId = {};
  materias.forEach((m) => { porId[String(m._id)] = m; });
  return porId;
};

// HU 08 - Agenda
exports.semana = async (req, res) => {
  try {
    const fechaTexto = req.query.fecha || new Date().toISOString().slice(0, 10);
    const base = new Date(`${fechaTexto}T00:00:00.000Z`);

    if (isNaN(base.getTime())) {
      return res.status(400).json({ ok: false, mensaje: 'Fecha inválida. Usa el formato AAAA-MM-DD' });
    }

    // Lunes de la semana de la fecha indicada
    const lunes = new Date(base);
    lunes.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
    const siguienteLunes = new Date(lunes);
    siguienteLunes.setUTCDate(lunes.getUTCDate() + 7);

    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setUTCDate(lunes.getUTCDate() + i);
      return { dia: NOMBRES_DIA[d.getUTCDay()], numero: d.getUTCDate(), fecha: d.toISOString().slice(0, 10) };
    });

    const tareas = await Tarea
      .find({ usuario: req.usuarioId, fechaEntrega: { $gte: lunes, $lt: siguienteLunes } })
      .sort({ fechaEntrega: 1 });

    const porId = await materiasPorId(req.usuarioId);

    const entregas = tareas.map((t) => {
      const m = porId[String(t.materia)];
      return {
        id: t._id,
        titulo: t.titulo,
        tipo: t.tipo,
        materia: m ? m.nombre : null,
        color: m ? m.color : null,
        fechaEntrega: t.fechaEntrega,
        dia: NOMBRES_DIA[new Date(t.fechaEntrega).getUTCDay()]
      };
    });

    res.status(200).json({
      ok: true,
      desde: dias[0].fecha,
      hasta: dias[6].fecha,
      dias,
      total: entregas.length,
      entregas
    });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU 36 - Recordatorios de entregas próximas
exports.recordatorios = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias, 10) || 3;
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setUTCDate(limite.getUTCDate() + dias + 1);

    const tareas = await Tarea
      .find({
        usuario: req.usuarioId,
        fechaEntrega: { $gte: hoy, $lt: limite },
        ...filtroEstado('pendiente')
      })
      .sort({ fechaEntrega: 1 });

    const porId = await materiasPorId(req.usuarioId);

    const recordatorios = tareas.map((t) => {
      const m = porId[String(t.materia)];
      const diasRestantes = Math.round((new Date(t.fechaEntrega) - hoy) / 86400000);
      const cuando = diasRestantes <= 0 ? 'hoy'
        : diasRestantes === 1 ? 'mañana'
        : `en ${diasRestantes} días`;
      const nombre = m ? m.nombre : t.titulo;
      return {
        tareaId: t._id,
        titulo: t.titulo,
        tipo: t.tipo,
        materia: m ? m.nombre : null,
        color: m ? m.color : null,
        fechaEntrega: t.fechaEntrega,
        diasRestantes,
        mensaje: `Estudia ${nombre} hoy a las 6:00 pm: ${t.titulo} es ${cuando}`
      };
    });

    res.status(200).json({ ok: true, total: recordatorios.length, recordatorios });
  } catch (error) {
    manejarError(res, error);
  }
};