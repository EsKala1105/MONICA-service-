import mongoose from 'mongoose';

const puntosSchema = new mongoose.Schema(
  {
    score: String,
    valor: String,
  },
  { collection: 'Puntos' }
);

const Puntos = mongoose.model('Puntos', puntosSchema);

export default Puntos;
