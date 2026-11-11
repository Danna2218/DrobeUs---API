const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const RefreshToken = require('../models/RefreshToken');
const Materia = require('../models/Materia');
const Apunte = require('../models/Apunte');
const Tarea = require('../models/Tarea');
const Nota = require('../models/Nota');
const manejarError = require('../utils/manejarError');

const ACCESS_EXPIRA = '15m';
const REFRESH_DIAS = 7;

// ---------- Funciones auxiliares de tokens ----------
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const crearAccessToken = (usuario) =>
  jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRA });

const crearRefreshToken = async (usuarioId) => {
  const token = jwt.sign(
    { id: usuarioId, jti: crypto.randomBytes(16).toString('hex') },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_DIAS}d` }
  );
  await RefreshToken.create({
    usuario: usuarioId,
    tokenHash: hashToken(token),
    expiraEn: new Date(Date.now() + REFRESH_DIAS * 24 * 60 * 60 * 1000)
  });
  return token;
};

const datosUsuario = (u) => ({
  id: u._id,
  nombre: u.nombre,
  correo: u.correo,
  institucion: u.institucion,
  carrera: u.carrera,
  periodoActual: u.periodoActual
});

// HU01: Registro
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
      return res.status(409).json({ ok: false, mensaje: 'Ya existe una cuenta con ese correo' });
    }

    const usuario = await Usuario.create({ nombre, correo, contrasena, institucion, carrera });

    res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente',
      accessToken: crearAccessToken(usuario),
      refreshToken: await crearRefreshToken(usuario._id),
      usuario: datosUsuario(usuario)
    });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU02: Login
exports.login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ ok: false, mensaje: 'Correo y contraseña son obligatorios' });
    }

    const usuario = await Usuario.findOne({ correo: correo.toLowerCase() });
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'No existe una cuenta con ese correo' });
    }

    const coincide = await usuario.compararContrasena(contrasena);
    if (!coincide) {
      return res.status(401).json({ ok: false, mensaje: 'Contraseña incorrecta' });
    }

    res.status(200).json({
      ok: true,
      mensaje: `Hola, ${usuario.nombre}`,
      accessToken: crearAccessToken(usuario),
      refreshToken: await crearRefreshToken(usuario._id),
      usuario: datosUsuario(usuario)
    });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU11: Completar o editar perfil
exports.actualizarPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, institucion, carrera, periodoActual } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
    }
    if (id !== String(req.usuarioId)) {
      return res.status(403).json({ ok: false, mensaje: 'No puedes editar el perfil de otro usuario' });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario no existe' });
    }

    if (nombre !== undefined) usuario.nombre = nombre;
    if (institucion !== undefined) usuario.institucion = institucion;
    if (carrera !== undefined) usuario.carrera = carrera;
    if (periodoActual !== undefined) usuario.periodoActual = periodoActual;
    await usuario.save();

    res.status(200).json({
      ok: true,
      mensaje: 'Perfil actualizado correctamente',
      usuario: datosUsuario(usuario)
    });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU16: Renovar tokens con rotación del refresh token
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ ok: false, mensaje: 'El refresh token es obligatorio' });
    }

    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ ok: false, mensaje: 'Refresh token inválido o expirado' });
    }

    const guardado = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
    if (!guardado) {
      return res.status(401).json({ ok: false, mensaje: 'Refresh token no reconocido' });
    }

    // Reutilización de un token ya rotado: se asume robo y se cierran todas las sesiones
    if (guardado.revocado) {
      await RefreshToken.updateMany(
        { usuario: guardado.usuario, revocado: false },
        { revocado: true }
      );
      return res.status(401).json({
        ok: false,
        mensaje: 'Refresh token ya utilizado. Por seguridad se cerraron todas tus sesiones'
      });
    }

    const usuario = await Usuario.findById(guardado.usuario);
    if (!usuario) {
      return res.status(401).json({ ok: false, mensaje: 'El usuario no existe' });
    }

    // Rotación: se invalida el token viejo y se emite uno nuevo
    const nuevoRefresh = await crearRefreshToken(usuario._id);
    guardado.revocado = true;
    guardado.reemplazadoPor = hashToken(nuevoRefresh);
    await guardado.save();

    res.status(200).json({
      ok: true,
      mensaje: 'Tokens renovados correctamente',
      accessToken: crearAccessToken(usuario),
      refreshToken: nuevoRefresh
    });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU17: Cerrar sesión
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ ok: false, mensaje: 'El refresh token es obligatorio' });
    }

    await RefreshToken.updateOne({ tokenHash: hashToken(refreshToken) }, { revocado: true });
    res.status(200).json({ ok: true, mensaje: 'Sesión cerrada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU18: Ver mi perfil
exports.miPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario no existe' });
    }
    res.status(200).json({ ok: true, usuario: datosUsuario(usuario) });
  } catch (error) {
    manejarError(res, error);
  }
};

// HU19: Eliminar mi cuenta y todos mis datos
exports.eliminarCuenta = async (req, res) => {
  try {
    const { contrasena } = req.body;
    if (!contrasena) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña es obligatoria para confirmar' });
    }

    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario no existe' });
    }

    const coincide = await usuario.compararContrasena(contrasena);
    if (!coincide) {
      return res.status(403).json({ ok: false, mensaje: 'Contraseña incorrecta' });
    }

    await Promise.all([
      Apunte.deleteMany({ usuario: usuario._id }),
      Tarea.deleteMany({ usuario: usuario._id }),
      Nota.deleteMany({ usuario: usuario._id }),
      Materia.deleteMany({ usuario: usuario._id }),
      RefreshToken.deleteMany({ usuario: usuario._id })
    ]);
    await usuario.deleteOne();

    res.status(200).json({ ok: true, mensaje: 'Cuenta eliminada junto con todos tus datos' });
  } catch (error) {
    manejarError(res, error);
  }
};