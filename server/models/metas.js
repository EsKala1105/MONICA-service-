import mongoose from 'mongoose';

const MetasSchema = new mongoose.Schema(
  {
    Tienda: Number,
    Delivery: Number,
    Total: Number,
  },
  { collection: 'Metas' }
);

const Metas = mongoose.model('Metas', MetasSchema);

export default Metas;
