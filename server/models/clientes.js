import mongoose from "mongoose";

const clienteSchema = new mongoose.Schema({
  dni: String,
  nombre: String,
  direccion: String,
  phone: String,
  infoScore: [
    {
      idOrdenService: String,
      codigo: String,
      dateService: {
        fecha: String,
        hora: String,
      },
      score: String,
    },
  ],
  scoreTotal: Number,
});

const clientes = mongoose.model("clientes", clienteSchema);

export default clientes;
