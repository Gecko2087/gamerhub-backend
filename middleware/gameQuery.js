export function validateGameQuery(req, res, next) {
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value !== 'string' || value.length > 160) {
      return res.status(400).json({ error: 'Parámetros de búsqueda inválidos.' });
    }
    if (key === 'page' || key === 'pageSize') {
      if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 100) {
        return res.status(400).json({ error: 'La página y el tamaño deben estar entre 1 y 100.' });
      }
    }
  }
  next();
}
export function literalPattern(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
