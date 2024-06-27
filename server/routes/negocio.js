import express from "express";
import Negocio from "../models/negocio.js";

const router = express.Router();

router.get("/get-info-negocio", async (req, res) => {
  try {
    // Intenta encontrar el único registro en la colección
    const negocio = await Negocio.findOne();

    if (negocio) {
      // Si se encuentra un registro, responde con ese registro
      return res.json(negocio);
    } else {
      // Si no se encuentra ningún registro, crea uno en base al modelo y responde con él
      const nuevoNegocio = new Negocio({
        name: "EsKala",
        direccion: "av. unknown 123",
        contacto: [
          {
            numero: "123456789",
            index: 0,
          },
        ],
        itemsAtajos: [],
        itemsInformeDiario: [],
        rolQAnulan: ["gerente", "admin", "coord"],
        funcionamiento: {
          horas: {
            inicio: "06:00",
            fin: "20:00",
          },
          actividad: true,
        },
        horario: [
          {
            horario: "Lun a Dom - 06:00 AM a 08:00 PM",
            index: 1,
          },
        ],
        oldOrder: true,
        hasMobility: true,
      });

      await nuevoNegocio.save();

      return res.json(nuevoNegocio);
    }
  } catch (error) {
    // Manejo de errores
    console.error(error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

router.put("/update-info-negocio", async (req, res) => {
  try {
    // Intenta encontrar el único registro en la colección
    const negocio = await Negocio.findOne();

    if (!negocio) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    // Actualiza los campos del registro con los datos proporcionados en la solicitud
    Object.assign(negocio, req.body);

    // Guarda los cambios en la base de datos
    await negocio.save();
    return res.json(negocio);
  } catch (error) {
    // Manejo de errores
    console.error(error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

export default router;
