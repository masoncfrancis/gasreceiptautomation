# Etapa de construcción
FROM node:lts-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json .

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Disable Next.js telemetry
RUN npx next telemetry disable

ARG NODE_ENV=production

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos generados de la etapa anterior
COPY --from=builder /app/out /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 8003

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]