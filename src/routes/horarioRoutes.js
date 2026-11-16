const express = require('express');
const router = express.Router();
const subida = require('../utils/subida');
const { analizarHorario } = require('../controllers/horarioController');

router.post('/analizar', subida('archivo'), analizarHorario);

module.exports = router;
