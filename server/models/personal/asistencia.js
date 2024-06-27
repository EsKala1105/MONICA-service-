import mongoose from "mongoose";

const asistenciaSchema = new mongoose.Schema({
  idPersonal: String,
  fecha: String,
  tipoRegistro: String,
  ingreso: {
    hora: String,
    saved: Boolean,
  },
  salida: {
    hora: String,
    saved: Boolean,
  },
  observacion: String,
  time: {
    hora: Number,
    minutos: Number,
  },
});

const asistencia = mongoose.model("asistencia", asistenciaSchema);

export default asistencia;
