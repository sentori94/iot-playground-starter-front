# ---- Build stage ----
FROM node:24-alpine AS build
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --silent

# Copier le code source
COPY . .

# Build de production Angular (sans SSR pour éviter les erreurs de connexion)
RUN npm run build:prod

# ---- Runtime stage ----
FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 101 -S nginx-group && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx-group -g nginx-group nginx-user

# Supprimer les fichiers par défaut de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copier les fichiers buildés depuis le build stage (sans SSR)
COPY --from=build /app/dist/iot-playground/browser /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Copier le script d'injection des variables d'environnement
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Permissions correctes
RUN chown -R nginx-user:nginx-group /usr/share/nginx/html && \
    chown -R nginx-user:nginx-group /var/cache/nginx && \
    chown -R nginx-user:nginx-group /var/log/nginx && \
    chown -R nginx-user:nginx-group /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-group /var/run/nginx.pid

USER nginx-user

EXPOSE 80

# Variables d'environnement par défaut
ENV API_URL=http://localhost:8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Utiliser le script env.sh comme entrypoint
ENTRYPOINT ["/docker-entrypoint.d/env.sh"]

