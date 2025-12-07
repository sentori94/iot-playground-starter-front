#!/bin/sh
set -e

echo "🚀 Démarrage de l'application IoT Playground..."

# Créer le dossier assets s'il n'existe pas
mkdir -p /usr/share/nginx/html/assets

# Générer le fichier env.js avec les variables d'environnement
cat <<EOF > /usr/share/nginx/html/assets/env.js
(function (window) {
  window.__env = window.__env || {};
  window.__env.API_URL = '${API_URL:-http://localhost:8080}';
  window.__env.INFRA_API_URL = '${INFRA_API_URL:-${API_URL:-http://localhost:8080}}';
}(this));
EOF

echo "✅ Configuration injectée:"
echo "   - API_URL: ${API_URL:-http://localhost:8080}"
echo "   - INFRA_API_URL: ${INFRA_API_URL:-${API_URL:-http://localhost:8080}}"
echo "🌐 Démarrage de Nginx sur le port 8080..."

# Lancer Nginx
exec nginx -g 'daemon off;'

