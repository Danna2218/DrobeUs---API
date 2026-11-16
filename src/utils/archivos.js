const mongoose = require('mongoose');
const Archivo = require('../models/Archivo');

// Cubeta de GridFS: guarda el contenido de los archivos dentro de MongoDB
const bucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'archivos' });

// Borra los archivos (metadatos y contenido) que cumplan el filtro
const borrarArchivosDe = async (filtro) => {
  const lista = await Archivo.find(filtro);
  const b = bucket();
  await Promise.all(lista.map(async (a) => {
    try { await b.delete(a.gridId); } catch (e) { /* ya no existía */ }
  }));
  await Archivo.deleteMany(filtro);
};

module.exports = { bucket, borrarArchivosDe };
