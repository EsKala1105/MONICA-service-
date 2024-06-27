import express from 'express';
import Producto from '../../models/portafolio/productos.js';
import moment from 'moment'; // Importa moment para trabajar con fechas

const router = express.Router();

router.post('/add-producto', (req, res) => {
  const { nombre, idCategoria, precioVenta, simboloMedida, stockPrincipal, estado, precioTransaccion } = req.body;

  // Agrega la fecha de creación actual
  const dateCreation = moment().format('YYYY-MM-DD');

  const date = {
    fecha: dateCreation,
    hora: moment().format('HH:mm'),
  };

  const newProducto = new Producto({
    nombre,
    idCategoria,
    precioVenta,
    dateCreation,
    simboloMedida,
    stockPrincipal,
    estado,
    inventario: {
      index: '1',
      precioTransaccion,
      tipo: 'abastecimiento',
      date,
      stock: stockPrincipal,
      motivo: 'abastecimiento',
    },
  });

  newProducto
    .save()
    .then((productoGuardado) => {
      res.json(productoGuardado);
    })
    .catch((error) => {
      console.error('Error al Crear Producto:', error);
      res.status(500).json({ mensaje: 'Error al Crear Producto' });
    });
});

router.get('/get-productos', (req, res) => {
  Producto.find()
    .then((productos) => {
      res.json(productos);
    })
    .catch((error) => {
      console.error('Error al obtener productos:', error);
      res.status(500).json({ mensaje: 'Error al obtener productos' });
    });
});

router.put('/update-producto/:idProducto', async (req, res) => {
  const { idProducto } = req.params;
  const { nombre, idCategoria, precioVenta, simboloMedida, estado } = req.body;

  try {
    const updatedProducto = await Producto.findOneAndUpdate(
      { _id: idProducto },
      { $set: { nombre, idCategoria, precioVenta, simboloMedida, estado } },
      { new: true }
    );

    if (updatedProducto) {
      return res.json(updatedProducto);
    } else {
      return res.status(404).json({ mensaje: 'No se encontró el producto' });
    }
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ mensaje: 'Error al actualizar producto' });
  }
});

router.put('/update-inventario/:idProducto', async (req, res) => {
  const { idProducto } = req.params;
  const { precioTransaccion, tipo, stock, motivo } = req.body;

  try {
    // Generar la fecha y hora actual
    const date = {
      fecha: moment().format('YYYY-MM-DD'),
      hora: moment().format('HH:mm'), // Formato de 24 horas
    };

    // Obtener el producto por ID
    const producto = await Producto.findById(idProducto);

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Determinar el índice correcto para el inventario
    let maxIndex = producto.inventario.reduce((max, item) => {
      return Math.max(max, parseInt(item.index) || 0);
    }, 0);

    let newIndex = maxIndex + 1;
    while (producto.inventario.some((item) => item.index === newIndex.toString())) {
      newIndex++;
    }

    // Actualizar el stock principal según el tipo de transacción
    let nuevoStockPrincipal = producto.stockPrincipal;

    if (tipo === 'desabastecimiento') {
      nuevoStockPrincipal -= stock;
    } else if (tipo === 'abastecimiento') {
      nuevoStockPrincipal += stock;
    }

    // Asegúrate de que el stock no sea negativo
    nuevoStockPrincipal = Math.max(nuevoStockPrincipal, 0);

    // Actualizar el producto en la base de datos
    const updatedProducto = await Producto.findOneAndUpdate(
      { _id: idProducto },
      {
        $push: {
          inventario: {
            index: newIndex.toString(),
            precioTransaccion,
            tipo,
            date,
            stock,
            motivo,
          },
        },
        $set: { stockPrincipal: nuevoStockPrincipal },
      },
      { new: true }
    );

    if (updatedProducto) {
      return res.json(updatedProducto);
    } else {
      return res.status(404).json({ mensaje: 'No se encontró el producto' });
    }
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ mensaje: 'Error al actualizar producto' });
  }
});

router.delete('/delete-producto/:idProducto', async (req, res) => {
  const { idProducto } = req.params;

  try {
    // Intenta encontrar y eliminar el producto
    const productoEliminado = await Producto.findByIdAndRemove(idProducto);
    // Verificar si se encontró y eliminó el producto
    if (productoEliminado) {
      return res.json({ mensaje: 'Producto eliminado con éxito' });
    } else {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ mensaje: 'Error al eliminar producto' });
  }
});

export default router;
