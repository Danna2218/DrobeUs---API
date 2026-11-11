const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const RefreshToken = require('../models/RefreshToken');

const ACCESS_EXPIRA = '15m';
const REFRESH_DIAS = 7;

// ---------- Funciones auxiliares de tokens ----------

// Al refresh token se le guarda solo su hash (SHA-256), nunca el token en claro
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const crearAccessToken = (usuario) =>
  jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRA });

const crearRefreshToken = async (usuarioId) => {
  // jti aleatorio: garantiza que cada refresh token sea único
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

    const accessToken = crearAccessToken(usuario);
    const refreshToken = await crearRefreshToken(usuario._id);

    res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente',
      accessToken,
      refreshToken,
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

// FUNCIONALIDAD 2: Login (ahora entrega access token + refresh token)
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

    const accessToken = crearAccessToken(usuario);
    const refreshToken = await crearRefreshToken(usuario._id);

    res.status(200).json({
      ok: true,
      mensaje: `Hola, ${usuario.nombre}`,
      accessToken,
      refreshToken,
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

// FUNCIONALIDAD 11: Completar o editar perfil (PUT)
exports.actualizarPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, institucion, carrera, periodoActual } = req.body;
        if (id !== req.usuarioId) {
      return res.status(403).json({ ok: false, mensaje: 'No puedes editar el perfil de otro usuario' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, mensaje: 'ID de usuario inválido' });
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

// FUNCIONALIDAD 16: Renovar tokens con ROTACIÓN del refresh token
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ ok: false, mensaje: 'El refresh token es obligatorio' });
    }

    // 1. Verificar firma y vigencia del JWT
    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ ok: false, mensaje: 'Refresh token inválido o expirado' });
    }

    // 2. Buscarlo en la base de datos (por su hash)
    const guardado = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
    if (!guardado) {
      return res.status(401).json({ ok: false, mensaje: 'Refresh token no reconocido' });
    }

    // 3. Detección de reutilización: un token ya rotado no puede volver a usarse.
    //    Si pasa, se asume robo y se cierran todas las sesiones del usuario.
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

    // 4. ROTACIÓN: invalidar el token viejo y emitir uno nuevo de cada tipo
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
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// FUNCIONALIDAD 17: Cerrar sesión (revoca el refresh token)
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ ok: false, mensaje: 'El refresh token es obligatorio' });
    }

    await RefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken) },
      { revocado: true }
    );

    res.status(200).json({ ok: true, mensaje: 'Sesión cerrada correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};