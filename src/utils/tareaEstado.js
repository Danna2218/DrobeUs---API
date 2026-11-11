const Tarea = require('../models/Tarea');

// Detecta en qué campo guarda el modelo Tarea si fue entregada
const campoEstado = ['entregada', 'completada', 'estado', 'hecha']
  .find((c) => Tarea.schema.path(c));
const esBooleano = Boolean(campoEstado) &&
  Tarea.schema.path(campoEstado).instance === 'Boolean';

// Filtro de Mongo para tareas pendientes o entregadas
const filtroEstado = (estado) => {
  if (!campoEstado) return {};
  const entregada = estado === 'entregada';
  if (esBooleano) return { [campoEstado]: entregada };
  return entregada
    ? { [campoEstado]: 'entregada' }
    : { [campoEstado]: { $ne: 'entregada' } };
};

// Marca la tarea como entregada; devuelve false si el modelo no tiene campo de estado
const marcarEntregada = (tarea) => {
  if (!campoEstado) return false;
  tarea[campoEstado] = esBooleano ? true : 'entregada';
  return true;
};

module.exports = { filtroEstado, marcarEntregada };