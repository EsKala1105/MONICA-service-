import mongoose from "mongoose";

const PromocionesSchema = new mongoose.Schema(
  {
    codigo: String,
    prenda: Array,
    cantidadMin: Number,
    alcance: String,
    tipoDescuento: String,
    tipoPromocion: String,
    descripcion: String,
    descuento: Number,
    vigencia: Number,
    state: String,
  },
  { collection: "Promocion" }
);

const Promocion = mongoose.model("Promocion", PromocionesSchema);

export default Promocion;
