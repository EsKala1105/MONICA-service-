import express from 'express';
import codFactura from '../models/codigoFactura.js';

const router = express.Router();

router.post('/add-cod', (req, res) => {
  const { codInicio, codFinal, codActual } = req.body;

  const newCodFactura = new codFactura({
    codInicio,
    codFinal,
    codActual,
  });

  newCodFactura
    .save()
    .then(() => res.send('Datos guardados correctamente'))
    .catch((error) => {
      console.error('Error al guardar los datos:', error);
      res.status(500).json({ mensaje: 'Error al guardar los datos' });
    });
});

router.get('/get-cod', (req, res) => {
  codFactura
    .find()
    .then((codigos) => {
      res.json(codigos[0]);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

router.put('/update-cod', (req, res) => {
  const { codInicio, codFinal, codActual } = req.body;

  codFactura
    .findOneAndUpdate({}, { codInicio, codFinal, codActual }, { new: true })
    .then((updatedCod) => {
      if (updatedCod) {
        // updatedCod - obtiene los datos actualizados
        res.json(updatedCod);
      } else {
        res.status(404).json({ mensaje: 'Código de factura no encontrado' });
      }
    })
    .catch((error) => {
      console.error('Error al actualizar los datos:', error);

      res.status(500).json({ mensaje: 'Error al actualizar los datos' });
    });
});

router.put('/update-next-cod', async (req, res) => {
  try {
    const updatedCod = await codFactura.findOneAndUpdate({}, { $inc: { codActual: 1 } }, { new: true });

    if (updatedCod) {
      if (updatedCod.codActual > updatedCod.codFinal) {
        updatedCod.codActual = 1;
        await updatedCod.save();
      }

      res.json(updatedCod);
    } else {
      return res.status(404).json({ mensaje: 'Código de factura no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar los datos:', error);
    res.status(500).json({ mensaje: 'Error al actualizar los datos' });
  }
});

export default router;
