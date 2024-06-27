import mongoose from "mongoose";

const NegocioSchema = new mongoose.Schema(
  {
    name: String,
    direccion: String,
    contacto: [
      {
        numero: String,
        index: Number,
      },
    ],
    itemsAtajos: Array,
    itemsInformeDiario: Array,
    rolQAnulan: Array,
    funcionamiento: {
      horas: {
        inicio: String,
        fin: String,
      },
      actividad: Boolean,
    },
    horario: [
      {
        horario: String,
        index: Number,
      },
    ],
    oldOrder: Boolean,
    hasMobility: Boolean,
  },
  { collection: "Negocio" }
);

const Negocio = mongoose.model("Negocio", NegocioSchema);

export default Negocio;
