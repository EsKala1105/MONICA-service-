import express from 'express';
import modelImpuesto from '../models/impuesto.js';
const router = express.Router();

router.post('/update-impuesto', (req, res) => {
  const { IGV } = req.body;
  // Encuentra y actualiza el único documento en la colección si existe
  modelImpuesto
    .findOneAndUpdate({}, { IGV }, { new: true })
    // "new: true" devuelve el documento actualizado si se encontró
    .then((updatedImpuesto) => {
      if (updatedImpuesto) {
        res.json(updatedImpuesto);
      } else {
        res.status(404).json({ mensaje: 'No se encontró el impuesto para actualizar' });
      }
    })
    .catch((error) => {
      console.error('Error al actualizar el valor:', error);
      res.status(500).json({ mensaje: 'Error al actualizar el valor' });
    });
});

router.get('/get-impuesto', (req, res) => {
  modelImpuesto
    .findOne() // Intenta encontrar un registro existente
    .then((infoImpuesto) => {
      if (infoImpuesto) {
        res.json(infoImpuesto); // Devuelve el objeto si existe
      } else {
        // Si no existe, crea un nuevo registro con el valor predeterminado
        modelImpuesto
          .create({ IGV: 0.18 })
          .then((nuevoImpuesto) => {
            res.json(nuevoImpuesto);
          })
          .catch((error) => {
            console.error('Error al crear el nuevo impuesto:', error);
            res.status(500).json({ mensaje: 'Error al crear el nuevo impuesto' });
          });
      }
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

export default router;
