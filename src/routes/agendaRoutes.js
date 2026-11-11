const express = require('express');
const router = express.Router();
const { semana, recordatorios } = require('../controllers/agendaController');

router.get('/semana', semana);
router.get('/recordatorios', recordatorios);

module.exports = router;