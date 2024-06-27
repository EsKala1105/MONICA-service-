import Servicio from "../models/portafolio/servicios.js";
import Categoria from "../models/categorias.js";
import Factura from "../models/Factura.js";
import Anular from "../models/anular.js";
import Pagos from "../models/pagos.js";
import { handleGetInfoUser } from "../routes/cuadreDiario.js";

// Función para agrupar objetos usando una clave de identificación
export function mapObjectByKey(array, key) {
  return array.reduce((map, obj) => {
    map[obj[key]] = obj;
    return map;
  }, {});
}

// Función para agrupar objetos en arrays usando una clave de identificación
export function mapArrayByKey(array, key) {
  return array.reduce((map, obj) => {
    if (!map[obj[key]]) {
      map[obj[key]] = [];
    }
    map[obj[key]].push(obj);
    return map;
  }, {});
}

export const handleGetInfoDelivery = async () => {
  try {
    // Consulta a la colección categorias
    const categoria = await Categoria.findOne({
      name: "Unico",
      nivel: "primario",
    });

    // Verifica si se encontró la categoría
    if (!categoria) {
      return null;
    }

    // Obtiene el _id de la categoría encontrada
    const categoriaId = categoria._id;

    // Consulta a la colección Servicio
    const servicio = await Servicio.findOne({
      idCategoria: categoriaId,
      nombre: "Delivery",
    });

    // Verifica si se encontró el servicio
    if (!servicio) {
      return null;
    }

    return servicio;
  } catch (error) {
    console.error("Error al buscar el servicio:", error);
  }
};

export const GetAnuladoId = async (id) => {
  try {
    // Buscar el documento por su ID
    const anulado = await Anular.findById(id);

    // Verificar si se encontró el documento
    if (!anulado) {
      console.log("No se encontró ningún registro anulado con ese ID");
      return null; // o puedes lanzar un error según tus necesidades
    }

    // Devolver el documento encontrado
    return anulado;
  } catch (error) {
    console.error("Error al buscar el registro anulado:", error);
    throw error; // puedes manejar el error según tus necesidades
  }
};

export const GetPagoMasDetalleOrden = async (idPago) => {
  try {
    const pagoInfo = await Pagos.findById(idPago);

    // Seleccionar solo los campos necesarios de la factura
    const factura = await Factura.findById(pagoInfo.idOrden).select(
      "codRecibo Nombre Modalidad"
    );

    const infoUser = await handleGetInfoUser(pagoInfo.idUser);

    const detallePago = {
      _id: pagoInfo._id,
      idUser: pagoInfo.idUser,
      orden: factura.codRecibo,
      idOrden: pagoInfo.idOrden,
      date: pagoInfo.date,
      nombre: factura.Nombre,
      total: pagoInfo.total,
      metodoPago: pagoInfo.metodoPago,
      Modalidad: factura.Modalidad,
      isCounted: pagoInfo.isCounted,
      infoUser: infoUser,
    };

    return detallePago;
  } catch (error) {
    console.error("Error al obtener los datos por _id de pago:", error);
    throw error; // Propagar el error para que sea manejado por el llamador
  }
};
