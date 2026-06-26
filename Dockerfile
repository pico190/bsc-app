# Imagen ligera de Node.js
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar solo los archivos de dependencias primero para aprovechar la caché de capas
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el código fuente
COPY src ./src

# Crear directorio de datos para persistencia con volumen
RUN mkdir -p /app/data

# Comando por defecto: registra comandos y luego inicia el bot
CMD ["node", "src/start.js"]
