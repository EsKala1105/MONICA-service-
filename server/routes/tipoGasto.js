import express from "express";
import tipoGastos from "../models/tipoGastos.js";
import moment from "moment";
const router = express.Router();

router.post("/add-tipo-gasto", (req, res) => {
  const { name, detalle } = req.body;

  const newTipoGasto = new tipoGastos({
    name,
    dateCreation: {
      fecha: moment().format("YYYY-MM-DD"),
      hora: moment().format("HH:mm"),
    },
    detalle,
    nivel: "secundario",
  });

  newTipoGasto
    .save()
    .then((tipoGastoSaved) => {
      res.json(tipoGastoSaved);
    })
    .catch((error) => {
      console.error("Error al Guardar tipo de gasto:", error);
      res.status(500).json({ mensaje: "Error al Guardar tipo de gasto" });
    });
});

router.get("/get-tipo-gastos", (req, res) => {
  const dateCurrent = moment().format("YYYY-MM-DD");
  const hourCurrent = moment().format("HH:mm");

  const nameDeliveryRecojo = "Delivery (Recojo)";
  const nameDeliveryEnvio = "Delivery (Envio)";

  const tipoGastoUnicos = [
    {
      name: nameDeliveryRecojo,
      dateCreation: {
        fecha: dateCurrent,
        hora: hourCurrent,
      },
      detalle: "Gasto de movilidad por Traer el pedido de cliente",
      nivel: "primario",
    },
    {
      name: nameDeliveryEnvio,
      dateCreation: {
        fecha: dateCurrent,
        hora: hourCurrent,
      },
      detalle: "Gasto de movilidad por Enviar el pedido de cliente",
      nivel: "primario",
    },
    {
      name: "Otros",
      dateCreation: {
        fecha: dateCurrent,
        hora: hourCurrent,
      },
      detalle: "Gastos esporádicos que sucede raras ocasiones",
      nivel: "primario",
    },
  ];

  // Verificar si existen registros en tipoGastos
  tipoGastos
    .find()
    .then((infoTipoGastos) => {
      // Si no hay registros, agregar los tipoGastoUnicos
      if (infoTipoGastos.length === 0) {
        // Map sobre cada objeto en tipoGastoUnicos y guardarlos como documentos separados
        Promise.all(
          tipoGastoUnicos.map((tipoGasto) => {
            const nuevoTipoGasto = new tipoGastos(tipoGasto);
            return nuevoTipoGasto.save();
          })
        )
          .then(() => {
            console.log("Registros agregados exitosamente.");
            // Obtener y devolver todos los registros actualizados
            tipoGastos
              .find()
              .then((infoTipoGastos) => {
                // Filtrar los elementos para obtener Delivery (Envio) y Delivery (Recojo) en variables separadas
                const deliveryEnvio = infoTipoGastos.find(
                  (gasto) =>
                    gasto.name === nameDeliveryEnvio &&
                    gasto.nivel === "primario"
                );
                const deliveryRecojo = infoTipoGastos.find(
                  (gasto) =>
                    gasto.name === nameDeliveryRecojo &&
                    gasto.nivel === "primario"
                );

                const listGastos = infoTipoGastos.filter(
                  (gasto) =>
                    gasto.name !== nameDeliveryEnvio &&
                    gasto.name !== nameDeliveryRecojo
                );

                res.json({
                  listGastos,
                  deliveryEnvio,
                  deliveryRecojo,
                });
              })
              .catch((error) => {
                console.error("Error al obtener los datos:", error);
                res.status(500).json({ mensaje: "Error al obtener los datos" });
              });
          })
          .catch((error) => {
            console.error("Error al agregar nuevos registros:", error);
            res
              .status(500)
              .json({ mensaje: "Error al agregar nuevos registros" });
          });
      } else {
        // Si hay registros, devolver los registros existentes
        // Filtrar los elementos para obtener Delivery (Envio) y Delivery (Recojo) en variables separadas
        const deliveryEnvio = infoTipoGastos.find(
          (gasto) =>
            gasto.name === nameDeliveryEnvio && gasto.nivel === "primario"
        );
        const deliveryRecojo = infoTipoGastos.find(
          (gasto) =>
            gasto.name === nameDeliveryRecojo && gasto.nivel === "primario"
        );

        const listGastos = infoTipoGastos.filter(
          (gasto) =>
            gasto.name !== nameDeliveryEnvio &&
            gasto.name !== nameDeliveryRecojo
        );

        res.json({
          listGastos,
          deliveryEnvio,
          deliveryRecojo,
        });
      }
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

router.put("/update-tipo-gasto/:id", (req, res) => {
  const { id } = req.params;
  const { name, detalle } = req.body;

  tipoGastos
    .findByIdAndUpdate(
      id,
      { name, detalle },
      { new: true } // Devuelve el documento actualizado
    )
    .then((tipoGastoActualizado) => {
      res.json(tipoGastoActualizado);
    })
    .catch((error) => {
      console.error("Error al actualizar el tipo de gasto:", error);
      res.status(500).json({ mensaje: "Error al actualizar el tipo de gasto" });
    });
});

router.delete("/delete-tipo-gasto/:id", (req, res) => {
  const { id } = req.params;

  tipoGastos
    .findByIdAndDelete(id)
    .then(() => {
      res.json(id);
    })
    .catch((error) => {
      console.error("Error al eliminar el tipo de gasto:", error);
      res.status(500).json({ mensaje: "Error al eliminar el tipo de gasto" });
    });
});

export default router;
