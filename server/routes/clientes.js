import express from "express";
import clientes from "../models/clientes.js";

const router = express.Router();

router.post("/add-cliente", async (req, res) => {
  const { dni, nombre, direccion, phone } = req.body;

  try {
    // Crear un nuevo cliente
    const nuevoCliente = new clientes({
      dni,
      nombre,
      direccion,
      phone,
      infoScore: [],
      scoreTotal: 0,
    });

    // Guardar el nuevo cliente en la base de datos
    await nuevoCliente.save();

    // Enviar una respuesta exitosa
    res.status(201).json(nuevoCliente);
  } catch (error) {
    // Enviar un mensaje de error si ocurre algún problema durante la creación del cliente
    console.error("Error al agregar cliente:", error);
    res.status(500).json({ mensaje: "Error al agregar cliente" });
  }
});

router.put("/update-puntos-orden-servicio/:dni", async (req, res) => {
  const dni = req.params.dni;
  const idOrdenService = req.body.idOrdenService;

  try {
    if (!dni?.trim() || !idOrdenService?.trim()) {
      return res
        .status(400)
        .json({ mensaje: "DNI o ID de Orden de Servicio no proporcionados" });
    }

    const cliente = await clientes.findOne({ dni: dni });

    if (!cliente) {
      return res.json({
        mensaje: "No existe un cliente con el DNI proporcionado",
      });
    }

    const infoScoreToRemove = cliente.infoScore.find(
      (info) => info.idOrdenService === idOrdenService
    );

    if (!infoScoreToRemove) {
      return res.json({
        mensaje: "No se encontró una orden de servicio con el ID proporcionado",
      });
    }

    const puntajeEliminado = parseInt(infoScoreToRemove.score, 10);

    cliente.infoScore = cliente.infoScore.filter(
      (info) => info.idOrdenService !== idOrdenService
    );

    // Recalcular scoreTotal sumando todos los scores restantes
    cliente.scoreTotal = cliente.infoScore
      .reduce((total, info) => total + parseInt(info.score, 10), 0)
      .toString();

    await cliente.save();

    res.json({ mensaje: "Puntaje eliminado exitosamente" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ mensaje: "Error al procesar la solicitud" });
  }
});

router.get("/get-info-clientes", async (req, res) => {
  try {
    const allClientes = await clientes.find();
    res.json(allClientes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los clientes", error });
  }
});

router.put("/edit-cliente/:id", async (req, res) => {
  const clientId = req.params.id;
  const { dni, nombre, phone, direccion } = req.body;

  try {
    // Verificar si el cliente existe
    const clienteExistente = await clientes.findById(clientId);

    if (!clienteExistente) {
      return res.status(404).json({ mensaje: "Cliente no encontrado" });
    }

    // Actualizar los datos del cliente
    clienteExistente.dni = dni;
    clienteExistente.nombre = nombre;
    clienteExistente.direccion = direccion;
    clienteExistente.phone = phone;

    // Guardar los cambios y obtener el cliente actualizado
    const clienteActualizado = await clienteExistente.save();

    // Enviar el cliente actualizado junto con un mensaje de éxito
    res.json(clienteActualizado);
  } catch (error) {
    console.error("Error al editar el cliente:", error);
    res.status(500).json({ mensaje: "Error al editar el cliente" });
  }
});

router.delete("/delete-cliente/:id", async (req, res) => {
  const clientId = req.params.id;

  try {
    // Eliminar el cliente por su ID y obtener el cliente eliminado
    const deletedCliente = await clientes.findByIdAndDelete(clientId);

    if (!deletedCliente) {
      return res.status(404).json({ mensaje: "Cliente no encontrado" });
    }

    // Enviar el ID del cliente eliminado junto con un mensaje de éxito
    res.json(deletedCliente);
  } catch (error) {
    console.error("Error al eliminar el cliente:", error);
    res.status(500).json({ mensaje: "Error al eliminar el cliente" });
  }
});

export default router;
