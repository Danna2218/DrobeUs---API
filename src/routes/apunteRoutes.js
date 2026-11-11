const express = require('express');
const router = express.Router();
const {
  crearApunte,
  listarApuntes,
  obtenerApunte,
  actualizarApunte,
  eliminarApunte
} = require('../controllers/apunteController');

router.post('/', crearApunte);
router.get('/', listarApuntes);
router.get('/:id', obtenerApunte);
router.put('/:id', actualizarApunte);
router.delete('/:id', eliminarApunte);

module.exports = router;