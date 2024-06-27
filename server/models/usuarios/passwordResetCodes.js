import mongoose from 'mongoose';

const PasswordResetCodesSchema = new mongoose.Schema(
  {
    idUser: String,
    codigo: String,
    // Campo para la expiración de documentos en segundos
    expiracion: { type: Date, default: Date.now, expires: 0 },
  },
  { collection: 'PasswordResetCodes' }
);

const PasswordResetCodes = mongoose.model('PasswordResetCodes', PasswordResetCodesSchema);

export default PasswordResetCodes;
