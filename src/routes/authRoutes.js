const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const {
  registro,
  login,
  actualizarPerfil,
  refresh,
  logout
} = require('../controllers/authController');

router.post('/registro', registro);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.put('/perfil/:id', verificarToken, actualizarPerfil);

module.exports = router;