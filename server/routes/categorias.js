import express from "express";
import Categoria from "../models/categorias.js";
import Producto from "../models/portafolio/productos.js";
import Servicio from "../models/portafolio/servicios.js";
import moment from "moment";

const router = express.Router();

router.post("/add-categoria", (req, res) => {
  const { name, tipo } = req.body;

  // Agrega la fecha de creación actual
  const dateCreation = moment().format("YYYY-MM-DD");

  const newCategoria = new Categoria({
    name,
    tipo,
    nivel: "secundario",
    dateCreation, // Agrega la fecha de creación al objeto de categoría
  });

  newCategoria
    .save()
    .then((categoriaGuardado) => {
      res.json(categoriaGuardado);
    })
    .catch((error) => {
      console.error("Error al Crear Categoria:", error);
      res.status(500).json({ mensaje: "Error al Crear Categoria" });
    });
});

router.get("/get-categorias", async (req, res) => {
  try {
    let categoriaUnico = {
      name: "Unico",
      tipo: "Servicio",
      nivel: "primario",
    };

    // Verificar si la categoría ya existe
    let categoria = await Categoria.findOne(categoriaUnico);
    if (!categoria) {
      // Si no existe, crea la categoría
      categoria = new Categoria({
        ...categoriaUnico,
        dateCreation: moment().format("YYYY-MM-DD"),
      });
      await categoria.save();
    }

    // Datos de servicios a registrar
    const serviciosARegistrar = [
      { nombre: "Delivery", precioVenta: 6, simboloMedida: "vj" },
      { nombre: "Otros", precioVenta: 0, simboloMedida: "u" },
    ];

    // Crear o verificar la existencia de servicios
    await Promise.all(
      serviciosARegistrar.map(async (servicio) => {
        const servicioExistente = await Servicio.findOne({
          nombre: servicio.nombre,
          idCategoria: categoria._id,
        });

        if (!servicioExistente) {
          const newServicio = new Servicio({
            ...servicio,
            idCategoria: categoria._id,
            dateCreation: moment().format("YYYY-MM-DD"),
            estado: true,
          });
          await newServicio.save();
        }
      })
    );

    // Obtener todas las categorías
    const categorias = await Categoria.find();
    res.json(categorias);
  } catch (error) {
    console.error("Error en el proceso:", error);
    res.status(500).json({ mensaje: "Error en el proceso" });
  }
});

router.put("/update-categorias/:idCategoria", async (req, res) => {
  const { idCategoria } = req.params;
  const { name, tipo } = req.body;

  try {
    // Buscar la categoría por su id
    const updatedCategoria = await Categoria.findOneAndUpdate(
      { _id: idCategoria }, // Utiliza _id en lugar de idCategoria
      { $set: { name, tipo } },
      { new: true }
    );

    // Verificar si se encontró y actualizó la categoría
    if (updatedCategoria) {
      return res.json(updatedCategoria); // Devolver la categoría actualizada
    } else {
      return res.status(404).json({ mensaje: "No se encontró la categoría" }); // Manejar el caso en que no se encuentre la categoría
    }
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    res.status(500).json({ mensaje: "Error al actualizar categoría" }); // Manejar errores internos del servidor
  }
});

// Ruta para eliminar una categoría
router.delete("/delete-categoria/:idCategoria", async (req, res) => {
  const { idCategoria } = req.params;

  try {
    // Verificar si hay productos vinculados a la categoría
    const productosVinculados = await Producto.find({ idCategoria });

    // Verificar si hay servicios vinculados a la categoría
    const serviciosVinculados = await Servicio.find({ idCategoria });

    // Si hay productos o servicios vinculados, devolver la lista de los ítems asociados
    if (productosVinculados.length > 0 || serviciosVinculados.length > 0) {
      const productos = productosVinculados.map((producto) => ({
        tipo: "Producto",
        nombre: producto.nombre,
      }));
      const servicios = serviciosVinculados.map((servicio) => ({
        tipo: "Servicio",
        nombre: servicio.nombre,
      }));
      const itemsAsociados = [...productos, ...servicios];
      return res.status(400).json({
        mensaje:
          "No se puede eliminar la categoría porque existen productos o servicios asociados.",
        itemsAsociados,
      });
    }

    // Si no hay productos ni servicios vinculados, eliminar la categoría
    await Categoria.findByIdAndRemove(idCategoria);
    return res.json({ mensaje: "Categoría eliminada con éxito." });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    res.status(500).json({ mensaje: "Error al eliminar categoría" });
  }
});

export default router;
