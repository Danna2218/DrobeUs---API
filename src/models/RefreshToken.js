const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiraEn: { type: Date, required: true },
  revocado: { type: Boolean, default: false },
  reemplazadoPor: { type: String, default: null }
}, { timestamps: true, collection: 'refreshtokens' });

// Índice TTL: MongoDB elimina solo los tokens vencidos
refreshTokenSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);