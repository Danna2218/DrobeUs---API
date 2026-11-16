const express = require('express');
const router = express.Router();
const subida = require('../utils/subida');
const {
  subirArchivo,
  listarArchivos,
  descargarArchivo,
  eliminarArchivo
} = require('../controllers/archivoController');

router.post('/', subida('archivo'), subirArchivo);
router.get('/', listarArchivos);
router.get('/:id/descargar', descargarArchivo);
router.delete('/:id', eliminarArchivo);

module.exports = router;
