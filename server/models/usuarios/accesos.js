import mongoose from 'mongoose';

const accesosSchema = new mongoose.Schema(
  {
    idUser: String,
    tokens: String,
    // Campo para la expiración de documentos en segundos
    expiracion: { type: Date, default: Date.now, expires: 0 },
  },
  { collection: 'Accesos' }
);

const Accesos = mongoose.model('Accesos', accesosSchema);

export default Accesos;
