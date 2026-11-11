const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const {
  registro,
  login,
  refresh,
  logout,
  actualizarPerfil,
  miPerfil,
  eliminarCuenta
} = require('../controllers/authController');

router.post('/registro', registro);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/yo', verificarToken, miPerfil);
router.put('/perfil/:id', verificarToken, actualizarPerfil);
router.delete('/cuenta', verificarToken, eliminarCuenta);

module.exports = router;