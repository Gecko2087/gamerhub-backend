import User from '../models/User.js';
import Profile from '../models/Profile.js';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Verificar si el email ya está en uso
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Validar el rol
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Crear el usuario - dejamos que el middleware haga el hash
    const user = new User({
      name,
      email,
      password,
      role
    });

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el email ya está en uso (solo si se está cambiando)
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'El email ya está registrado por otro usuario' });
      }
    }

    // Validar el rol si se está actualizando
    if (updates.role && !['user', 'admin'].includes(updates.role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // No permitir cambiar el rol del último admin
    if (updates.role && user.role === 'admin' && updates.role === 'user') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'No se puede eliminar el último administrador' });
      }
    }

    // Actualizar los campos del usuario - No hacemos hash manual aquí
    // El middleware se encargará de hash la contraseña si ha sido modificada
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });
    
    // Guardar los cambios
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // No permitir cambiar el rol del último admin
    if (user.role === 'admin' && role === 'user') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'No se puede eliminar el último administrador' });
      }
    }

    user.role = role;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // No permitir eliminar el último admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'No se puede eliminar el último administrador' });
      }
    }

    // Eliminar todos los perfiles asociados al usuario
    await Profile.deleteMany({ userId: user._id });

    await user.deleteOne();
    res.json({ message: 'Usuario y sus perfiles eliminados correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

export const getUserProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ userId: req.params.id });
    res.json(profiles);
  } catch (error) {
    console.error('Error al obtener perfiles del usuario:', error);
    res.status(500).json({ message: 'Error al obtener perfiles del usuario' });
  }
};