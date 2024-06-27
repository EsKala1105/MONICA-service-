import mongoose from "mongoose";

const personalSchema = new mongoose.Schema({
  name: String,
  horaIngreso: String,
  horaSalida: String,
  pagoByHour: Number,
  dateNacimiento: String,
  birthDayUsed: Array,
});

const personal = mongoose.model("personal", personalSchema);

export default personal;
