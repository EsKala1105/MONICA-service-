import mongoose from 'mongoose';

const AlmacenSchema = new mongoose.Schema(
  {
    serviceOrder: [],
    storageDate: {
      fecha: String,
      hora: String,
    },
  },
  { collection: 'Almacen' }
);

const Almacen = mongoose.model('Almacen', AlmacenSchema);

export default Almacen;
  