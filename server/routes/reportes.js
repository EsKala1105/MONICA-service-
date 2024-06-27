import express from "express";
import Factura from "../models/Factura.js";
import moment from "moment";
import "moment-timezone";
import Pagos from "../models/pagos.js";
import { mapArrayByKey, mapObjectByKey } from "../utils/utilsFuncion.js";
import Usuario from "../models/usuarios/usuarios.js";

const router = express.Router();

router.get("/get-reporte-mensual", async (req, res) => {
  const { mes, anio } = req.query;

  // Validar que los parámetros mes y anio sean válidos
  if (!mes || !anio) {
    return res
      .status(400)
      .json({ mensaje: "Los parámetros mes y año son requeridos." });
  }

  try {
    // Construir fechas de inicio y fin del mes
    const fechaInicial = moment(`${anio}-${mes}-01`, "YYYY-MM");
    const fechaFinal = fechaInicial.clone().endOf("month");

    // Consultar las órdenes dentro del rango de fechas y estadoPrenda distinto de "anulado"
    const ordenes = await Factura.find({
      "dateRecepcion.fecha": {
        $gte: fechaInicial.format("YYYY-MM-DD"),
        $lte: fechaFinal.format("YYYY-MM-DD"),
      },
      estadoPrenda: { $ne: "anulado" },
    }).lean();

    // Obtener los IDs de todos los pagos de las órdenes
    const idsPagos = ordenes.flatMap((orden) => orden.listPago);

    // Consultar todos los pagos de las órdenes
    const pagos = await Pagos.find({ _id: { $in: idsPagos } }).lean();

    // Crear un mapa array de pagos por ID de orden para un acceso más rápido
    const pagosPorOrden = mapArrayByKey(pagos, "idOrden");

    // Combinar las órdenes con sus respectivos pagos
    const ordenesMensual = ordenes.map((orden) => ({
      ...orden,
      ListPago: pagosPorOrden[orden._id] || [],
    }));

    res.status(200).json(ordenesMensual);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo generar el reporte EXCEL" });
  }
});

router.get("/get-reporte-pendientes", async (req, res) => {
  try {
    const facturas = await Factura.find({
      estadoPrenda: "pendiente",
      estado: "registrado",
      location: 1,
    }).lean();

    const listPagosIds = facturas.flatMap((factura) => factura.listPago);

    const pagos = await Pagos.find({
      _id: { $in: listPagosIds },
    }).lean();

    // Crear un mapa para agrupar los pagos por idOrden
    const pagosMap = mapArrayByKey(pagos, "idOrden");

    // Obtener todos los idUser de los pagos sin repeticiones
    const idUsers = [...new Set(pagos.map((pago) => pago.idUser))];

    // Buscar la información de los usuarios relacionados con los idUsers
    const usuarios = await Usuario.find(
      { _id: { $in: idUsers } },
      {
        _id: 1,
        name: 1,
        usuario: 1,
        rol: 1,
      }
    ).lean();

    // Crear un mapa de usuarios por su _id
    const usuariosMap = mapObjectByKey(usuarios, "_id");

    // Mapear las facturas con sus pagos correspondientes
    const facturasPendientes = facturas.map((factura) => {
      const ListPago = (pagosMap[factura._id] || []).map((pago) => ({
        _id: pago._id,
        idUser: pago.idUser,
        idOrden: pago.idOrden,
        orden: factura.codRecibo,
        date: pago.date,
        nombre: factura.Nombre,
        total: pago.total,
        metodoPago: pago.metodoPago,
        Modalidad: factura.Modalidad,
        isCounted: pago.isCounted,
        infoUser: usuariosMap[pago.idUser],
      }));
      return { ...factura, ListPago };
    });
    res.json(facturasPendientes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ mensaje: "No se pudo obtener lista de ordenes pendientes" });
  }
});

export default router;
