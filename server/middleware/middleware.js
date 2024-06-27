import Accesos from "../models/usuarios/accesos.js";
import Usuario from "../models/usuarios/usuarios.js";
import PasswordResetCodes from "../models/usuarios/passwordResetCodes.js";
import Negocio from "../models/negocio.js";
import jwt from "jsonwebtoken";
import moment from "moment";
import { secretKey } from "../utils/varsGlobal.js";

// Middleware para verificar el token y la existencia en la colección Accesos
export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    const idUser = decoded.userId; // Almacenamos el ID del usuario en el objeto de solicitud

    // Verificar si el token existe en la colección Accesos
    const acceso = await Accesos.findOne({ tokens: token });
    if (!acceso) {
      return res.status(401).json({ mensaje: "Token Expiro" });
    }

    const user = await Usuario.findById(idUser);

    if (!user) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    req.body = { user: user, rol: user.rol };

    next();
  } catch (error) {
    return res.status(403).json({ mensaje: "Token inválido" });
  }
};

// Middleware para verificar la existencia de codigo, como validacion para cambiar de contraseña
export const verifyCodigo = async (req, res, next) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(401).json({ mensaje: "Código no proporcionado" });
  }

  try {
    // Verificar si el token existe en la colección Verify
    const cod = await PasswordResetCodes.findOne({ codigo });

    if (!cod) {
      return res.status(401).json({ mensaje: "Código Inválido" });
    }

    // Si el código es válido, puedes realizar acciones adicionales si es necesario, por ejemplo, verificar la expiración

    // Continuar con la siguiente función en la cadena de middleware
    next();
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al verificar el código" });
  }
};

export const openingHours = async (req, res, next) => {
  const { rol } = req.body;

  // Valida que la propiedad 'rol' exista y no esté vacía
  if (!rol) {
    return res
      .status(400)
      .json({ mensaje: "Falta enviar el rol de esta cuenta" });
  }

  const negocio = await Negocio.findOne(); // Obtén el documento de negocio (ajusta esto según tu aplicación)
  const { funcionamiento } = negocio;
  const { actividad, horas } = funcionamiento;
  if (actividad) {
    if (rol === "coord" || rol === "pers") {
      const currentDate = moment(); // Obtén la hora actual como objeto Moment

      const [inicioHora, inicioMinuto] = horas.inicio.split(":");
      const [finHora, finMinuto] = horas.fin.split(":");

      const startTime = currentDate
        .clone()
        .set({ hour: inicioHora, minute: inicioMinuto });
      const endTime = currentDate
        .clone()
        .set({ hour: finHora, minute: finMinuto });

      // Verificar si la hora actual está entre la hora de inicio y fin
      if (moment(currentDate, "HH:mm").isBetween(startTime, endTime)) {
        next();
        return;
      } else {
        res.status(403).json({
          mensaje: "Se encuentra fuera del Horario de Atencion",
          type: "outTime",
        });
      }
    } else if (rol === "admin" || rol === "gerente") {
      next();
      return;
    } else {
      res
        .status(403)
        .json({ mensaje: "El rol obtenido no cumple ninguna funcion" });
    }
  } else {
    if (rol === "admin") {
      next();
      return;
    } else {
      res
        .status(403)
        .json({ mensaje: "Cierre de Emergencia", type: "locking" });
    }
  }
};

// Verifica q no existe ni correo ni usuario iguales
export const checkUniqueFields = async (req, res, next) => {
  const { usuario, email } = req.body;
  const duplicateFields = [];

  // Verifica si el nombre de usuario ya existe en la colección
  const existingUserByUsername = await Usuario.findOne({ usuario });
  if (existingUserByUsername) {
    duplicateFields.push("usuario");
  }

  // Verifica si el correo electrónico ya existe en la colección
  const existingUserByEmail = await Usuario.findOne({ email });
  if (existingUserByEmail) {
    duplicateFields.push("correo");
  }

  // Si se encontraron duplicados en nombre de usuario o correo, envía una respuesta con los campos duplicados
  if (duplicateFields.length > 0) {
    return res.status(401).json({
      mensaje: "Campos duplicados",
      duplicados: duplicateFields,
      type: "duplicated",
    });
  }

  // Si no hay campos duplicados, continúa con el registro
  next();
};
