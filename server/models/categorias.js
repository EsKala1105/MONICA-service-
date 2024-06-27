import mongoose from 'mongoose';

const categoriasSchema = new mongoose.Schema({
  name: String,
  tipo: String,
  nivel: String,
  dateCreation: String,
});

const categorias = mongoose.model('categorias', categoriasSchema);

export default categorias;
