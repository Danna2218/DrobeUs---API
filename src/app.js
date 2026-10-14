require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const materiaRoutes = require('./routes/materiaRoutes');
const apunteRoutes = require('./routes/apunteRoutes');
const tareaRoutes = require('./routes/tareaRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const notaRoutes = require('./routes/notaRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ mensaje: 'API DrobeUs funcionando' }));
app.use('/api/auth', authRoutes);
app.use('/api/materias', materiaRoutes);
app.use('/api/apuntes', apunteRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/notas', notaRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

// Errores no controlados (por ejemplo, JSON mal formado)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, mensaje: 'JSON mal formado' });
  }
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
});

connectDB().then(() => {
  app.listen(process.env.PORT, () =>
    console.log(`Servidor en http://localhost:${process.env.PORT}`));
});