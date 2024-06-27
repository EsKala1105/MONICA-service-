import mongoose from 'mongoose';

const codFacturaSchema = new mongoose.Schema({
  codInicio: String,
  codFinal: String,
  codActual: Number,
});

const codFactura = mongoose.model('codFactura', codFacturaSchema);

export default codFactura;
