const express = require('express');
const router = express.Router();
const {
  crearTarea,
  tareasPendientes,
  listarTareas,
  obtenerTarea,
  actualizarTarea,
  entregarTarea,
  eliminarTarea
} = require('../controllers/tareaController');

router.post('/', crearTarea);
router.get('/pendientes', tareasPendientes);
router.get('/', listarTareas);
router.get('/:id', obtenerTarea);
router.put('/:id', actualizarTarea);
router.patch('/:id/entregar', entregarTarea);
router.delete('/:id', eliminarTarea);

module.exports = router;