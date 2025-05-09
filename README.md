# GamerHub Backend

Este proyecto corresponde al backend de GamerHub, una plataforma diseñada para conectar a gamers de todo el mundo.

## Deploy

El backend está desplegado en la siguiente URL:

[https://gamerhub-backend.onrender.com/api]

## Requisitos previos

Antes de comenzar, asegúrate de tener instalados los siguientes programas:

- [Node.js](https://nodejs.org/) (versión 14 o superior)
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

## Instalación

Sigue estos pasos para configurar el proyecto en tu máquina local:

1. Clona este repositorio:
    ```bash
    git clone https://github.com/usuario/gamerhub-backend.git
    ```

2. Accede al directorio del proyecto:
    ```bash
    cd gamerhub-backend
    ```

3. Instala las dependencias:
    ```bash
    npm install
    ```

## Configuración

1. Crea un archivo `.env` en la raíz del proyecto y configura las variables de entorno necesarias. Puedes usar el archivo `.env.example` como referencia:
    ```bash
    cp .env.example .env
    ```

2. Edita el archivo `.env` con tus credenciales y configuraciones específicas.

## Uso

Para iniciar el servidor en modo de desarrollo, ejecuta:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000` por defecto.

## Scripts disponibles

- `npm start` o `yarn start`: Inicia el servidor en modo de producción.
- `npm run dev` o `yarn dev`: Inicia el servidor en modo de desarrollo.
- `npm test` o `yarn test`: Ejecuta las pruebas.
