# 🔧 Configuration de l'API URL selon l'environnement

Ce document explique comment configurer l'URL de l'API backend selon l'environnement de déploiement.

## 📋 Architecture de configuration

L'application Angular utilise un système de configuration dynamique qui permet de changer l'URL de l'API sans rebuild :

```
Démarrage Container
       ↓
   env.sh (script)
       ↓
Injection dans assets/env.js
       ↓
   window.__env.API_URL
       ↓
environment.prod.ts lit la variable
       ↓
SimulationService utilise l'URL
```

## 🏠 Développement Local (ng serve)

**Fichier** : `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'
};
```

**Commande** :
```bash
ng serve
```

**URL utilisée** : `http://localhost:8080`

---

## 🐳 Docker Local

### Option 1 : Docker run avec variable d'environnement

```bash
docker run -d \
  -p 80:80 \
  -e API_URL=http://localhost:8080 \
  --name iot-front \
  iot-playground-front:latest
```

### Option 2 : Docker Compose

**Fichier** : `docker-compose.yml`

```yaml
services:
  frontend:
    image: iot-playground-front:latest
    environment:
      - API_URL=http://backend:8080
```

**Commande** :
```bash
docker-compose up -d
```

**URL utilisée** : `http://backend:8080` (nom du service backend)

---

## ☁️ AWS ECS avec ALB (Application Load Balancer)

### Configuration dans la Task Definition

```json
{
  "family": "iot-playground-front",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "<account-id>.dkr.ecr.eu-west-1.amazonaws.com/iot-playground-front:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "API_URL",
          "value": "https://iot-backend-alb-123456789.eu-west-1.elb.amazonaws.com"
        }
      ]
    }
  ]
}
```

### Avec AWS Systems Manager Parameter Store (Recommandé)

```json
{
  "environment": [],
  "secrets": [
    {
      "name": "API_URL",
      "valueFrom": "arn:aws:ssm:eu-west-1:123456789:parameter/iot-playground/api-url"
    }
  ]
}
```

**Créer le paramètre** :
```bash
aws ssm put-parameter \
  --name "/iot-playground/api-url" \
  --value "https://api.mondomaine.com" \
  --type "String" \
  --region eu-west-1
```

---

## 🔗 AWS ECS avec Service Discovery

Si vous utilisez AWS Cloud Map pour la découverte de services :

```json
{
  "environment": [
    {
      "name": "API_URL",
      "value": "http://backend.iot-playground.local:8080"
    }
  ]
}
```

Le nom `backend.iot-playground.local` est automatiquement résolu par AWS Cloud Map.

---

## 🌍 Production avec domaine personnalisé

### Avec Route 53 + ALB

```json
{
  "environment": [
    {
      "name": "API_URL",
      "value": "https://api.monentreprise.com"
    }
  ]
}
```

### Avec API Gateway

```json
{
  "environment": [
    {
      "name": "API_URL",
      "value": "https://abc123.execute-api.eu-west-1.amazonaws.com/prod"
    }
  ]
}
```

---

## 🔄 Changement d'URL sans rebuild

### Via AWS ECS Console

1. Ouvrir **ECS Console**
2. Sélectionner le **Cluster**
3. Sélectionner le **Service**
4. Cliquer sur **Update**
5. Onglet **Task Definition** → **Configure via JSON**
6. Modifier la valeur de `API_URL` dans `environment`
7. **Update Service**

### Via AWS CLI

```bash
# Récupérer la task definition actuelle
aws ecs describe-task-definition --task-definition iot-playground-front > task-def.json

# Modifier API_URL dans task-def.json

# Enregistrer la nouvelle version
aws ecs register-task-definition --cli-input-json file://task-def.json

# Mettre à jour le service
aws ecs update-service \
  --cluster iot-playground-cluster \
  --service iot-playground-front-service \
  --task-definition iot-playground-front:NEW_REVISION \
  --force-new-deployment
```

---

## 🧪 Tester la configuration

### Vérifier l'URL utilisée

Ouvrir la console du navigateur (F12) et taper :

```javascript
console.log(window.__env.API_URL);
```

### Vérifier dans le container

```bash
# Se connecter au container
docker exec -it iot-front sh

# Afficher le fichier env.js
cat /usr/share/nginx/html/assets/env.js
```

**Résultat attendu** :
```javascript
(function (window) {
  window.__env = window.__env || {};
  window.__env.API_URL = 'http://backend:8080';
}(this));
```

---

## 🔒 Bonnes pratiques de sécurité

### ❌ Ne PAS faire

```json
// Ne pas hardcoder les URLs de production dans le code
export const environment = {
  apiUrl: 'https://prod-api.example.com' // ❌ Mauvais
};
```

### ✅ À faire

```json
// Utiliser les variables d'environnement
{
  "environment": [
    {
      "name": "API_URL",
      "value": "https://api.example.com" // ✅ Bon
    }
  ]
}
```

### ✅ Encore mieux : Secrets Manager

```json
{
  "secrets": [
    {
      "name": "API_URL",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:api-url"
    }
  ]
}
```

---

## 📊 Récapitulatif des URLs selon l'environnement

| Environnement | API_URL | Exemple |
|---------------|---------|---------|
| **Dev local** | `http://localhost:8080` | ng serve |
| **Docker local** | `http://backend:8080` | docker-compose |
| **ECS + ALB** | `https://alb-xxx.elb.amazonaws.com` | AWS ALB DNS |
| **ECS + Service Discovery** | `http://backend.namespace.local:8080` | Cloud Map |
| **Production** | `https://api.mondomaine.com` | Route 53 + ALB |

---

## 🐛 Troubleshooting

### Erreur CORS

Si vous voyez des erreurs CORS dans la console :

1. Vérifier que l'URL de l'API est correcte
2. Vérifier la configuration CORS dans le backend Spring Boot
3. S'assurer que le protocole (http/https) est correct

### L'application utilise toujours localhost

1. Vérifier que `env.js` contient la bonne URL :
   ```bash
   docker exec iot-front cat /usr/share/nginx/html/assets/env.js
   ```

2. Vérifier que le script `env.sh` s'est bien exécuté :
   ```bash
   docker logs iot-front | grep "Configuration"
   ```

3. Rebuild l'image si nécessaire :
   ```bash
   docker build --no-cache -t iot-playground-front .
   ```

### Variable d'environnement non prise en compte

Forcer un redémarrage du service ECS :
```bash
aws ecs update-service \
  --cluster <cluster-name> \
  --service <service-name> \
  --force-new-deployment
```

---

**Créé le** : 2025-01-23  
**Dernière mise à jour** : 2025-01-23

