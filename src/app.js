require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const materiaRoutes = require('./routes/materiaRoutes');
const apunteRoutes = require('./routes/apunteRoutes');
const tareaRoutes = require('./routes/tareaRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const notaRoutes = require('./routes/notaRoutes');
const verificarToken = require('./middleware/verificarToken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

//Endpoints
app.get('/', (req, res) => res.json({ mensaje: 'API DrobeUs funcionando' }));
app.use('/api/auth', authRoutes);
app.use('/api/materias', verificarToken, materiaRoutes);
app.use('/api/apuntes', verificarToken, apunteRoutes);
app.use('/api/tareas', verificarToken, tareaRoutes);
app.use('/api/agenda', verificarToken, agendaRoutes);
app.use('/api/notas', verificarToken, notaRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

// Otros Errores 
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, mensaje: 'JSON mal formado' });
  }
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
});

connectDB().then(() => {
  console.log('Base de datos en:', mongoose.connection.host);
  app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
});