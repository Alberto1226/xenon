# Usa la imagen base de Node.js 16 con Alpine 3.18
FROM node:16-alpine3.18

# Define argumentos de construcción
ARG user
ARG uid

# Actualiza y agrega las herramientas y librerías necesarias
RUN apk update && apk add --no-cache \
    vim \
    build-base \
    nano \
    git \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    libzip-dev \
    freetype-dev \
    jpeg-dev \
    jpegoptim \
    optipng \
    pngquant \
    gifsicle \
    imagemagick-dev \
    zip \
    unzip \
    curl \
    wget

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos package.json y package-lock.json (si existe)
COPY ./xenon/package*.json ./

# Instala las dependencias de Node.js
RUN npm install

# Copia el resto de la aplicación
# COPY ./xenon /usr/src/app

# Compila la aplicación
# RUN npm run build

# Expone el puerto que usa la aplicación
EXPOSE 3000

# Define el entrypoint
# CMD ["node", "__sapper__/build"]
# ENTRYPOINT ["node", "__sapper__/build"]