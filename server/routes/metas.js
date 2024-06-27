import express from 'express';
import modelMetas from '../models/metas.js';
const router = express.Router();

router.get('/get-metas', async (req, res) => {
  try {
    // Intenta encontrar un registro existente
    const infoMetas = await modelMetas.findOne();

    if (infoMetas) {
      res.json(infoMetas);
    } else {
      // Si no existe, crea un nuevo registro con los valores predeterminados
      const metasPorDefecto = {
        Tienda: 250,
        Delivery: 100,
        Total: 350,
      };

      const nuevasMetas = await modelMetas.create(metasPorDefecto);
      res.json(nuevasMetas);
    }
  } catch (error) {
    console.error('Error al obtener los datos:', error);
    res.status(500).json({ mensaje: 'Error al obtener los datos' });
  }
});

// Middleware de validación para verificar si los valores son numéricos
function validarValoresNumericos(req, res, next) {
  for (const key in req.body) {
    if (isNaN(req.body[key])) {
      return res.status(400).json({ mensaje: `El valor para ${key} no es numérico` });
    }
  }
  next();
}

// Ruta para actualizar las metas con validación
router.put('/update-metas', validarValoresNumericos, async (req, res) => {
  try {
    // Busca las metas existentes en la base de datos
    const infoMetas = await modelMetas.findOne();

    // Comprueba si los datos a actualizar existen en el cuerpo de la solicitud
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ mensaje: 'Los datos de actualización son requeridos' });
    }

    // Actualiza los valores de las metas con los datos proporcionados en el cuerpo de la solicitud
    Object.assign(infoMetas, req.body);

    const metasActualizadas = await infoMetas.save();

    res.json(metasActualizadas);
  } catch (error) {
    console.error('Error al actualizar los datos de Metas:', error);
    res.status(500).json({ mensaje: 'Error al actualizar los datos de Metas' });
  }
});

export default router;
