import mongoose from 'mongoose';

const anularSchema = new mongoose.Schema(
  {
    _id: String, // ID de la Orden
    motivo: String,
    fecha: String,
    hora: String,
    idUser: String,
  },
  { collection: 'Anulados' }
);

const Anular = mongoose.model('Anular', anularSchema);

export default Anular;
