import mongoose from "mongoose";

const tipoGastosSchema = new mongoose.Schema({
  name: String,
  dateCreation: {
    fecha: String,
    hora: String,
  },
  detalle: String,
  nivel: String,
});

const tipoGastos = mongoose.model("tipoGastos", tipoGastosSchema);

export default tipoGastos;
