module.exports = (res, error) => {
  if (error.name === 'ValidationError') {
    const mensajes = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ ok: false, mensaje: mensajes.join(', ') });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ ok: false, mensaje: 'Algún dato tiene un formato inválido' });
  }
  console.error(error);
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
};