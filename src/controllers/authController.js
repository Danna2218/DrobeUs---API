const Usuario = require('../models/Usuario');

// FUNCIONALIDAD 1: Registro
exports.registro = async (req, res) => {
  try {
    const { nombre, correo, contrasena, institucion, carrera } = req.body;

    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombre, correo y contraseña son obligatorios'
      });
    }

    const existe = await Usuario.findOne({ correo: correo.toLowerCase() });
    if (existe) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe una cuenta con ese correo'
      });
    }

    const usuario = await Usuario.create({
      nombre,
      correo,
      contrasena,
      institucion,
      carrera
    });

    res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        institucion: usuario.institucion,
        carrera: usuario.carrera,
        periodoActual: usuario.periodoActual
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ ok: false, mensaje: mensajes.join(', ') });
    }
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// FUNCIONALIDAD 2: Login
exports.login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Correo y contraseña son obligatorios'
      });
    }

    const usuario = await Usuario.findOne({ correo: correo.toLowerCase() });
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No existe una cuenta con ese correo'
      });
    }

    const coincide = await usuario.compararContrasena(contrasena);
    if (!coincide) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Contraseña incorrecta'
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: `Hola, ${usuario.nombre}`,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        periodoActual: usuario.periodoActual
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};