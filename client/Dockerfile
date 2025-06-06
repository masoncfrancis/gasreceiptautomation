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

ARG NODE_ENV=production

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copiar configuración personalizada de nginx
RUN echo 'server { \
    listen 8003; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri.html $uri/ /index.html; \
        add_header Cache-Control "public, max-age=3600"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos generados de la etapa anterior
COPY --from=builder /app/out /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 8003

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]