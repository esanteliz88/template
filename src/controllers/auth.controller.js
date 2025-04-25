import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import { handleFailedLogin, handleSuccessfulLogin } from '../middleware/rateLimit.memory.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'tu_super_secreto_temporal';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

const createToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'El email ya está registrado'
      });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // Generar token
    const token = createToken(user.id);

    logger.info(`Usuario registrado: ${email}`);
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user,
      token
    });
  } catch (error) {
    logger.error('Error en registro:', error);
    res.status(500).json({
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      await handleFailedLogin(req);
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await handleFailedLogin(req);
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    // Login exitoso - limpiar intentos fallidos
    await handleSuccessfulLogin(req);

    // Generar token
    const token = createToken(user.id);

    // Excluir contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`Login exitoso: ${email}`);
    res.json({
      message: 'Login exitoso',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { email, name, currentPassword, password } = req.body;
    const userId = req.user.userId;

    // Obtener usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // Si se intenta cambiar la contraseña, verificar la actual
    if (password) {
      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isValidPassword) {
        return res.status(401).json({
          message: 'La contraseña actual es incorrecta'
        });
      }
    }

    // Preparar datos para actualización
    const updateData = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (password) {
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'El email ya está en uso'
      });
    }
    res.status(500).json({
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
}; 