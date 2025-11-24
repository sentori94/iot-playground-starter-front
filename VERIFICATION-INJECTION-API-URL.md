# 🔍 Guide de Vérification - Injection API_URL

## ✅ Modifications apportées

### 1. **environment.prod.ts** - Lecture dynamique au runtime
```typescript
// AVANT (❌ lecture au chargement du module)
export const environment = {
  production: true,
  apiUrl: (window as any).__env?.API_URL || 'http://localhost:8080'
};

// APRÈS (✅ lecture à chaque accès via getter)
export const environment = {
  production: true,
  get apiUrl() {
    return window.__env?.API_URL || 'http://localhost:8080';
  }
};
```

### 2. **simulation.service.ts** - Utilisation dynamique de l'URL
```typescript
// AVANT (❌ valeur figée à la construction)
private readonly baseUrl = environment.apiUrl;

// APRÈS (✅ lecture dynamique à chaque appel)
private get baseUrl(): string {
  return environment.apiUrl;
}
```

---

## 🧪 Comment vérifier que ça fonctionne

### Méthode 1: Console du navigateur

1. Ouvrez http://localhost:8080 dans votre navigateur
2. Ouvrez la Console DevTools (F12)
3. Tapez :
```javascript
console.log('API_URL:', window.__env.API_URL);
```

**Résultat attendu** :
```
API_URL: http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com
```

### Méthode 2: Page de test HTML

1. Ouvrez http://localhost:8080/test.html
2. Vous devriez voir :
   - ✅ window.__env disponible : Oui
   - ✅ window.__env.API_URL : http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com
   - ✅ Fichier env.js chargé : Chargé (XXX caractères)

### Méthode 3: Vérifier le fichier env.js

```bash
curl http://localhost:8080/assets/env.js
```

**Résultat attendu** :
```javascript
(function (window) {
  window.__env = window.__env || {};
  window.__env.API_URL = 'http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com';
}(this));
```

### Méthode 4: Vérifier dans Network tab

1. Ouvrez DevTools → Network
2. Rechargez la page
3. Cherchez les requêtes vers `/api/runs/can-start` ou `/api/runs/running`
4. Vérifiez que l'URL complète est : `http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com/api/...`

---

## 🐛 Si ça ne fonctionne pas

### Problème 1: window.__env est undefined

**Cause** : Le fichier `env.js` n'est pas chargé ou n'existe pas

**Solution** :
```bash
# Vérifier dans le container
docker exec iot-front cat /usr/share/nginx/html/assets/env.js

# Vérifier via HTTP
curl http://localhost:8080/assets/env.js
```

### Problème 2: L'application utilise toujours localhost:8080

**Cause** : Le cache du navigateur

**Solution** :
1. Ctrl + Shift + R (hard refresh)
2. Ou ouvrir en navigation privée
3. Ou vider le cache

### Problème 3: env.js contient l'URL par défaut

**Cause** : La variable d'environnement n'a pas été passée au container

**Solution** :
```bash
# Recréer le container avec la variable
docker stop iot-front
docker rm iot-front
docker run -d -p 8080:8080 \
  -e API_URL=http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com \
  --name iot-front \
  iot-playground-front:latest
```

### Problème 4: Les requêtes vont toujours vers localhost

**Cause** : Le service Angular lit l'URL trop tôt

**Solution** : C'est résolu avec le getter dans `environment.prod.ts` ✅

---

## 📊 Test complet étape par étape

### 1. Build l'image
```bash
docker build -t iot-playground-front:latest .
```

### 2. Lancer avec une URL custom
```bash
docker run -d -p 8080:8080 \
  -e API_URL=http://mon-backend.com \
  --name iot-front \
  iot-playground-front:latest
```

### 3. Vérifier l'injection dans le fichier
```bash
curl http://localhost:8080/assets/env.js
# Doit contenir: window.__env.API_URL = 'http://mon-backend.com'
```

### 4. Vérifier dans le navigateur
```javascript
// Console DevTools
console.log(window.__env.API_URL);
// Doit afficher: http://mon-backend.com
```

### 5. Vérifier les requêtes réseau
- Ouvrir DevTools → Network
- Déclencher une action (ex: vérifier si on peut démarrer une simulation)
- La requête doit aller vers : `http://mon-backend.com/api/...`

---

## ✅ Checklist de validation

- [ ] `docker build` réussit sans erreur
- [ ] Le container démarre sans erreur
- [ ] Le fichier `assets/env.js` existe et contient la bonne URL
- [ ] `window.__env.API_URL` est accessible dans la console
- [ ] Les requêtes HTTP vont vers la bonne URL (Network tab)
- [ ] Aucune erreur CORS (si backend accessible)
- [ ] L'application fonctionne normalement

---

## 🎯 Pour le déploiement sur ECS

Votre image est maintenant prête ! Il suffit de configurer la variable dans la Task Definition :

```json
{
  "environment": [
    {
      "name": "API_URL",
      "value": "http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com"
    }
  ]
}
```

La même image fonctionnera dans tous les environnements, seule la variable `API_URL` change ! 🚀

