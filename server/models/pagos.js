import mongoose from "mongoose";

const pagosSchema = new mongoose.Schema({
  idOrden: String,
  date: {
    fecha: String,
    hora: String,
  },
  metodoPago: String,
  total: Number,
  idUser: String,
  isCounted: Boolean,
});

const Pagos = mongoose.model("pagos", pagosSchema);

export default Pagos;
