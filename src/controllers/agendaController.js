const mongoose = require('mongoose');
const Tarea = require('../models/Tarea');

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// FUNCIONALIDAD 8: Agenda de la semana (lunes a domingo)
exports.agendaSemana = async (req, res) => {
  try {
    const { usuario, fecha } = req.query;

    if (!usuario) {
      return res.status(400).json({ ok: false, mensaje: 'El parámetro usuario es obligatorio' });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
    }

    // Si no llega fecha, se usa la de hoy. Formato esperado: AAAA-MM-DD
    let base;
    if (fecha) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(new Date(fecha + 'T00:00:00').getTime())) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Fecha inválida. Usa el formato AAAA-MM-DD (ejemplo: 2026-10-13)'
        });
      }
      base = new Date(fecha + 'T00:00:00');
    } else {
      base = new Date();
      base.setHours(0, 0, 0, 0);
    }

    // Calcula el lunes de esa semana
    const diaSemana = base.getDay(); // 0 = domingo
    const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(base);
    lunes.setDate(base.getDate() + diferencia);

    const siguienteLunes = new Date(lunes);
    siguienteLunes.setDate(lunes.getDate() + 7);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const tareas = await Tarea.find({
      usuario,
      fechaEntrega: { $gte: lunes, $lt: siguienteLunes }
    })
      .populate('materia', 'nombre color')
      .sort({ fechaEntrega: 1 });

    const formato = d => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    // Arma los 7 días de la semana
    const semana = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      semana.push({
        fecha: formato(d),
        dia: DIAS[d.getDay()],
        numero: d.getDate(),
        actividades: []
      });
    }

    tareas.forEach(t => {
      const f = new Date(t.fechaEntrega);
      // Se compara por componentes de fecha UTC para evitar desfases de zona horaria
      const clave = `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
      const dia = semana.find(s => s.fecha === clave);
      if (dia) {
        dia.actividades.push({
          id: t._id,
          titulo: t.titulo,
          tipo: t.tipo,
          materia: t.materia ? t.materia.nombre : null,
          color: t.materia ? t.materia.color : null,
          completada: t.completada
        });
      }
    });

    res.status(200).json({
      ok: true,
      semanaDel: formato(lunes),
      al: formato(domingo),
      totalActividades: tareas.length,
      semana
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};