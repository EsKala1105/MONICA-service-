import mongoose from 'mongoose';

const cuponSchema = new mongoose.Schema(
  {
    codigoPromocion: String,
    codigoCupon: String,
    estado: Boolean,
    dateCreation: {
      fecha: String,
      hora: String,
    },
    dateUse: {
      fecha: String,
      hora: String,
    },
  },
  { collection: 'Cupones' }
);

const Cupones = mongoose.model('Cupones', cuponSchema);

export default Cupones;
