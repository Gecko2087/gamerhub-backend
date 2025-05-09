import userRoutes from '../routes/userRoutes.js';

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/watchlist', watchlistRoutes); 