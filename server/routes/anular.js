import express from "express";
import Anular from "../models/anular.js";
import { openingHours } from "../middleware/middleware.js";
import moment from "moment";
import Factura from "../models/Factura.js";
import Usuarios from "../models/usuarios/usuarios.js";
import { mapObjectByKey } from "../utils/utilsFuncion.js";
const router = express.Router();

router.post("/anular-factura", openingHours, (req, res) => {
  const { infoAnulacion } = req.body;
  const { _id, motivo, fecha, hora, idUser } = infoAnulacion;

  const newAnulacion = new Anular({
    _id,
    motivo,
    fecha,
    hora,
    idUser,
  });

  newAnulacion
    .save()
    .then((anulado) => {
      res.json(anulado);
    })
    .catch((error) => {
      console.error("Error al anular cliente:", error);
      res.status(500).json({ mensaje: "Error al anular cliente:" });
    });
});

router.get("/get-anulado/:idCliente", (req, res) => {
  const idCliente = req.params.idCliente;

  Anular.findById(idCliente)
    .then((anulado) => {
      if (!anulado) {
        return res.json(null);
      }
      res.json(anulado);
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

router.get("/get-reporte-anulados/:date", async (req, res) => {
  try {
    const InfoFecha = req.params.date;
    const momentFecha = moment(InfoFecha, "YYYY-MM-DD");

    // Obtener los reportes anulados en el rango de fechas del mes
    const infoAnulados = await Anular.find({
      fecha: {
        $gte: momentFecha.startOf("month").format("YYYY-MM-DD"), // Fecha de inicio del mes
        $lt: momentFecha.endOf("month").format("YYYY-MM-DD"), // Fecha de fin del mes
      },
    }).lean();

    // Obtener todos los _id de los reportes anulados en un solo array
    const ordenesAnuladosIds = infoAnulados.map((anulado) => anulado._id);

    // Obtener todos los idUser de los reportes anulados en un solo array y asegurarse de que no se repitan
    const idsUserOnAnulados = [
      ...new Set(infoAnulados.map((anulado) => anulado.idUser)),
    ];

    // Realizar una sola consulta en la colección de Usuarios utilizando los idUser obtenidos
    const usuarios = await Usuarios.find(
      { _id: { $in: idsUserOnAnulados } },
      { name: 1, rol: 1 }
    );

    // Obtener las facturas asociadas a los reportes anulados
    const facturas = await Factura.find(
      { _id: { $in: ordenesAnuladosIds } },
      { codRecibo: 1, Nombre: 1, totalNeto: 1, dateRecepcion: 1 }
    ).lean();

    // Crear un mapa de facturas para mejorar la eficiencia de búsqueda
    const facturasMap = mapObjectByKey(facturas, "_id");

    // Crear un mapa de facturas para mejorar la eficiencia de búsqueda
    const usuariosMap = mapObjectByKey(usuarios, "_id");

    // Obtener la información adicional de cada reporte anulado
    const reportesDetallados = infoAnulados.map((anulado) => {
      // Buscar la factura asociada al reporte anulado correspondiente
      const factura = facturasMap[anulado._id];
      // Buscar el usuario responsable del reporte anulado correspondiente
      const responsable = usuariosMap[anulado.idUser];

      return {
        _id: anulado._id,
        codRecibo: factura.codRecibo,
        Nombre: factura.Nombre,
        totalNeto: factura.totalNeto,
        dateRecepcion: factura.dateRecepcion,
        fechaAnulacion: {
          fecha: anulado.fecha,
          hora: anulado.hora,
        },
        motivo: anulado.motivo,
        responsable: { name: responsable.name, rol: responsable.rol },
      };
    });

    res.json(reportesDetallados);
  } catch (error) {
    console.error("Error al obtener los reportes anulados:", error);
    res.status(500).json({ mensaje: "Error al obtener los reportes anulados" });
  }
});

export default router;
