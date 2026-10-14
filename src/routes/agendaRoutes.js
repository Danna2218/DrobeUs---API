const express = require('express');
const router = express.Router();
const { agendaSemana } = require('../controllers/agendaController');

router.get('/semana', agendaSemana);

module.exports = router;