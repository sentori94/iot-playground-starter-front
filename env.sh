#!/bin/sh

# Créer le dossier assets s'il n'existe pas
mkdir -p /usr/share/nginx/html/assets

# Injecter la variable API_URL
cat > /usr/share/nginx/html/assets/env.js << EOF
(function (window) {
  window.__env = window.__env || {};
  window.__env.API_URL = '${API_URL:-http://localhost:8080}';
}(this));
EOF

echo "✅ API_URL configuré: ${API_URL:-http://localhost:8080}"

# Lister le contenu pour debug
echo "📁 Contenu de /usr/share/nginx/html:"
ls -la /usr/share/nginx/html/

echo "📁 Contenu de /usr/share/nginx/html/assets:"
ls -la /usr/share/nginx/html/assets/

# Démarrer Nginx
exec nginx -g 'daemon off;'

