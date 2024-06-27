import mongoose from "mongoose";

const ProductoSchema = new mongoose.Schema(
  {
    nombre: String,
    idCategoria: String,
    precioVenta: Number,
    dateCreation: String,
    simboloMedida: String,
    stockPrincipal: Number,
    estado: Boolean,
    inventario: [
      {
        index: String,
        precioTransaccion: Number,
        tipo: String,
        date: {
          fecha: String,
          hora: String,
        },
        stock: String,
        motivo: String,
      },
    ],
  },
  { collection: "Producto" }
);

const Producto = mongoose.model("Producto", ProductoSchema);

export default Producto;
