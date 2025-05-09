import 'dotenv/config';
import connect from '../config/db.js';
await connect();

import { searchGames, syncGameWithRawg } from '../services/rawgService.js';

const poblarJuegos = async () => {
  try {
    const data = await searchGames('', 1, 300); // Trae 20 juegos populares
    for (const g of data.results) {
      await syncGameWithRawg(g.id);
      console.log('Sincronizado:', g.name);
    }
    console.log('¡Sincronización de juegos populares completada!');
  } catch (err) {
    console.error('Error al poblar juegos:', err);
  } finally {
    process.exit();
  }
};

poblarJuegos();
