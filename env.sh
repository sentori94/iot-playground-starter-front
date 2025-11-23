#!/bin/sh

# Script pour injecter les variables d'environnement au runtime dans l'application Angular

ENV_FILE="/usr/share/nginx/html/assets/env.js"

# Valeurs par défaut si les variables d'environnement ne sont pas définies
API_URL=${API_URL:-"http://localhost:8080"}

echo "🔧 Configuration de l'application Angular..."
echo "📡 API_URL: $API_URL"

# Génération du fichier env.js avec les variables d'environnement réelles
cat > $ENV_FILE << EOF
(function (window) {
  window.__env = window.__env || {};
  window.__env.API_URL = '$API_URL';
}(this));
EOF

echo "✅ Configuration terminée"
echo "🚀 Démarrage de Nginx..."

# Démarrer Nginx
exec nginx -g 'daemon off;'

