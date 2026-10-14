const express = require('express');
const router = express.Router();
const { crearTarea, tareasPendientes } = require('../controllers/tareaController');

router.post('/', crearTarea);
router.get('/pendientes', tareasPendientes);

module.exports = router;