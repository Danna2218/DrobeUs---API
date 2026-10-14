const express = require('express');
const router = express.Router();
const { crearMateria, clasesHoy } = require('../controllers/materiaController');

router.post('/', crearMateria);
router.get('/hoy', clasesHoy);

module.exports = router;