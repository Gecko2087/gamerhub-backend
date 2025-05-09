import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  rawgId: {
    type: Number,
    unique: true,
    required: false // Ahora no es obligatorio para juegos manuales
  },
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  slug: String,
  esrbRating: String,
  backgroundImage: {
    type: String,
    required: [true, 'La imagen de fondo es requerida']
  },
  rating: {
    type: Number,
    min: [0, 'La calificación no puede ser menor a 0'],
    max: [5, 'La calificación no puede ser mayor a 5']
  },
  released: Date,
  platforms: [{
    type: String,
    required: [true, 'Las plataformas son requeridas']
  }],
  genres: {
    type: [String],
    required: [true, 'Los géneros son requeridos']
  },
  watchlist: {
    profiles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile'
    }]
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida']
  },
  website: String,
  ageRating: {
    type: String,
    enum: ['E', 'E10+', 'T', 'M', 'AO'],
    required: [true, 'La clasificación por edad es requerida']
  },
  releaseDate: {
    type: Date,
    required: [true, 'La fecha de lanzamiento es requerida']
  },
  metacritic: {
    type: Number,
    min: [0, 'La puntuación de Metacritic no puede ser menor a 0'],
    max: [100, 'La puntuación de Metacritic no puede ser mayor a 100']
  },
  lastSynced: {
    type: Date,
    default: Date.now
  }
});

// Índices
gameSchema.index({ name: 'text', description: 'text' });
gameSchema.index({ genres: 1 });
gameSchema.index({ platforms: 1 });
gameSchema.index({ ageRating: 1 });
gameSchema.index({ rating: -1 });
gameSchema.index({ metacritic: -1 });
gameSchema.index({ releaseDate: -1 });

// Middleware para actualizar lastSynced
gameSchema.pre('save', function(next) {
  this.lastSynced = new Date();
  next();
});

export default mongoose.model('Game', gameSchema);
