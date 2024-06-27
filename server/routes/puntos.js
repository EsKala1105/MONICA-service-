import express from 'express';
import modelPuntos from '../models/puntos.js';
const router = express.Router();

router.post('/update-point-value', (req, res) => {
  const { score, valor } = req.body;
  // Encuentra y actualiza el único documento en la colección
  modelPuntos
    .findOneAndUpdate({}, { score, valor }, { new: true, upsert: true })
    // "new: true" devuelve el documento actualizado, "upsert: true" crea uno si no existe
    .then((updatedValue) => {
      res.json(updatedValue);
    })
    .catch((error) => {
      console.error('Error al actualizar el valor:', error);
      res.status(500).json({ mensaje: 'Error al actualizar el valor' });
    });
});

router.get('/get-point-value', (req, res) => {
  modelPuntos
    .findOne()
    .then((infoPuntos) => {
      if (!infoPuntos) {
        // Si no se encontró un objeto de información de puntos, crea uno
        const newInfoPuntos = new modelPuntos({
          score: '10',
          valor: '1',
        });

        return newInfoPuntos.save(); // Guarda el nuevo objeto en la base de datos
      }

      return infoPuntos; // Devuelve el objeto existente
    })
    .then((result) => {
      res.json(result); // Devuelve el objeto directamente
    })
    .catch((error) => {
      console.error('Error al obtener o crear los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener o crear los datos' });
    });
});
export default router;
