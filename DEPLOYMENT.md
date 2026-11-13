# Demo GamerHub con API y MongoDB

El backend puede desplegarse en Vercel como Express (`app.js`) o arrancar con `npm start` en un servicio Node. Usar una base MongoDB NUEVA y exclusivamente de prueba.

Variables privadas: `MONGODB_URI`, `JWT_SECRET` nuevo, `DEMO_MODE=true`, `DEMO_CATALOG=true`, `CLIENT_URL` con la URL HTTPS exacta del frontend. Con catálogo demo no se necesita una clave RAWG: los juegos son ficticios, pero perfiles, favoritos y permisos se procesan y persisten en MongoDB. La aplicación original puede usar RAWG cuando `DEMO_CATALOG` está desactivado.

El visitante obtiene un JWT individual de una hora y un perfil inicial. No comparte cuenta ni recibe rol admin. Registro y login tradicional quedan deshabilitados en demo. Límites en MongoDB: 250 solicitudes por visitante y 100 nuevas sesiones por día. Las sesiones expiradas y sus perfiles se limpian al crear nuevas sesiones.

El frontend usa `VITE_API_URL=https://<backend>/api`. Esta variable es una URL pública, nunca una credencial. Netlify requiere redirigir rutas de la SPA a `index.html`.

Para usar el catálogo real, configura `RAWG_API_KEY` como secreto del backend y cambia `DEMO_CATALOG` a `false`, conservando `DEMO_MODE=true`. El catálogo general y la búsqueda por título consultan RAWG. Los filtros por plataforma y género operan sobre los juegos guardados en MongoDB. Los favoritos siguen asociados a cada perfil temporal.

Para usar IGDB en el catálogo público, configura `GAME_CATALOG_PROVIDER=igdb`, `DEMO_MODE=true` y `DEMO_CATALOG=false`. Guarda `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET` en Render. Los juegos conservan un ID interno de MongoDB y los favoritos existentes siguen apuntando a sus registros originales. Los filtros consultan los títulos de IGDB que ya se guardaron en MongoDB.

Verificación: `npm test` y `node tests/demo.integration.mjs`. El segundo utiliza MongoDB temporal descargado desde su fuente oficial, HTTP real, JWT y modelos originales; nunca conecta a la base histórica. `/api/health` confirma proceso HTTP, no prueba por sí solo disponibilidad de MongoDB.

La limpieza del código no acredita que antiguos equipos o despliegues estén limpios. Revocar las credenciales de prueba que sigan activas y reemplazarlas antes de publicar.
