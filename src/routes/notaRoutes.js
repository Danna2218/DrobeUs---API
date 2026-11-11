const express = require('express');
const router = express.Router();
const {
  crearNota,
  promedio,
  listarNotas,
  actualizarNota,
  eliminarNota
} = require('../controllers/notaController');

router.post('/', crearNota);
router.get('/promedio', promedio);
router.get('/', listarNotas);
router.put('/:id', actualizarNota);
router.delete('/:id', eliminarNota);

module.exports = router;