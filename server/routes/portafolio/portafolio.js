import express from "express";
import Producto from "../../models/portafolio/productos.js";
import categorias from "../../models/categorias.js";
import Servicio from "../../models/portafolio/servicios.js";
import Factura from "../../models/Factura.js";
import moment from "moment";

const router = express.Router();

router.get("/get-informacion/:fecha", async (req, res) => {
  try {
    const date = req.params.fecha;

    // Validar que se haya proporcionado una fecha
    if (!date) {
      return res
        .status(400)
        .json({ mensaje: "Se requiere proporcionar una fecha" });
    }

    const dateFormat = moment(date, "YYYY-MM-DD");
    const inicioMes = moment(dateFormat).startOf("month").format("YYYY-MM-DD");
    const finMes = moment(dateFormat).endOf("month").format("YYYY-MM-DD");

    // Obtener productos y servicios
    const productos = await Producto.find(
      {},
      "nombre simboloMedida idCategoria _id"
    ).lean();
    const servicios = await Servicio.find(
      {},
      "nombre simboloMedida idCategoria _id"
    ).lean();

    // Asignar tipo 'servicios' manualmente a cada servicio
    const infoServicios = servicios.map((servicio) => ({
      ...servicio,
      tipo: "servicios",
    }));

    // Asignar tipo 'productos' manualmente a cada servicio
    const infoProductos = productos.map((servicio) => ({
      ...servicio,
      tipo: "servicios",
    }));

    // Combinar productos y servicios en un solo array
    const infoPortafolio = [...infoServicios, ...infoProductos];

    // Obtener todas las categorías
    const infoCategorias = await categorias.find({}, "name _id");

    // Obtener facturas con campos seleccionados y proyección en Items
    const facturas = await Factura.find(
      {
        "dateRecepcion.fecha": {
          $gte: inicioMes,
          $lte: finMes,
        },
      },
      {
        _id: 1,
        "Items.identificador": 1,
        "Items.cantidad": 1,
        "Items.total": 1,
      }
    );

    // Objeto para almacenar la información combinada por _id
    const portafolioMap = {};

    // Iterar sobre cada factura
    for (const factura of facturas) {
      // Iterar sobre los items de la factura
      for (const item of factura.Items) {
        // Encontrar el producto o servicio correspondiente en el array unificado
        const itemPortafolio = infoPortafolio.find(
          (ip) => ip._id.toString() === item.identificador
        );

        // Si se encontró el informacion de producto o servicio, agregar información combinada al mapa
        if (itemPortafolio) {
          const id = itemPortafolio._id.toString();
          portafolioMap[id] ??= {
            nombre: itemPortafolio.nombre,
            _id: itemPortafolio._id,
            categoria: infoCategorias.find(
              (cat) => cat._id.toString() === itemPortafolio.idCategoria
            ),
            tipo: itemPortafolio.tipo,
            cantidad: 0,
            simboloMedida: itemPortafolio.simboloMedida,
            montoGenerado: 0,
          };

          // Asegurarse de que item.cantidad y item.total sean numéricos antes de sumarlos
          const cantidad = Number(item.cantidad);
          const total = Number(item.total);
          if (!isNaN(cantidad) && !isNaN(total)) {
            // Incrementar las cantidades y totales
            portafolioMap[id].cantidad += cantidad;
            portafolioMap[id].montoGenerado += total;
          } else {
            console.log(
              "Cantidad o Total no son valores numéricos válidos en ORDEN CON ID : ",
              factura._id
            );
          }
        }
      }
    }

    // Convertir el mapa a un arreglo de objetos
    const infoFinalPortafolio = Object.values(portafolioMap);

    res.json(infoFinalPortafolio);
  } catch (error) {
    console.error("Error al obtener la información Portafolio:", error);
    res
      .status(500)
      .json({ mensaje: "Error al obtener la información Portafolio" });
  }
});
export default router;
