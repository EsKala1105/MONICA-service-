import express from "express";
import Personal from "../../models/personal/personal.js";
import moment from "moment";
const router = express.Router();

router.get("/get-personal", async (req, res) => {
  try {
    const listPersonal = await Personal.find();
    res.status(200).json(listPersonal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/registrar-personal", async (req, res) => {
  try {
    // Obtener los datos del cuerpo de la solicitud
    const { name, horaIngreso, horaSalida, pagoByHour, dateNacimiento } =
      req.body;

    // Crear una instancia del modelo Asistencia con los datos recibidos
    const newPersonal = new Personal({
      name,
      horaIngreso,
      horaSalida,
      pagoByHour,
      dateNacimiento,
      birthDayUsed: [],
    });

    // Guardar la nueva asistencia en la base de datos
    const personalSaved = await newPersonal.save();

    // Responder con el objeto guardado y un estado 201 (Creado)
    res.status(201).json(personalSaved);
  } catch (error) {
    // Manejar errores
    res.status(500).json({ message: error.message });
  }
});

router.put("/actualizar-personal/:id", async (req, res) => {
  try {
    // Obtener el ID del personal de los parámetros de la solicitud
    const idPersonal = req.params.id;

    // Obtener los datos actualizados del cuerpo de la solicitud
    const { name, horaIngreso, horaSalida, pagoByHour, dateNacimiento } =
      req.body;

    // Buscar el personal por su ID y actualizarlo
    const personalActualizado = await Personal.findByIdAndUpdate(
      idPersonal,
      {
        name,
        horaIngreso,
        horaSalida,
        pagoByHour,
        dateNacimiento,
      },
      { new: true } // Para devolver el personal actualizado después de la actualización
    );

    // Verificar si el personal fue encontrado y actualizado correctamente
    if (!personalActualizado) {
      return res.status(404).json({ message: "Personal no encontrado" });
    }
    // Responder con el personal actualizado
    res.json(personalActualizado);
  } catch (error) {
    // Manejar errores
    res.status(500).json({ message: error.message });
  }
});

export const updateDateNacimiento = async (
  idPersonal,
  newCumpleañoUsed,
  tipo
) => {
  try {
    const personal = await Personal.findById(idPersonal);

    if (!personal) {
      throw new Error("Personal no encontrado");
    }

    if (tipo === "add") {
      // Obtener el año del nuevo cumpleaño usando Moment.js
      const newYear = moment(newCumpleañoUsed).format("YYYY");

      // Verificar si el año ya existe en birthDayUsed
      const yearExists = personal.birthDayUsed.some(
        (date) => moment(date).format("YYYY") === newYear
      );

      if (!yearExists) {
        personal.birthDayUsed.push(newCumpleañoUsed);
      }
    } else if (tipo === "delete") {
      // Obtener el año del cumpleaño usado para eliminar
      const yearToDelete = moment(newCumpleañoUsed).format("YYYY");

      personal.birthDayUsed = personal.birthDayUsed.filter(
        (date) => moment(date).format("YYYY") !== yearToDelete
      );
    } else {
      throw new Error("Tipo no válido. Debe ser 'add' o 'delete'.");
    }

    // Guardar los cambios en la base de datos
    const personalActualizado = await personal.save();

    return personalActualizado;
  } catch (error) {
    throw new Error(error.message);
  }
};
export default router;
