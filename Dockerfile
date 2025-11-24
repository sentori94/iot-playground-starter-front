# ---- Build stage ----
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build:prod

# Vérifier que le build a bien généré les fichiers
RUN echo "📁 Vérification du contenu après build:" && \
    ls -la /app/dist/ && \
    ls -la /app/dist/iot-playground/ && \
    ls -la /app/dist/iot-playground/browser/ && \
    ls -la /app/dist/iot-playground/browser/browser/ && \
    if [ ! -f /app/dist/iot-playground/browser/browser/index.html ]; then \
        echo "❌ ERREUR: index.html non trouvé après le build!"; \
        exit 1; \
    else \
        echo "✅ index.html trouvé"; \
    fi

# ---- Runtime stage ----
FROM nginx:1.25-alpine

# Supprimer les fichiers par défaut
RUN rm -rf /usr/share/nginx/html/*

# Copier les fichiers buildés (noter le double browser/)
COPY --from=build /app/dist/iot-playground/browser/browser /usr/share/nginx/html

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copier le script d'injection des variables d'environnement
COPY docker-entrypoint-simple.sh /docker-entrypoint-simple.sh
RUN chmod +x /docker-entrypoint-simple.sh

# Variable d'environnement par défaut
ENV API_URL=http://localhost:8080

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/docker-entrypoint-simple.sh"]

