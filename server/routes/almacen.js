import express from "express";
import Almacen from "../models/almacen.js";
import Factura from "../models/Factura.js";
import moment from "moment";
import db from "../config/db.js";
import Pagos from "../models/pagos.js";
import Usuario from "../models/usuarios/usuarios.js";
import { mapArrayByKey, mapObjectByKey } from "../utils/utilsFuncion.js";

const router = express.Router();

// Nueva ruta para realizar ambas operaciones
router.post("/add-to-warehouse", async (req, res) => {
  // Iniciar una transacción
  const session = await db.startSession();
  session.startTransaction();
  try {
    const { Ids } = req.body;
    // Actualizar la ubicación de las facturas
    const updatedFacturas = [];
    // Agregar las facturas al almacén
    const fechaHora = moment().format("YYYY-MM-DD HH:mm");
    for (const facturaId of Ids) {
      const factura = await Factura.findById(facturaId).session(session);
      if (!factura) {
        throw new Error(`Factura no encontrada: ${facturaId}`);
      }

      factura.location = 2;
      await factura.save({ session: session });

      updatedFacturas.push({
        ...factura.toObject(),
        dateStorage: {
          fecha: fechaHora.split(" ")[0],
          hora: fechaHora.split(" ")[1],
        },
      });
    }

    const almacenamiento = new Almacen({
      serviceOrder: Ids,
      storageDate: {
        fecha: fechaHora.split(" ")[0],
        hora: fechaHora.split(" ")[1],
      },
    });

    await almacenamiento.save({ session: session });

    res.status(200).json(updatedFacturas);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    res
      .status(500)
      .json({ mensaje: "Error en la transacción", error: error.message });
  }
});

router.get("/get-warehouse-service-order", async (req, res) => {
  try {
    // Obtener todos los documentos de la colección Almacen
    const almacenes = await Almacen.find().lean();

    // Obtener todos los IDs de serviceOrder de todos los documentos de Almacen
    const serviceOrderIds = almacenes.flatMap(
      (almacen) => almacen.serviceOrder
    );

    // Buscar todas las facturas relacionadas con los serviceOrderIds
    const facturas = await Factura.find({
      _id: { $in: serviceOrderIds },
    }).lean();

    // Obtener todos los IDs de listPago de todas las facturas
    const listPagosIds = facturas.flatMap((factura) => factura.listPago);

    // Buscar todos los pagos relacionados con los listPagosIds
    const pagos = await Pagos.find({ _id: { $in: listPagosIds } }).lean();

    // Agrupar los pagos por ID de orden en un array
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

    const mapAlmacen = almacenes.reduce((map, almacen) => {
      almacen.serviceOrder.forEach((orderId) => {
        Object.assign(map, { [orderId]: almacen.storageDate });
      });
      return map;
    }, {});

    // Mapear las facturas con sus pagos correspondientes
    const facturasAlmacen = facturas.map((factura) => {
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
      return {
        ...factura,
        ListPago,
        dateStorage: mapAlmacen[factura._id.toString()],
      };
    });

    res.status(200).json(facturasAlmacen);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "No se pudo obtener las facturas" });
  }
});

router.delete("/remove-from-warehouse/:id", async (req, res) => {
  try {
    const { id } = req.params; // Obtén el ID que se desea eliminar

    // Actualiza todos los registros de Almacen
    await Almacen.updateMany(
      { serviceOrder: id },
      { $pull: { serviceOrder: id } }
    );
    res.status(200).json({ mensaje: "Valor removido de Almacen" });
  } catch (error) {
    console.error("Error al eliminar el valor de serviceOrder: ", error);
    res.status(500).json({ mensaje: "No remover orden de almacen" });
  }
});

export default router;
