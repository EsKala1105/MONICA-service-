import express from "express";
import Cupones from "../models/cupones.js";
import Promociones from "../models/promociones.js";
import moment from "moment";

const router = express.Router();

// Función para generar un código aleatorio de letras y números
function generateRandomCode(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

router.post("/generate-multiples-cupones", async (req, res) => {
  try {
    const { codigoPromocion, cantCupones } = req.body;

    if (
      !codigoPromocion ||
      !cantCupones ||
      isNaN(cantCupones) ||
      cantCupones <= 0
    ) {
      return res.status(400).json({
        mensaje:
          "Debe proporcionar un código de promoción válido y una cantidad válida de cupones mayor a cero",
      });
    }

    let codigosGenerados = [];

    while (codigosGenerados.length < cantCupones) {
      // Generar los códigos necesarios
      const cantidadRestante = cantCupones - codigosGenerados.length;
      const nuevosCodigos = generateUniqueCodes(
        cantidadRestante,
        codigosGenerados
      );

      // Verificar si los códigos están duplicados en la colección y te devuelve los duplicados
      const cuponesExistentes = await Cupones.find({
        codigoCupon: { $in: nuevosCodigos },
      }).distinct("codigoCupon");

      const codigosUnicos = nuevosCodigos.filter((codigo) => {
        return !cuponesExistentes.includes(codigo);
      });

      // Agregar los códigos únicos al arreglo de codigosGenerados
      codigosGenerados = codigosGenerados.concat(codigosUnicos);
    }

    // Ahora que tenemos todos los códigos únicos, podemos guardarlos en la base de datos
    const nuevosCupones = codigosGenerados.map((codigoCupon) => {
      return new Cupones({
        codigoPromocion,
        codigoCupon,
        estado: true, // Por defecto, el estado es true
        dateCreation: {
          fecha: moment().format("YYYY-MM-DD"),
          hora: moment().format("HH:mm"),
        },
        dateUse: {
          fecha: "",
          hora: "",
        },
      });
    });

    // Guardar todos los nuevos cupones en la base de datos
    await Cupones.insertMany(nuevosCupones);

    res.status(201).json(codigosGenerados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar cupones" });
  }
});

function generateUniqueCodes(amount, existingCodes) {
  const uniqueCodes = [];

  while (uniqueCodes.length < amount) {
    let codigoCupon;

    // Generar un código de cupón único
    do {
      codigoCupon = generateRandomCode(6);
    } while (
      existingCodes.includes(codigoCupon) ||
      uniqueCodes.includes(codigoCupon)
    );

    uniqueCodes.push(codigoCupon);
  }

  return uniqueCodes;
}

router.get("/generate-codigo-cupon", async (req, res) => {
  try {
    let codigoCupon;
    let cuponRepetido;

    // Generar un código de cupón único y verificar si ya existe en la base de datos
    do {
      codigoCupon = generateRandomCode(6); // Función para generar un código aleatorio de 6 caracteres
      cuponRepetido = await Cupones.findOne({ codigoCupon });

      // Si encontramos un cupón repetido con estado true, generamos uno nuevo
    } while (cuponRepetido && cuponRepetido.estado);

    res.status(200).json(codigoCupon);
  } catch (error) {
    console.error("Error al generar el código de cupón:", error);
    res.status(500).json({ mensaje: "Error al generar el código de cupón" });
  }
});

router.post("/generar-cupon", async (req, res) => {
  try {
    const codigoPromocion = req.body.codigoPromocion;
    const codigoCupon = req.body.codigoCupon;
    // Crear el nuevo cupón en la base de datos
    const nuevoCupon = new Cupones({
      codigoPromocion,
      codigoCupon,
      estado: true, // Por defecto, el estado es true
      dateCreation: {
        fecha: moment().format("YYYY-MM-DD"),
        hora: moment().format("HH:mm"),
      },
      dateUse: {
        fecha: "",
        hora: "",
      },
    });

    await nuevoCupon.save();

    res
      .status(201)
      .json({ mensaje: "Cupón generado exitosamente", cupon: nuevoCupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar cupón" });
  }
});

router.get("/validar-cupon/:codigoCupon", async (req, res) => {
  try {
    const codigoCupon = req.params.codigoCupon;

    // Busca el cupón por su código y estado
    const cupon = await Cupones.findOne({ codigoCupon });

    if (!cupon) {
      return res
        .status(200)
        .json({ validacion: false, respuesta: "Cupón inexistente" });
    }

    if (cupon.estado === false) {
      if (cupon.dateUse.fecha && cupon.dateUse.hora) {
        return res.status(200).json({
          validacion: false,
          respuesta: `Cupón fue usado el: ${cupon.dateUse.fecha} - ${cupon.dateUse.hora}`,
        });
      }
    }

    if (cupon.estado === true) {
      const promocion = await Promociones.findOne({
        codigo: cupon.codigoPromocion,
      });

      if (!promocion) {
        return res
          .status(200)
          .json({
            validacion: false,
            respuesta: "Promoción (NO EXISTE) O (ELIMINADA)",
          });
      } else {
        // Obtén la fecha actual con Moment.js
        const fechaActual = moment();

        // Obtén la fecha de creación del cupón con Moment.js
        const fechaCreacionCupon = moment(cupon.dateCreation.fecha);

        // Suma los días de vigencia de la promoción a la fecha de creación del cupón
        const fechaExpiracion = fechaCreacionCupon
          .clone()
          .add(promocion.vigencia, "days");

        // Compara la fecha de expiración con la fecha actual
        if (fechaActual.isSameOrAfter(fechaExpiracion)) {
          return res.status(200).json({
            validacion: false,
            respuesta: `Cupón caducó - la fecha de expiración fue el ${fechaExpiracion.format(
              "YYYY-MM-DD"
            )}`,
          });
        }

        return res.status(200).json({
          validacion: true,
          respuesta: "Cupón disponible",
          promocion: {
            codigo: promocion.codigo,
            prenda: promocion.prenda,
            alcance: promocion.alcance,
            cantidadMin: promocion.cantidadMin,
            tipoPromocion: promocion.tipoPromocion,
            tipoDescuento: promocion.tipoDescuento,
            descripcion: promocion.descripcion,
            descuento: promocion.descuento,
          },
        });
      }
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ validacion: false, res: "Error al validar el cupón" });
  }
});

router.get("/use-cupon/:codigoCupon", async (req, res) => {
  try {
    const codigoCupon = req.params.codigoCupon;
    // Buscar el cupón por su código
    const cupon = await Cupones.findOne({ codigoCupon });

    // Actualizar el estado del cupón a false
    cupon.estado = false;

    // Registrar la fecha y hora actual en el campo dateUse
    cupon.dateUse.fecha = moment().format("YYYY-MM-DD");
    cupon.dateUse.hora = moment().format("HH:mm");

    // Guardar los cambios en la base de datos
    await cupon.save();

    return res.json("Cupón utilizado exitosamente");
  } catch (error) {
    console.error(error);
    res.status(500).json({
      validacion: false,
      res: "Error no se pudiedo actualizar el cupón",
    });
  }
});

// Ruta para obtener información de un cupón y su promoción según el código de cupón proporcionado
router.get("/get-info-promo/:codigoCupon", async (req, res) => {
  const codigoCupon = req.params.codigoCupon;

  try {
    // Busca el cupón por su código
    const cupon = await Cupones.findOne({ codigoCupon }).exec();

    if (!cupon) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }

    // Busca la promoción relacionada por el código de promoción en el cupón
    const promocion = await Promociones.findOne({
      codigo: cupon.codigoPromocion,
    }).exec();

    if (!promocion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    // Combina la información del cupón y la promoción en un objeto
    const infoCupon = {
      codigoPromocion: cupon.codigoPromocion,
      codigoCupon: cupon.codigoCupon,
      prenda: promocion.prenda,
      alcance: promocion.alcance,
      descripcion: promocion.descripcion,
      descuento: promocion.descuento,
      dateCreation: cupon.dateCreation,
      vigencia: promocion.vigencia,
    };

    // Envía la respuesta con los datos combinados
    res.json(infoCupon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

export default router;
