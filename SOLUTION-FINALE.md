# 🎯 SOLUTION FINALE - Lecture directe de window.__env

## ✅ Ce qui a été fait

Au lieu de passer par `environment.ts` (qui est compilé dans le bundle), le service **lit maintenant directement** `window.__env` à chaque appel.

### Code final dans `simulation.service.ts` :

```typescript
// Getter pour récupérer l'URL DIRECTEMENT depuis window.__env
private get baseUrl(): string {
  // Lire directement window.__env, sans passer par environment.ts
  const apiUrl = (typeof window !== 'undefined' && window.__env?.API_URL) 
    ? window.__env.API_URL 
    : 'http://localhost:8080';
  
  console.log('🌍 [SimulationService] Lecture de window.__env:');
  console.log('  - window existe?', typeof window !== 'undefined');
  console.log('  - window.__env existe?', typeof window !== 'undefined' && !!window.__env);
  console.log('  - window.__env.API_URL =', typeof window !== 'undefined' && window.__env?.API_URL);
  console.log('  - URL finale:', apiUrl);
  
  return apiUrl;
}
```

---

## 🧪 Tests à effectuer MAINTENANT

### 1. **Page de test HTML simple**

Ouvrez dans votre navigateur : **http://localhost:8080/simple-test.html**

Vous devriez voir 4 tests verts ✅ :
- ✅ Test 1: window.__env existe ? **OUI**
- ✅ Test 2: window.__env.API_URL existe ? **OUI**
- ✅ Test 3: La valeur correspond ? **OUI** 
- ✅ Test 4: Logs dans la console

### 2. **Application Angular réelle**

Ouvrez : **http://localhost:8080**

Dans la **Console DevTools (F12)**, vous devriez voir :

```
🌍 [SimulationService] Lecture de window.__env:
  - window existe? true
  - window.__env existe? true
  - window.__env.API_URL = http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com
  - URL finale: http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com
```

### 3. **Vérifier les requêtes réseau**

Dans **DevTools → Network** :

1. Filtrer par `/api`
2. Cliquer sur une requête (ex: `can-start`)
3. **Request URL** doit être : 
   ```
   http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com/api/runs/can-start
   ```

---

## 🔥 Si ça ne marche TOUJOURS pas

### A. Vider complètement le cache

```javascript
// Dans la console, tapez:
location.reload(true);
```

Ou **Ctrl + Shift + Delete** → Vider tout le cache

### B. Navigation privée

Ouvrez l'application en **mode navigation privée** (Ctrl + Shift + P sur Firefox/Chrome)

### C. Vérifier que c'est bien la nouvelle image

```bash
# Vérifier l'ID de l'image
docker ps --filter "name=iot-front-test" --format "{{.Image}}"

# Doit afficher: iot-playground-front:latest

# Vérifier la date de création
docker images iot-playground-front:latest --format "{{.CreatedAt}}"
# Doit être aujourd'hui (2025-11-24)
```

### D. Forcer un nouveau container

```bash
docker stop iot-front-test
docker rm iot-front-test
docker run -d -p 8080:8080 \
  -e API_URL=http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com \
  --name iot-front-test \
  iot-playground-front:latest
```

Attendez 3 secondes puis ouvrez : http://localhost:8080?t=123456

(Le `?t=123456` force le navigateur à recharger)

---

## 🎯 Logs attendus dans la console

### Au démarrage de l'app :
```
🎯 [SimulationService] Service créé
```

### Au premier appel API (après ~1-2 secondes) :
```
🌍 [SimulationService] Lecture de window.__env:
  - window existe? true
  - window.__env existe? true
  - window.__env.API_URL = http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com
  - URL finale: http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com

📞 Appel canStartSimulation vers: http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com/api/runs/can-start
```

---

## 📊 Diagnostic complet

Si vous voyez **toujours** `localhost:8080`, envoyez-moi le résultat de ces commandes :

```bash
# 1. Vérifier env.js
curl http://localhost:8080/assets/env.js

# 2. Vérifier dans le container
docker exec iot-front-test cat /usr/share/nginx/html/assets/env.js

# 3. Vérifier les logs du container
docker logs iot-front-test | head -10

# 4. Tester la page simple
curl http://localhost:8080/simple-test.html | Select-String "API_URL"
```

Et aussi **un screenshot de la console (F12)** montrant les logs.

---

## 🚀 Une fois validé

### Pour le déploiement ECS :

```bash
# 1. Tag l'image
docker tag iot-playground-front:latest YOUR_ECR_REPO:latest

# 2. Push vers ECR
docker push YOUR_ECR_REPO:latest

# 3. Task Definition ECS
{
  "environment": [
    {
      "name": "API_URL",
      "value": "http://spring-app-alb-dev-1915205046.eu-west-3.elb.amazonaws.com"
    }
  ]
}
```

La même image fonctionnera partout ! 🎉

---

## 💡 Pourquoi cette approche fonctionne

1. **Pas de compilation** : `window.__env` est lu au runtime, pas au build
2. **Pas d'environment.ts** : On évite les problèmes de compilation Angular
3. **Getter dynamique** : Appelé à chaque requête HTTP
4. **Logs détaillés** : On voit exactement ce qui est lu

C'est la **méthode la plus robuste** pour les variables d'environnement runtime avec Angular ! 💪

