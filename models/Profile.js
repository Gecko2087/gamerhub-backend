import { Schema, model, Types } from 'mongoose';

const ProfileSchema = new Schema({
  userId: { 
    type: Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: [1, 'El nombre debe tener al menos 1 carácter'],
    maxlength: [20, 'El nombre no puede tener más de 20 caracteres']
  },
  // Eliminado avatar
  // Eliminado birthDate
  allowedRating: { 
    type: String, 
    enum: ['KIDS', 'ADULTS'], 
    default: 'ADULTS' 
  },
  watchlist: { 
    type: [String], // Puede guardar RAWG IDs (números como string) y ObjectId de MongoDB
    default: []
  },
  preferences: {
    favoriteGenres: {
      type: [String],
      default: []
    },
    favoritePlatforms: {
      type: [String],
      default: []
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para búsquedas eficientes
ProfileSchema.index({ userId: 1, name: 1 }, { unique: true });

// Middleware para actualizar lastActive
ProfileSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

export default model('Profile', ProfileSchema);
