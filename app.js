import express from 'express';
import api from './src/app.js';
const app = express();
app.use(api);
export default app;
