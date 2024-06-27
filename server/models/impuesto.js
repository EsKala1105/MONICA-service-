import mongoose from 'mongoose';

const ImpuestoSchema = new mongoose.Schema(
  {
    IGV: Number,
  },
  { collection: 'Impuesto' }
);

const Impuesto = mongoose.model('Impuesto', ImpuestoSchema);

export default Impuesto;
