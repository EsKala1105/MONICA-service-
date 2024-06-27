import express from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import Usuario from "../models/usuarios/usuarios.js";
import Accesos from "../models/usuarios/accesos.js";
import PasswordResetCodes from "../models/usuarios/passwordResetCodes.js";
import UserRegistroCodes from "../models/usuarios/userRegistroCodes.js";
import {
  checkUniqueFields,
  openingHours,
  verifyCodigo,
  verifyToken,
} from "../middleware/middleware.js";
import { secretKey, emailBusiness, passBusiness } from "../utils/varsGlobal.js";
import {
  activeAccount,
  recoveryPassword,
} from "../models/usuarios/designEmail/activeAccount.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: emailBusiness,
    pass: passBusiness,
  },
});

async function _CodResetPassword(id) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 1);

  try {
    let codigo;
    let codigoExistente;

    // Busca y elimina cualquier registro en Verify con el mismo idUser
    await PasswordResetCodes.deleteMany({ idUser: id });

    do {
      codigo = "";
      for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * caracteres.length);
        codigo += caracteres.charAt(randomIndex);
      }

      codigoExistente = await PasswordResetCodes.findOne({ codigo }).exec();
    } while (codigoExistente);

    const nuevoCodigo = new PasswordResetCodes({
      idUser: id,
      codigo: codigo,
      expiracion: expirationTime,
    });

    await nuevoCodigo.save();

    return codigo;
  } catch (error) {
    throw new Error(`Error al generar y guardar el código único: ${error}`);
  }
}

async function _CodFirstRegistro(usuario) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Busca y elimina cualquier registro en Verify con el mismo idUser
  await UserRegistroCodes.deleteMany({ idUser: usuario?._id });

  try {
    let codigo;
    let codigoExistente;

    do {
      codigo = "";
      for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * caracteres.length);
        codigo += caracteres.charAt(randomIndex);
      }

      codigoExistente = await UserRegistroCodes.findOne({ codigo }).exec();
    } while (codigoExistente);

    const nuevoCodigo = new UserRegistroCodes({
      idUser: usuario?._id,
      codigo: codigo,
    });

    await nuevoCodigo.save();
    await enviarCorreo(usuario?.email, activeAccount(codigo), "active");
    return codigo;
  } catch (error) {
    throw new Error(`Error al generar y guardar el código único: ${error}`);
  }
}

async function enviarCorreo(destinatario, _html, type) {
  const rootImgs = "./server/models/usuarios/designEmail/images";
  try {
    const mailOptions = {
      from: emailBusiness,
      to: destinatario,
      subject: "Código de verificación",
      // text: `Tu código de verificación es: ${codigo}`,
      html: _html, // Cambiado de 'text' a 'html'
      attachments: [
        {
          filename: "footer.png",
          path: `${rootImgs}/footer.png`,
          cid: "footer",
        },
        type === "recover"
          ? {
              filename: "recover.png",
              path: `${rootImgs}/recover.png`,
              cid: "recover",
            }
          : {
              filename: "activate.png",
              path: `${rootImgs}/activate.png`,
              cid: "activate",
            },
      ],
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error(`Error al enviar el correo electrónico: ${error}`);
  }
}

const router = express.Router();

router.post("/send-cod-reset-password", async (req, res) => {
  try {
    const { txtInfo, filtro } = req.body;

    if (!txtInfo || !filtro) {
      return res.status(400).send("Falta enviar datos");
    }

    if (!Usuario.schema.paths[filtro]) {
      return res
        .status(400)
        .send(
          "El atributo especificado por filtro no existe en el modelo Usuarios."
        );
    }

    const filtroRegExp = new RegExp(txtInfo, "i");

    const query = {
      state: { $ne: "eliminado" }, // Agregar esta condición para excluir usuarios eliminados
    };

    query[filtro] = filtroRegExp;

    const usuarioEncontrado = await Usuario.findOne(query);

    if (usuarioEncontrado) {
      const codigo = await _CodResetPassword(usuarioEncontrado._id);
      await enviarCorreo(
        usuarioEncontrado.email,
        recoveryPassword(codigo),
        "recover"
      );
      res.status(200).send(usuarioEncontrado);
    } else {
      res
        .status(403)
        .send(
          `${
            filtro === "usuario"
              ? "Este usuario no existe"
              : "No existe usuario con este correo electrónico"
          }`
        );
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en la solicitud");
  }
});

// Ruta para reenviar el código a un usuario
router.get("/resend-code/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    // Busca al usuario y obtén sus datos
    const usuario = await Usuario.findOne({
      _id: userId,
      state: { $ne: "eliminado" },
    }).exec();

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Busca el código asociado al usuario
    let userCode = await UserRegistroCodes.findOne({ idUser: userId }).exec();

    // Si no se encuentra un código, genera uno nuevo
    if (!userCode) {
      const nuevoCodigo = await _CodFirstRegistro(usuario);
      // Envía el código al correo del usuario
      await enviarCorreo(usuario.email, activeAccount(nuevoCodigo), "active");
    } else {
      // Si se encuentra un código, envíalo al correo del usuario
      await enviarCorreo(
        usuario.email,
        activeAccount(userCode.codigo),
        "active"
      );
    }

    res.json("Envio Exitoso");
  } catch (error) {
    console.error("Error al reenviar el código:", error);
    res.status(500).json({ mensaje: "Error al reenviar el código" });
  }
});

router.get("/get-user", [verifyToken, openingHours], async (req, res) => {
  try {
    const { user } = req.body;
    res.json(user);
  } catch (error) {
    console.error("Error al obtener los datos del usuario:", error);
    res.status(500).json({ mensaje: "Error al obtener los datos del usuario" });
  }
});

router.post("/login", async (req, res) => {
  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ mensaje: "Faltan datos requeridos" });
  }

  try {
    const user = await Usuario.findOne({
      usuario,
      state: { $ne: "eliminado" },
    });

    if (!user) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Comparar la contraseña ingresada con la almacenada en la base de datos
    const isPasswordValid = await bcrypt.compare(contraseña, user.contraseña);

    if (!isPasswordValid) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    if (user._validate === false) {
      return res
        .status(200)
        .json({ type: "validate", info: user._id, id: user._id });
    }

    // Genera un JWT con la información del usuario
    const token = jwt.sign({ userId: user._id }, secretKey);

    // Generar una fecha y hora que represente el momento actual más 12 horas
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 12);

    // Verificar si el usuario ya tiene un token en la colección Accesos
    const existingToken = await Accesos.findOne({ idUser: user._id });

    if (existingToken) {
      // Elimina el token existente
      await Accesos.deleteOne({ idUser: user._id });
    }

    // Crea un nuevo registro en la colección Accesos con el token y tiempo de expiración
    const nuevoAcceso = new Accesos({
      idUser: user._id,
      tokens: token,
      expiracion: expirationTime,
    });

    await nuevoAcceso.save();
    res.json({ type: "token", info: token, id: user._id });
  } catch (error) {
    console.error("Error al autenticar el usuario:", error);
    res.status(500).json({ mensaje: "Error al autenticar el usuario" });
  }
});

// Ruta para el primer inicio de sesión
router.post("/first-login", async (req, res) => {
  const { usuario, contraseña, codigo } = req.body;

  if (!usuario || !contraseña || !codigo) {
    return res.status(400).json({ mensaje: "Faltan datos requeridos" });
  }

  try {
    const userCode = await UserRegistroCodes.findOneAndDelete({
      codigo: codigo,
    });

    if (!userCode) {
      return res.status(401).json({ mensaje: "Código no válido" });
    }

    const user = await Usuario.findOne({
      usuario,
      state: { $ne: "eliminado" },
    });

    if (!user) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const isPasswordValid = await bcrypt.compare(contraseña, user.contraseña);

    if (!isPasswordValid) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ userId: user._id }, secretKey);
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 12);

    const existingToken = await Accesos.findOne({ idUser: user._id });

    if (existingToken) {
      await Accesos.deleteOne({ idUser: user._id });
    }

    const nuevoAcceso = new Accesos({
      idUser: user._id,
      tokens: token,
      expiracion: expirationTime,
    });

    await nuevoAcceso.save();

    // Actualiza el campo _validate en el modelo Usuarios
    await Usuario.updateOne({ _id: user._id }, { $set: { state: "activo" } });
    // Busca y elimina cualquier registro en Verify con el mismo id
    await UserRegistroCodes.deleteMany({ idUser: user?._id });
    res.json({
      token,
      id: user._id,
    });
  } catch (error) {
    console.error("Error al autenticar el usuario:", error);
    res.status(500).json({ mensaje: "Error al autenticar el usuario" });
  }
});

router.post("/register", checkUniqueFields, async (req, res) => {
  const { usuario, password, rol, name, email, phone } = req.body;

  if ((!usuario || !password || !rol || !name || !email, !phone)) {
    return res.status(400).json({ mensaje: "Faltan datos requeridos" });
  }

  try {
    // Generar un hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10); // 10 es el factor de costo

    const newUser = new Usuario({
      usuario,
      contraseña: hashedPassword, // Almacenar la contraseña hasheada en la base de datos
      rol,
      name,
      email,
      phone,
      state: "inactivo",
    });

    const usuarioGuardado = await newUser.save();

    // Una vez que se ha validado el registro, genera un código aleatorio
    await _CodFirstRegistro(usuarioGuardado);
    res.json(usuarioGuardado);
  } catch (error) {
    console.error("Error al registrar el usuario:", error);
    res.status(500).json({ mensaje: "Error al registrar el usuario" });
  }
});

// Ruta para editar un usuario por su ID
router.put("/edit-user/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, rol, usuario, password } = req.body;

  try {
    // Verifica si el usuario existe en la base de datos
    const existingUser = await Usuario.findById(id);

    if (!existingUser) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Actualiza los campos del usuario con los nuevos valores
    existingUser.name = name;
    existingUser.email = email;
    existingUser.phone = phone;
    existingUser.rol = rol;

    existingUser.usuario = usuario;

    // Verifica si se proporciona una nueva contraseña
    if (password.length > 0) {
      // Encripta la nueva contraseña usando bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser.contraseña = hashedPassword;
    }

    // Guarda los cambios en la base de datos
    const updatedUser = await existingUser.save();
    res.json(updatedUser);
  } catch (error) {
    console.error("Error al editar el usuario:", error);
    res.status(500).json({ mensaje: "Error al editar el usuario" });
  }
});

// Ruta para editar un usuario por su ID
router.put("/recover-password/:id", verifyCodigo, async (req, res) => {
  const { id } = req.params;
  const { newPassword, codigo } = req.body;
  try {
    // Verifica si el usuario existe en la base de datos
    const existingUser = await Usuario.findOne({
      _id: id,
      state: { $ne: "eliminado" },
    });

    if (!existingUser) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Check if a new password is provided and hash it
    if (newPassword.length > 4) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      existingUser.contraseña = hashedPassword;
    } else {
      return res
        .status(404)
        .json({ mensaje: "Contraseña minimo debe tener 5 caracteres" });
    }

    // Guarda los cambios en la base de datos
    const updatedUser = await existingUser.save();

    if (updatedUser) {
      // Elimina el documento de Verify con el código proporcionado
      await PasswordResetCodes.findOneAndRemove({ codigo });
      res.json(updatedUser);
    } else {
      res
        .status(500)
        .json({ mensaje: "Error al guardar los cambios del usuario" });
    }
  } catch (error) {
    console.error("Error establecer nueva contrsaña:", error);
    res.status(500).json({ mensaje: "Error establecer nueva contrsaña" });
  }
});

// Ruta para obtener todos los usuarios
router.get("/get-list-users", async (req, res) => {
  try {
    const users = await Usuario.find();
    res.json(users);
  } catch (error) {
    console.error("Error al obtener la lista de usuarios:", error);
    res.status(500).json({ mensaje: "Error al obtener la lista de usuarios" });
  }
});

router.put("/delete-user/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    // Verifica si el usuario existe en la base de datos
    const user = await Usuario.findById(userId);

    if (!user) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Cambia el estado del usuario a "eliminado"
    user.state = "eliminado";
    await user.save();

    res.json({ mensaje: "Estado del usuario cambiado a 'eliminado'" });
  } catch (error) {
    console.error("Error al cambiar el estado del usuario:", error);
    res.status(500).json({ mensaje: "Error al cambiar el estado del usuario" });
  }
});

router.get("/get-user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await Usuario.findById(userId);

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
  } catch (error) {
    console.error("Error al obtener la información del usuario:", error);
    res
      .status(500)
      .json({ mensaje: "Error al obtener la información del usuario" });
  }
});

export default router;
