import express from "express";
import clientes from "../models/clientes.js";

const router = express.Router();

router.post("/add-cliente", async (req, res) => {
  const { dni, nombre, phone, infoScore } = req.body;

  try {
    const filter = { dni };
    const update = {
      $set: {
        nombre,
        phone,
      },
      $push: {
        infoScore: {
          idOrdenService: infoScore.idOrdenService,
          codigo: infoScore.codigo,
          dateService: infoScore.dateService,
          score: infoScore.score,
        },
      },
      $inc: {
        scoreTotal: infoScore.score,
      },
    };

    const result = await clientes.updateOne(filter, update, { upsert: true });

    if (result.upsertedCount === 1) {
      res.send("Nuevo cliente creado correctamente");
    } else {
      res.send("Datos actualizados correctamente");
    }
  } catch (error) {
    console.error("Error al guardar o actualizar los datos:", error);
    res
      .status(500)
      .json({ mensaje: "Error al guardar o actualizar los datos" });
  }
});

router.get("/get-clientes/:dniPart?", (req, res) => {
  const dniPart = req.params.dniPart;

  // Comprobar si dniPart no tiene valor
  if (!dniPart || dniPart.trim().length === 0) {
    // Si dniPart está vacío, devolver un array vacío como resultado
    return res.json([]);
  }

  clientes
    .find({ dni: { $regex: `^${dniPart}`, $options: "i" } })
    .limit(7)
    .then((clientes) => {
      res.json(clientes);
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

router.get("/get-specific-cliente/:document", async (req, res) => {
  try {
    const documento = req.params.document;
    const cliente = await clientes.findOne({ dni: documento });
    if (!cliente) {
      return res.status(404).json(null); // Devolver un código de estado 404 si el cliente no se encuentra
    }
    res.json(cliente);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).json({ mensaje: "Error al obtener los datos" });
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

export default router;
