const express = require('express');
const router = express.Router();
const { crearApunte } = require('../controllers/apunteController');

router.post('/', crearApunte);

module.exports = router;