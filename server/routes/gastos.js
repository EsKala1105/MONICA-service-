import express from "express";
import Gasto from "../models/gastos.js";
import TipoGasto from "../models/tipoGastos.js";
import { openingHours } from "../middleware/middleware.js";
import { handleGetInfoUser } from "./cuadreDiario.js";
import moment from "moment";
import Usuarios from "../models/usuarios/usuarios.js";
import { mapArrayByKey, mapObjectByKey } from "../utils/utilsFuncion.js";
const router = express.Router();

export const handleAddGasto = async (nuevoGasto) => {
  try {
    // Crea una instancia del modelo Gasto con los datos del nuevo gasto
    const gastoNuevo = new Gasto(nuevoGasto);

    // Guarda el nuevo gasto en la base de datos
    const gastoGuardado = await gastoNuevo.save();
    const gastoS = gastoGuardado.toObject();
    // Devuelve el gasto guardado
    return {
      tipo: "added",
      info: {
        ...gastoS,
        infoUser: await handleGetInfoUser(gastoS.idUser),
      },
    };
  } catch (error) {
    console.error("Error al agregar gasto:", error);
    throw error; // Puedes manejar el error según tus necesidades
  }
};

router.post("/add-gasto", openingHours, (req, res) => {
  const { infoGasto } = req.body;
  const { idTipoGasto, tipo, motivo, monto, idUser } = infoGasto;

  const date = {
    fecha: moment().format("YYYY-MM-DD"),
    hora: moment().format("HH:mm"),
  };

  const newGasto = new Gasto({
    idTipoGasto,
    tipo,
    motivo,
    date,
    monto,
    idUser,
  });

  newGasto
    .save()
    .then(async (gastoSaved) => {
      const gastoS = gastoSaved.toObject();
      res.json({
        tipo: "added",
        info: {
          ...gastoS,
          infoUser: await handleGetInfoUser(gastoS.idUser),
        },
      });
    })
    .catch((error) => {
      console.error("Error al Guardar Delivery:", error);
      res.status(500).json({ mensaje: "Error al Guardar Delivery" });
    });
});

router.get("/get-gastos/:fecha", async (req, res) => {
  try {
    const fecha = req.params.fecha;

    // Parsear la fecha usando Moment.js
    const momentFecha = moment(fecha, "YYYY-MM-DD");
    const inicioMes = moment(momentFecha).startOf("month").format("YYYY-MM-DD");
    const finMes = moment(momentFecha).endOf("month").format("YYYY-MM-DD");

    // Consultar los gastos en el rango de fechas especificado
    const gastos = await Gasto.find({
      "date.fecha": {
        $gte: inicioMes,
        $lte: finMes,
      },
    });

    // Obtener los IDs únicos Usuario
    const usuariosIds = [...new Set(gastos.map((gasto) => gasto.idUser))];

    // Consultar los tipos de gastos necesarios
    const tiposGastos = await TipoGasto.find();

    // Consultar la información de usuario solo para los IDs necesarios
    const usuariosInfo = await Usuarios.find(
      { _id: { $in: usuariosIds } },
      { name: 1, rol: 1, usuario: 1 }
    );

    // Convertir la información de usuario a un mapa para un acceso más eficiente
    const usuariosMap = mapObjectByKey(usuariosInfo, "_id");
    const gastosMap = mapArrayByKey(gastos, "idTipoGasto");

    // Procesar los gastos y calcular los totales por tipo de gasto
    const tipoGastosArray = [];
    for (const tipoGasto of tiposGastos) {
      const gastosTipo = gastosMap[tipoGasto._id] || [];
      const totalMonto = gastosTipo.reduce(
        (total, gasto) => total + parseFloat(gasto.monto),
        0
      );
      const infoGastos = gastosTipo.map((gasto) => ({
        motivo: gasto.motivo,
        date: gasto.date,
        monto: parseFloat(gasto.monto),
        infoUser: usuariosMap[gasto.idUser] || null,
      }));
      tipoGastosArray.push({
        id: tipoGasto._id,
        name: tipoGasto.name,
        cantidad: gastosTipo.length,
        monto: totalMonto,
        infoGastos: infoGastos,
      });
    }

    res.json(tipoGastosArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para eliminar un gasto por su ID
router.delete("/delete-gasto/:id", openingHours, async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar y eliminar el gasto por su ID
    const gastoEliminado = await Gasto.findByIdAndDelete(id);
    if (!gastoEliminado) {
      throw new Error("No se encontró el gasto para eliminar");
    }

    res.json({
      tipo: "deleted",
      info: {
        ...gastoEliminado.toObject(),
      },
    });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);
    res.status(500).json({ mensaje: "Error al eliminar el gasto" });
  }
});

export default router;
