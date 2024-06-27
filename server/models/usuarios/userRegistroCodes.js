import mongoose from 'mongoose';

const UserRegistroCodesSchema = new mongoose.Schema(
  {
    idUser: String,
    codigo: String,
  },
  { collection: 'UserRegistroCodes' }
);

const UserRegistroCodes = mongoose.model('UserRegistroCodes', UserRegistroCodesSchema);

export default UserRegistroCodes;
