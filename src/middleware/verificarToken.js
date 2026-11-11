const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({
      ok: false,
      codigo: 'TOKEN_AUSENTE',
      mensaje: 'Debes enviar el access token'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        codigo: 'TOKEN_EXPIRADO',
        mensaje: 'El access token expiró'
      });
    }
    return res.status(401).json({
      ok: false,
      codigo: 'TOKEN_INVALIDO',
      mensaje: 'Access token inválido'
    });
  }
};