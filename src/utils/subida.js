const multer = require('multer');

// Recibe un archivo en memoria (campo multipart) con límite de tamaño
module.exports = (campo, limiteMB = 10) => {
  const subir = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limiteMB * 1024 * 1024 }
  }).single(campo);

  return (req, res, next) => {
    subir(req, res, (error) => {
      if (!error) return next();
      const mensaje = error.code === 'LIMIT_FILE_SIZE'
        ? `El archivo supera los ${limiteMB} MB`
        : 'No se pudo leer el archivo enviado';
      res.status(400).json({ ok: false, mensaje });
    });
  };
};
