import express from "express";
import Asistencia from "../../models/personal/asistencia.js";
import Personal from "../../models/personal/personal.js";
import moment from "moment";
import { updateDateNacimiento } from "./personal.js";
const router = express.Router();

router.get("/get-list-asistencia/:fecha/:idPersonal", async (req, res) => {
  try {
    const fecha = req.params.fecha;
    const idPersonal = req.params.idPersonal;

    // Obtener la información del personal
    const personalInfo = await Personal.findOne({ _id: idPersonal });

    if (!personalInfo) {
      return res
        .status(404)
        .json({ error: "No se encontró información del personal" });
    }

    // Parsear la fecha usando Moment.js
    const momentFecha = moment(fecha, "YYYY-MM-DD");
    // Obtener el año de la fecha proporcionada
    const startOfMonth = momentFecha.startOf("month").format("YYYY-MM-DD");
    const endOfMonth = momentFecha.endOf("month").format("YYYY-MM-DD");

    // Obtener la lista de asistencias del personal en el mes dado
    const listAsistencia = await Asistencia.find({
      idPersonal: idPersonal,
      fecha: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .select("fecha tipoRegistro ingreso salida observacion time")
      .lean();

    // Construir el objeto de información personal
    const infoPersonal = {
      id: personalInfo._id,
      name: personalInfo.name,
      horaIngreso: personalInfo.horaIngreso,
      horaSalida: personalInfo.horaSalida,
      pagoByHour: personalInfo.pagoByHour,
      dateNacimiento: personalInfo.dateNacimiento,
      birthDayUsed: personalInfo.birthDayUsed,
      listAsistencia,
    };

    res.json(infoPersonal);
  } catch (error) {
    console.error("Error al obtener las asistencias:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/registrar-asistencia", async (req, res) => {
  try {
    // Obtener los datos del cuerpo de la solicitud
    const {
      idPersonal,
      fecha,
      tipoRegistro,
      ingreso,
      salida,
      observacion,
      time,
    } = req.body;

    // Crear una instancia del modelo Asistencia con los datos recibidos
    const nuevaAsistencia = new Asistencia({
      idPersonal,
      fecha,
      tipoRegistro,
      ingreso,
      salida,
      observacion,
      time,
    });

    // Guardar la nueva asistencia en la base de datos
    const asistenciaGuardada = await nuevaAsistencia.save();

    if (asistenciaGuardada.tipoRegistro === "cumpleaños") {
      const infoPersonalUpdated = await updateDateNacimiento(
        asistenciaGuardada.idPersonal,
        asistenciaGuardada.fecha,
        "add"
      );
      res.json({
        infoPersonalUpdated,
        newInfoDay: asistenciaGuardada,
      });
    } else {
      // Responder con el objeto guardado y un estado 201 (Creado)
      res.status(201).json({ newInfoDay: asistenciaGuardada });
    }
  } catch (error) {
    // Manejar errores
    res.status(500).json({ message: error.message });
  }
});

router.put("/actualizar-asistencia/:id", async (req, res) => {
  try {
    // Obtener el ID de la asistencia de los parámetros de la solicitud
    const idAsistencia = req.params.id;

    // Obtener los datos actualizados del cuerpo de la solicitud
    const { fecha, tipoRegistro, ingreso, salida, observacion, time } =
      req.body;

    // Buscar la asistencia por su ID
    const asistenciaAntesDeActualizar = await Asistencia.findById(idAsistencia);

    // Verificar si la asistencia existe
    if (!asistenciaAntesDeActualizar) {
      return res.status(404).json({ message: "Asistencia no encontrada" });
    }

    // Actualizar la asistencia
    const asistenciaActualizada = await Asistencia.findByIdAndUpdate(
      idAsistencia,
      {
        fecha,
        tipoRegistro,
        ingreso,
        salida,
        observacion,
        time,
      },
      { new: true } // Para devolver la asistencia actualizada después de la actualización
    );

    // Verificar si la asistencia fue actualizada correctamente
    if (!asistenciaActualizada) {
      return res.status(404).json({ message: "Asistencia no encontrada" });
    }

    if (
      asistenciaAntesDeActualizar.tipoRegistro === "cumpleaños" ||
      asistenciaActualizada.tipoRegistro === "cumpleaños"
    ) {
      const infoPersonalUpdated = await updateDateNacimiento(
        asistenciaActualizada.idPersonal,
        asistenciaActualizada.fecha,
        asistenciaActualizada.tipoRegistro === "cumpleaños" ? "add" : "delete"
      );
      return res.json({
        infoPersonalUpdated,
        newInfoDay: asistenciaActualizada,
      });
    } else {
      // Responder con la asistencia actualizada
      res.json({ newInfoDay: asistenciaActualizada });
    }
  } catch (error) {
    // Manejar errores
    res.status(500).json({ message: error.message });
  }
});

// router.get("/get-reporte-asistencia/personal/:date/:id", async (req, res) => {
//   try {
//     const { date, id } = req.params;
//     const idPersonal = id;

//     res.json("");
//   } catch (error) {
//     console.error("Error al obtener los reportes Asistencia:", error);
//     res.status(500).json({ mensaje: "Error al obtener los reportes anulados" });
//   }
// });

// router.get("/get-reporte-asistencia/general/:date", async (req, res) => {
//   try {
//     const { date, id } = req.params;
//     const idPersonal = id;

//     res.json("");
//   } catch (error) {
//     console.error("Error al obtener los reportes Asistencia:", error);
//     res.status(500).json({ mensaje: "Error al obtener los reportes anulados" });
//   }
// });

export default router;
