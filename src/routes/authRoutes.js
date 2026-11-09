const express = require('express');
const router = express.Router();
const { registro, login, actualizarPerfil } = require('../controllers/authController');

router.post('/registro', registro);
router.post('/login', login);
router.put('/perfil/:id', actualizarPerfil);

module.exports = router;