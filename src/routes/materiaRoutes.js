const express = require('express');
const router = express.Router();
const {
  crearMateria,
  crearMateriasLote,
  clasesHoy,
  listarMaterias,
  obtenerMateria,
  actualizarMateria,
  eliminarMateria
} = require('../controllers/materiaController');

router.post('/', crearMateria);
router.post('/lote', crearMateriasLote);
router.get('/hoy', clasesHoy);
router.get('/', listarMaterias);
router.get('/:id', obtenerMateria);
router.put('/:id', actualizarMateria);
router.delete('/:id', eliminarMateria);

module.exports = router;