import express from "express";
import Factura from "../models/Factura.js";
import { openingHours } from "../middleware/middleware.js";
import codFactura from "../models/codigoFactura.js";
import clientes from "../models/clientes.js";
import Cupones from "../models/cupones.js";
import Negocio from "../models/negocio.js";
import db from "../config/db.js";
import moment from "moment";
import Anular from "../models/anular.js";
import Donacion from "../models/donacion.js";

import Servicio from "../models/portafolio/servicios.js";
import Producto from "../models/portafolio/productos.js";

import Pagos from "../models/pagos.js";

import { handleGetInfoDelivery, mapArrayByKey } from "../utils/utilsFuncion.js";
import { handleAddPago } from "./pagos.js";
import { handleAddGasto } from "./gastos.js";

const router = express.Router();

async function handleAddFactura(data) {
  const { infoOrden, infoPago } = data;
  const {
    codRecibo,
    dateRecepcion,
    Modalidad,
    Nombre,
    idCliente,
    Items,
    celular,
    direccion,
    datePrevista,
    dateEntrega,
    descuento,
    estado,
    dni,
    subTotal,
    totalNeto,
    cargosExtras,
    factura,
    modeRegistro,
    modoDescuento,
    gift_promo,
    attendedBy,
    typeRegistro,
  } = infoOrden;

  let infoCliente;
  let newOrden;
  let newCodigo;
  let newGasto;
  let newPago = [];

  const fechaActual = moment().format("YYYY-MM-DD");
  const horaActual = moment().format("HH:mm");

  const beneficios = cargosExtras.beneficios;

  // 1. ADD CLIENTE
  if (estado !== "reservado" && !idCliente) {
    const nuevoCliente = new clientes({
      dni,
      nombre: Nombre,
      direccion,
      phone: celular,
      infoScore: [],
      scoreTotal: 0,
    });
    await nuevoCliente.save();

    infoCliente = {
      tipoAction: "add",
      data: nuevoCliente.toObject(),
    };
  }

  // 2. UPDATE CUPON: (SI USO)
  if (modoDescuento === "Promocion" && beneficios.promociones.length > 0) {
    await Promise.all(
      beneficios.promociones.map(async (cup) => {
        const cupon = await Cupones.findOne({ codigoCupon: cup.codigoCupon });
        if (cupon) {
          cupon.estado = false;
          cupon.dateUse.fecha = fechaActual;
          cupon.dateUse.hora = horaActual;
          await cupon.save();
        }
        // Si cupon es null, no hace nada y continúa
      })
    );
  }
  // 3. ADD GASTO
  if (Modalidad === "Delivery") {
    if (data.hasOwnProperty("infoGastoByDelivery")) {
      const { infoGastoByDelivery } = data;
      if (Object.keys(infoGastoByDelivery).length) {
        newGasto = await handleAddGasto(infoGastoByDelivery);
      }
    }
  }

  // 4. ADD CUPON
  if (gift_promo.length > 0) {
    for (const gift of gift_promo) {
      const { codigoPromocion, codigoCupon } = gift;

      const nuevoCupon = new Cupones({
        codigoPromocion,
        codigoCupon,
        estado: true,
        dateCreation: {
          fecha: fechaActual,
          hora: horaActual,
        },
        dateUse: {
          fecha: "",
          hora: "",
        },
      });

      await nuevoCupon.save();
    }
  }

  // 5. ADD FACTURA (ORDEN DE SERVICIO)
  const nuevoIndice =
    ((
      await Factura.findOne({}, { index: 1, _id: 0 }).sort({ index: -1 }).lean()
    )?.index ?? 0) + 1;

  const dateCreation = {
    fecha: fechaActual,
    hora: horaActual,
  };

  let nuevoCodigo;
  if (modeRegistro === "nuevo") {
    const infoCodigo = await codFactura.findOne().sort({ _id: -1 }).lean();
    nuevoCodigo = infoCodigo.codActual;
  } else {
    nuevoCodigo = codRecibo;
  }

  const nuevoOrden = new Factura({
    codRecibo: nuevoCodigo,
    dateCreation,
    dateRecepcion,
    Modalidad,
    Nombre,
    idCliente: infoCliente ? infoCliente.data._id : idCliente,
    Items,
    celular,
    direccion,
    datePrevista,
    dateEntrega,
    descuento,
    estadoPrenda: "pendiente",
    estado,
    listPago: [],
    index: nuevoIndice,
    dni,
    subTotal,
    totalNeto,
    cargosExtras,
    factura,
    modeRegistro,
    notas: [],
    modoDescuento,
    gift_promo,
    location: 1,
    attendedBy,
    lastEdit: [],
    typeRegistro,
  });

  newOrden = await nuevoOrden.save();
  newOrden = newOrden.toObject();

  // 6. ADD PAGO
  let ListPago = [];
  if (infoPago) {
    const nuevoPago = await handleAddPago({
      ...infoPago,
      idOrden: newOrden._id,
    });

    ListPago.push(nuevoPago);
  }

  // 7. UPDATE CLIENTE
  if (idCliente && modoDescuento === "Puntos" && beneficios.puntos > 0) {
    try {
      // Buscar y actualizar el cliente si existe
      const clienteActualizado = await clientes
        .findByIdAndUpdate(
          newOrden.idCliente,
          {
            $push: {
              infoScore: {
                idOrdenService: newOrden._id,
                codigo: newOrden.codRecibo,
                dateService: {
                  fecha: newOrden.dateRecepcion.fecha,
                  hora: newOrden.dateRecepcion.hora,
                },
                score: -beneficios.puntos, // los puntos en negativo
              },
            },
            $inc: {
              scoreTotal: -beneficios.puntos, // restar los puntos del total
            },
          },
          { new: true }
        )
        .lean();

      // Si el cliente no se encuentra, no se hace nada
      if (!clienteActualizado) {
        console.log("Cliente no encontrado.");
      } else {
        infoCliente = {
          tipoAction: "update",
          data: clienteActualizado,
        };
      }
    } catch (error) {
      console.error("Error al buscar o actualizar el cliente:", error);
      throw new Error("Error al buscar o actualizar el cliente");
    }
  }

  // 8. UPDATE INFO CODIGO
  if (modeRegistro === "nuevo") {
    newCodigo = await codFactura.findOneAndUpdate(
      {},
      { $inc: { codActual: 1 } },
      { new: true }
    );

    if (newCodigo) {
      if (newCodigo.codActual > newCodigo.codFinal) {
        newCodigo.codActual = 1;
        await newCodigo.save();
      }
    } else {
      throw new Error("Código de factura no encontrado");
    }
  }

  // 9. UPDATE "listPago" con los ids de los pagos en FACTURA
  if (ListPago.length > 0) {
    const idsPagos = ListPago.map((pago) => pago._id);

    // Actualizar la newOrden con los nuevos ids de pago
    newOrden = await Factura.findByIdAndUpdate(
      newOrden._id,
      { $addToSet: { listPago: { $each: idsPagos } } }, // Agregar los nuevos ids de pago al campo listPago
      { new: true } // Opción new: true para obtener el documento actualizado
    ).lean();

    await Promise.all(
      ListPago.map(async (pago) => {
        const iPago = {
          _id: pago._id,
          idUser: pago.idUser,
          orden: newOrden.codRecibo,
          idOrden: pago.idOrden,
          date: pago.date,
          nombre: newOrden.Nombre,
          total: pago.total,
          metodoPago: pago.metodoPago,
          Modalidad: newOrden.Modalidad,
          isCounted: pago.isCounted,
        };
        newPago.push(iPago);
      })
    );
  }

  return {
    newOrder: {
      ...newOrden,
      ListPago,
      donationDate: {
        fecha: "",
        hora: "",
      },
    },
    newPago,
    newGasto,
    infoCliente,
    newCodigo,
  };
}

router.post("/add-factura", openingHours, async (req, res) => {
  try {
    const result = await handleAddFactura(req.body);
    const { newOrder, newPago, newGasto, infoCliente, newCodigo } = result;

    res.json({
      newOrder,
      ...(newPago.length > 0 && { listNewsPagos: newPago }),
      ...(newGasto && { newGasto }),
      ...(infoCliente && { changeCliente: infoCliente }),
      ...(newCodigo && { newCodigo: newCodigo.codActual }),
    });
  } catch (error) {
    console.error("Error al guardar los datos:", error);
    res.status(500).json({ mensaje: "Error al guardar los datos" });
  }
});

router.get("/get-factura", (req, res) => {
  Factura.find()
    .then((facturas) => {
      res.json(facturas);
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

router.get("/get-factura/:id", (req, res) => {
  const { id } = req.params; // Obteniendo el id desde los parámetros de la URL
  Factura.findById(id)
    .then((factura) => {
      if (factura) {
        res.json(factura);
      } else {
        res.status(404).json({ mensaje: "Factura no encontrada" });
      }
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

router.get("/get-factura/date/:startDate/:endDate", async (req, res) => {
  const { startDate, endDate } = req.params;

  try {
    // Buscar todas las facturas dentro del rango de fechas
    const ordenes = await Factura.find({
      "dateRecepcion.fecha": {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Obtener todos los IDs de pagos y donaciones relevantes
    const idsPagos = ordenes.flatMap((orden) => orden.listPago);
    const idsDonaciones = ordenes.map((orden) => orden._id);

    // Consultar todos los pagos y donaciones relevantes
    const [pagos, donaciones] = await Promise.all([
      Pagos.find({ _id: { $in: idsPagos } }).lean(),
      Donacion.find({ serviceOrder: { $in: idsDonaciones } }).lean(),
    ]);

    // Crear un mapa de pagos por ID de orden para un acceso más rápido
    const pagosPorOrden = mapArrayByKey(pagos, "idOrden");

    // Procesar cada orden de factura
    const resultados = ordenes.map((orden) => ({
      ...orden,
      ListPago: pagosPorOrden[orden._id] || [],
      donationDate: donaciones.find((donado) =>
        donado.serviceOrder.includes(orden._id.toString())
      )?.donationDate || { fecha: "", hora: "" },
    }));

    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

const generateDateArray = (type, filter) => {
  let fechas = [];

  if (type === "daily") {
    const { days } = filter;
    // Generar fechas para los próximos 3 días
    fechas = Array.from({ length: days }, (_, index) =>
      moment().startOf("day").add(index, "days").format("YYYY-MM-DD")
    );
    return fechas;
  } else {
    if (type === "monthly") {
      const { date } = filter;
      // Generar fechas para todo el mes
      const firstDayOfMonth = moment(date).startOf("month");
      const lastDayOfMonth = moment(date).endOf("month");

      let currentDate = moment(firstDayOfMonth);
      while (currentDate <= lastDayOfMonth) {
        fechas.push(currentDate.format("YYYY-MM-DD"));
        currentDate.add(1, "day");
      }
      return fechas;
    }
  }
};

router.post("/get-report/date-prevista/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const filter = req.body;
    const datesArray = generateDateArray(type, filter);
    const infoReporte = [];

    const infoNegocio = await Negocio.findOne();
    const itemsReporte = infoNegocio.itemsInformeDiario;

    const infoDelivery = await handleGetInfoDelivery();

    itemsReporte.push({
      order: itemsReporte.length,
      id: `SER${infoDelivery._id.toString()}`,
    });

    const splitItem = itemsReporte.map((items) => {
      return {
        ID: items.id.substring(3),
        TIPO: items.id.substring(0, 3),
      };
    });

    let groupedResults = [];

    // Recorremos cada elemento de splitItem
    for (const item of splitItem) {
      try {
        let resultObject = {};
        resultObject.idColumna = item.ID;

        // Si los primeros caracteres son "CAT", busca en la colección categorias
        if (item.TIPO === "CAT") {
          const servicios = await Servicio.find(
            { idCategoria: item.ID },
            "_id"
          );
          const productos = await Producto.find(
            { idCategoria: item.ID },
            "_id"
          );

          const idsServicios = servicios.map((servicio) =>
            servicio._id.toString()
          );
          const idsProductos = productos.map((producto) =>
            producto._id.toString()
          );

          // Combinamos los IDs de servicios y productos
          resultObject.idsCantidades = [...idsServicios, ...idsProductos];
        } else {
          // Si no es "CAT", simplemente agregamos el ID al array
          resultObject.idsCantidades = [item.ID];
        }

        // Agregamos el objeto al array de resultados
        groupedResults.push(resultObject);
      } catch (error) {
        console.error("Error al buscar el documento:", error);
      }
    }

    for (const datePrevista of datesArray) {
      const facturas = await Factura.find({
        "datePrevista.fecha": datePrevista,
        estadoPrenda: { $nin: ["anulado", "donado"] },
      });

      const resultado = {
        FechaPrevista: datePrevista,
        CantidadPedido: facturas.length,
        InfoItems: {},
      };

      // Utiliza Promise.all para esperar a que se completen todas las operaciones asíncronas antes de continuar
      await Promise.all(
        facturas.map(async (factura) => {
          // Recorremos cada factura
          await Promise.all(
            factura.Items.map(async (order) => {
              // Recorremos cada item de la factura

              for (const item of groupedResults) {
                // Verificamos si el identificador está en los idsCantidades de cada grupo
                if (item.idsCantidades.includes(order.identificador)) {
                  // Verificar si resultado.InfoItems[item.idColumna] es un número
                  const existingValue =
                    parseFloat(resultado.InfoItems[item.idColumna]) || 0;
                  // Sumar el valor existente con la cantidad de la orden y formatearlo a 2 decimales
                  resultado.InfoItems[item.idColumna] = (
                    existingValue + Number(order.cantidad)
                  ).toFixed(2);
                }
              }
            })
          );
        })
      );

      resultado.InfoItems = Object.entries(resultado.InfoItems).map(
        ([identificador, Cantidad]) => ({
          identificador,
          Cantidad,
        })
      );

      groupedResults.forEach((group) => {
        // Verifica si la idColumna ya existe en resultado.InfoItems
        const existingItem = resultado.InfoItems.find(
          (item) => item.identificador === group.idColumna
        );

        if (!existingItem) {
          // Si la idColumna no existe, agrega una nueva entrada con cantidad 0
          resultado.InfoItems.push({
            identificador: group.idColumna,
            Cantidad: 0,
          });
        }
      });

      infoReporte.push(resultado);
    }

    res.json(infoReporte);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).json({ mensaje: "Error al obtener los datos" });
  }
});

// ACTUALIZA INFORMACION DE UNA ORDEN RESERVADO
router.put(
  "/update-factura/finalizar-reserva/:id",
  openingHours,
  async (req, res) => {
    try {
      const facturaId = req.params.id;
      const { infoOrden, infoPago } = req.body;

      const {
        codRecibo,
        dateRecepcion,
        Modalidad,
        Nombre,
        idCliente,
        Items,
        celular,
        direccion,
        datePrevista,
        descuento,
        dni,
        subTotal,
        totalNeto,
        cargosExtras,
        factura,
        modoDescuento,
        gift_promo,
        attendedBy,
      } = infoOrden;

      let infoCliente;
      let orderUpdated;
      let newPago = [];

      const fechaActual = moment().format("YYYY-MM-DD");
      const horaActual = moment().format("HH:mm");

      const beneficios = cargosExtras.beneficios;

      // 1. ADD O UPDATE CLIENTE
      if (idCliente) {
        // SI USO PUNTOS ACTUALIZAR RESTANDO SCORE
        if (modoDescuento === "Puntos" && beneficios.puntos > 0) {
          const clienteActualizado = await clientes
            .findByIdAndUpdate(
              idCliente,
              {
                $push: {
                  infoScore: {
                    idOrdenService: facturaId,
                    codigo: codRecibo,
                    dateService: {
                      fecha: dateRecepcion.fecha,
                      hora: dateRecepcion.hora,
                    },
                    score: -beneficios.puntos, // los puntos en negativo
                  },
                },
                $inc: {
                  scoreTotal: -beneficios.puntos, // restar los puntos del total
                },
              },
              { new: true }
            )
            .lean();

          // Si el cliente no se encuentra, no se hace nada
          if (!clienteActualizado) {
            console.log("Cliente no encontrado.");
          } else {
            infoCliente = {
              tipoAction: "update",
              data: clienteActualizado,
            };
          }
        }
      } else {
        // CREAR NUEVO CLIENTE
        const nuevoCliente = new clientes({
          dni,
          nombre: Nombre,
          direccion,
          phone: celular,
          infoScore: [],
          scoreTotal: 0,
        });
        await nuevoCliente.save();

        infoCliente = {
          tipoAction: "add",
          data: nuevoCliente.toObject(),
        };
      }

      // 2. ADD CUPON
      if (gift_promo.length > 0) {
        for (const gift of gift_promo) {
          const { codigoPromocion, codigoCupon } = gift;

          const nuevoCupon = new Cupones({
            codigoPromocion,
            codigoCupon,
            estado: true,
            dateCreation: {
              fecha: fechaActual,
              hora: horaActual,
            },
            dateUse: {
              fecha: "",
              hora: "",
            },
          });

          await nuevoCupon.save();
        }
      }

      // 3. UPDATE CUPON: (SI USO)
      if (modoDescuento === "Promocion" && beneficios.promociones.length > 0) {
        await Promise.all(
          beneficios.promociones.map(async (cup) => {
            const cupon = await Cupones.findOneAndUpdate(
              { codigoCupon: cup.codigoCupon },
              {
                $set: {
                  estado: false,
                  "dateUse.fecha": fechaActual,
                  "dateUse.hora": horaActual,
                },
              },
              { new: true }
            );

            if (!cupon) {
              console.log(`Cupón no encontrado: ${cup.codigoCupon}`);
            }
          })
        );
      }

      // 4. ADD PAGO
      let ListPago = [];
      let listPago = [];

      if (infoPago) {
        const nuevoPago = await handleAddPago({
          ...infoPago,
          idOrden: facturaId,
        });

        ListPago.push(nuevoPago);
      }

      if (ListPago.length > 0) {
        newPago = ListPago.map((pago) => ({
          _id: pago._id,
          idUser: pago.idUser,
          orden: codRecibo,
          idOrden: pago.idOrden,
          date: pago.date,
          nombre: Nombre,
          total: pago.total,
          metodoPago: pago.metodoPago,
          Modalidad: Modalidad,
          isCounted: pago.isCounted,
        }));
        listPago = ListPago.map((pago) => pago._id);
      }

      // 5. UPDATE FACTURA (ORDEN DE SERVICIO)
      const infoToUpdate = {
        dateRecepcion,
        Nombre,
        idCliente: infoCliente ? infoCliente.data._id : "",
        Items,
        celular,
        direccion,
        datePrevista,
        descuento,
        estado: "registrado",
        listPago,
        dni,
        subTotal,
        totalNeto,
        cargosExtras,
        factura,
        modoDescuento,
        gift_promo,
        attendedBy,
      };

      orderUpdated = await Factura.findByIdAndUpdate(
        facturaId,
        { $set: infoToUpdate },
        { new: true }
      ).lean();

      res.json({
        orderUpdated: {
          ...orderUpdated,
          ListPago,
        },
        ...(newPago.length > 0 && { listNewsPagos: newPago }),
        ...(infoCliente && { changeCliente: infoCliente }),
      });
    } catch (error) {
      console.error("Error al actualizar los datos de la orden:", error);
      res
        .status(500)
        .json({ mensaje: "Error al actualizar los datos de la orden" });
    }
  }
);

// ACTUALIZA INFORMACION DE ITEMS EN LA ORDEN
router.put("/update-factura/detalle/:id", async (req, res) => {
  try {
    const facturaId = req.params.id;
    const { Items, lastEdit } = req.body.infoOrden;

    // Actualizar los Items utilizando findByIdAndUpdate sin sesión
    const infoUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      { $set: { Items, lastEdit } },
      { new: true, fields: { Items: 1 } } // Solo devuelve el campo Items
    ).lean();

    res.json(infoUpdated);
  } catch (error) {
    console.error("Error al actualizar los datos de la orden:", error);
    res
      .status(500)
      .json({ mensaje: "Error al actualizar los datos de la orden" });
  }
});

// ACTUALIZA ORDEN A ENTREGADO
router.put("/update-factura/entregar/:id", async (req, res) => {
  try {
    const facturaId = req.params.id;

    const fechaActual = moment().format("YYYY-MM-DD");
    const horaActual = moment().format("HH:mm");

    let infoCliente;
    let newGasto;

    if (req.body.hasOwnProperty("infoGastoByDelivery")) {
      const { infoGastoByDelivery } = req.body;
      if (Object.keys(infoGastoByDelivery).length) {
        newGasto = await handleAddGasto(infoGastoByDelivery);
      }
    }

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      {
        $set: {
          estadoPrenda: "entregado",
          location: 1,
          dateEntrega: {
            fecha: fechaActual,
            hora: horaActual,
          },
        },
      },
      {
        new: true,
        fields: {
          idCliente: 1,
          codRecibo: 1,
          dateEntrega: 1,
          totalNeto: 1,
          estadoPrenda: 1,
          location: 1,
          dateRecepcion: 1,
        },
      } // Solo devuelve los campos necesarios
    ).lean();

    if (orderUpdated.idCliente) {
      const clienteActualizado = await clientes
        .findByIdAndUpdate(
          orderUpdated.idCliente,
          {
            $push: {
              infoScore: {
                idOrdenService: orderUpdated._id,
                codigo: orderUpdated.codRecibo,
                dateService: orderUpdated.dateRecepcion,
                score: parseInt(orderUpdated.totalNeto),
              },
            },
            $inc: {
              scoreTotal: parseInt(orderUpdated.totalNeto),
            },
          },
          { new: true }
        )
        .lean();

      if (clienteActualizado) {
        infoCliente = {
          tipoAction: "update",
          data: clienteActualizado,
        };
      } else {
        console.log("Cliente no encontrado.");
      }
    }

    res.json({
      orderUpdated: {
        _id: orderUpdated._id,
        estadoPrenda: orderUpdated.estadoPrenda,
        location: orderUpdated.location,
        dateEntrega: orderUpdated.dateEntrega,
      },
      ...(newGasto && { newGasto }),
      ...(infoCliente && { changeCliente: infoCliente }),
    });
  } catch (error) {
    console.error("Error al Entregar Orden de Servicio:", error);
    res.status(500).json({ mensaje: "Error al Entregar Orden de Servicio" });
  }
});

// ACTUALIZA ORDEN A CANCELAR ENTREGA
router.post("/update-factura/cancelar-entregar/:id", async (req, res) => {
  try {
    const facturaId = req.params.id;

    let infoCliente;

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      {
        estadoPrenda: "pendiente",
        dateEntrega: {
          fecha: "",
          hora: "",
        },
      },
      {
        new: true,
        fields: {
          idCliente: 1,
          estadoPrenda: 1,
          dateEntrega: 1,
          totalNeto: 1,
        },
      }
    );

    if (orderUpdated.idCliente) {
      const cliente = await clientes.findById(orderUpdated.idCliente);

      if (cliente) {
        // Filtrar los elementos con el mismo idOrdenService y score positivo
        const elementosConMismoId = cliente.infoScore.filter(
          (info) =>
            info.idOrdenService.toString() === facturaId &&
            parseInt(info.score) > 0
        );

        if (elementosConMismoId.length > 0) {
          const idsAEliminar = elementosConMismoId.map((info) => info._id);

          // Filtrar los elementos que no están en idsAEliminar
          cliente.infoScore = cliente.infoScore.filter(
            (info) => !idsAEliminar.includes(info._id.toString())
          );

          // Recalcular scoreTotal
          cliente.scoreTotal = cliente.infoScore.reduce(
            (total, info) => total + parseInt(info.score),
            0
          );

          // Guardar los cambios en la base de datos
          const cliUpdate = await cliente.save();

          // Preparar respuesta
          infoCliente = {
            tipoAction: "update",
            data: cliUpdate,
          };
        }
      } else {
        console.log("Cliente no encontrado.");
      }
    }

    res.json({
      orderUpdated: {
        _id: orderUpdated._id,
        estadoPrenda: orderUpdated.estadoPrenda,
        dateEntrega: orderUpdated.dateEntrega,
      },
      ...(infoCliente && { changeCliente: infoCliente }),
    });
  } catch (error) {
    console.error("Error al cancelar Entrega:", error);
    res.status(500).json({ mensaje: "Error al cancelar Entrega" });
  }
});

// ACTUALIZA ORDEN ANULADO
router.put("/update-factura/anular/:id", async (req, res) => {
  try {
    const { id: facturaId } = req.params;
    const { infoAnulacion } = req.body;

    const nuevaAnulacion = new Anular(infoAnulacion);
    await nuevaAnulacion.save();

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      {
        estadoPrenda: "anulado",
      },
      {
        new: true,
        fields: {
          estadoPrenda: 1,
          idCliente: 1,
          cargosExtras: 1,
          modoDescuento: 1,
        },
      }
    ).lean();

    let infoCliente;
    // Eliminamos los Puntos usados
    if (orderUpdated.modoDescuento === "Puntos") {
      const clienteActualizado = await clientes
        .findByIdAndUpdate(
          orderUpdated.idCliente,
          {
            $pull: {
              infoScore: { idOrdenService: facturaId },
            },
            $inc: {
              scoreTotal: parseInt(orderUpdated.cargosExtras.beneficios.puntos),
            },
          },
          { new: true }
        )
        .lean();

      if (clienteActualizado) {
        infoCliente = {
          tipoAction: "update",
          data: clienteActualizado,
        };
      } else {
        console.log("Cliente no encontrado.");
      }
    }

    // Reactivamos los cupones utilizados en caso de descuento por promoción
    if (orderUpdated.modoDescuento === "Promocion") {
      await Promise.all(
        orderUpdated.cargosExtras.beneficios.promociones.map(async (cup) => {
          const cupon = await Cupones.findOne({ codigoCupon: cup.codigoCupon });
          if (cupon) {
            cupon.estado = true;
            cupon.dateUse.fecha = "";
            cupon.dateUse.hora = "";
            await cupon.save();
          } else {
            console.log(`Cupón no encontrado: ${cup.codigoCupon}`);
          }
        })
      );
    }

    res.json({
      orderAnulado: {
        _id: orderUpdated._id,
        estadoPrenda: orderUpdated.estadoPrenda,
      },
      ...(infoCliente && { changeCliente: infoCliente }),
    });
  } catch (error) {
    console.error("Error al ANULAR Orden de Servicio:", error);
    res.status(500).json({ mensaje: "Error al ANULAR Orden de Servicio" });
  }
});

// ACTUALIZA ORDEN (NOTA)
router.put("/update-factura/nota/:id", async (req, res) => {
  try {
    const { id: facturaId } = req.params;
    const { infoNotas } = req.body;

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      { notas: infoNotas },
      { new: true, fields: { notas: 1 } }
    );

    if (!orderUpdated) {
      return res.status(404).json({ mensaje: "Factura no encontrada" });
    }

    res.json({
      _id: orderUpdated._id,
      notas: orderUpdated.notas,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ mensaje: "Error al actualizar la nota de la factura" });
  }
});

// ANULAR Y REMPLAZAR ORDEN SERVICIO
router.post("/anular-to-replace", async (req, res) => {
  try {
    const { dataToNewOrden, dataToAnular } = req.body;
    const { idOrden, infoAnulacion } = dataToAnular;

    const nuevaAnulacion = new Anular(infoAnulacion);
    await nuevaAnulacion.save();

    const orderAnulada = await Factura.findByIdAndUpdate(
      idOrden,
      {
        estadoPrenda: "anulado",
      },
      {
        new: true,
        fields: {
          estadoPrenda: 1,
          idCliente: 1,
          cargosExtras: 1,
          modoDescuento: 1,
        },
      }
    ).lean();

    let listChangeCliente = [];

    if (orderAnulada.modoDescuento === "Puntos") {
      const clienteActualizado = await clientes
        .findByIdAndUpdate(
          orderAnulada.idCliente,
          {
            $pull: {
              infoScore: { idOrdenService: idOrden },
            },
            $inc: {
              scoreTotal: parseInt(orderAnulada.cargosExtras.beneficios.puntos),
            },
          },
          { new: true }
        )
        .lean();

      if (clienteActualizado) {
        listChangeCliente.push({
          tipoAction: "update",
          data: clienteActualizado,
        });
      } else {
        console.log("Cliente no encontrado.");
      }
    }

    if (orderAnulada.modoDescuento === "Promocion") {
      await Promise.all(
        orderAnulada.cargosExtras.beneficios.promociones.map(async (cup) => {
          const cupon = await Cupones.findOneAndUpdate(
            { codigoCupon: cup.codigoCupon },
            {
              estado: true,
              "dateUse.fecha": "",
              "dateUse.hora": "",
            },
            { new: true }
          ).lean();

          if (!cupon) {
            console.log(`Cupón no encontrado: ${cup.codigoCupon}`);
          }
        })
      );
    }

    const result = await handleAddFactura(dataToNewOrden);

    const { newOrder, newPago, newGasto, infoCliente, newCodigo } = result;

    res.json({
      orderAnulado: {
        _id: orderAnulada._id,
        estadoPrenda: orderAnulada.estadoPrenda,
      },
      newOrder,
      ...(newPago.length > 0 && { listNewsPagos: newPago }),
      ...(newGasto && { newGasto }),
      ...(listChangeCliente.length > 0 && { listChangeCliente }),
      ...(newCodigo && { newCodigo: newCodigo.codActual }),
    });
  } catch (error) {
    console.error("Error al guardar los datos:", error);
    res.status(500).json({ mensaje: "Error al guardar los datos" });
  }
});

export default router;
