const express = require('express');
const router = express.Router();
const { crearNota, promedio } = require('../controllers/notaController');

router.post('/', crearNota);
router.get('/promedio', promedio);

module.exports = router;