# 🚀 Guide Rapide - Déploiement sur AWS ECS

## ✅ Validation Locale

Votre application fonctionne correctement en local sur le port **8080** :

```bash
docker run -d -p 8080:8080 \
  -e API_URL=http://votre-backend:8080 \
  --name iot-front \
  iot-playground-front:latest
```

Accès : http://localhost:8080

---

## 📦 Push vers AWS ECR

### 1. Build de l'image
```bash
docker build -t iot-playground-front:latest .
```

### 2. Tag pour ECR
```bash
$AWS_ACCOUNT_ID = "YOUR_ACCOUNT_ID"
$AWS_REGION = "eu-west-1"
$ECR_REPO = "iot-playground-front"

docker tag iot-playground-front:latest `
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"
```

### 3. Login ECR
```bash
aws ecr get-login-password --region $AWS_REGION | `
  docker login --username AWS --password-stdin `
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

### 4. Push
```bash
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"
```

---

## ⚙️ Configuration ECS Task Definition

### JSON minimal
```json
{
  "family": "iot-playground-front",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/iot-playground-front:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "API_URL",
          "value": "http://backend-service.local:8080"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/iot-playground-front",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "frontend"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

---

## 🎯 Configuration selon l'environnement

### Développement
```json
{
  "name": "API_URL",
  "value": "http://dev-backend-alb-123.eu-west-1.elb.amazonaws.com"
}
```

### Staging
```json
{
  "name": "API_URL",
  "value": "https://api-staging.votredomaine.com"
}
```

### Production
```json
{
  "name": "API_URL",
  "value": "https://api.votredomaine.com"
}
```

### Backend dans le même VPC (Service Discovery)
```json
{
  "name": "API_URL",
  "value": "http://backend.iot-namespace.local:8080"
}
```

---

## 🔍 Vérification du déploiement

### 1. Vérifier les logs ECS
Dans AWS Console → ECS → Task → Logs, vous devriez voir :
```
🚀 Démarrage de l'application IoT Playground...
✅ Configuration injectée - API_URL: http://...
🌐 Démarrage de Nginx sur le port 8080...
```

### 2. Tester le healthcheck
```bash
curl http://VOTRE-ALB/health
# Réponse attendue : "healthy"
```

### 3. Vérifier l'injection de la variable
Accédez à : `http://VOTRE-ALB/assets/env.js`

Vous devriez voir :
```javascript
(function (window) {
  window.__env = window.__env || {};
  window.__env.API_URL = 'http://votre-backend-url';
}(this));
```

---

## 🔧 Configuration ALB (Application Load Balancer)

### Target Group
- **Protocol** : HTTP
- **Port** : 8080
- **Health Check Path** : `/health`
- **Health Check Interval** : 30s
- **Healthy Threshold** : 2
- **Unhealthy Threshold** : 3

### Listener Rules
- **Port** : 80 (HTTP) ou 443 (HTTPS)
- **Forward to** : Target Group frontend
- **Sticky Sessions** : Désactivé (stateless app)

---

## 📊 Scaling Configuration

### Autoscaling Policy
```json
{
  "minCapacity": 2,
  "maxCapacity": 10,
  "targetTrackingScalingPolicies": [
    {
      "targetValue": 70.0,
      "predefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  ]
}
```

---

## 🐛 Dépannage

### Le container ne démarre pas
1. Vérifier les logs CloudWatch
2. Vérifier que le port 8080 est bien exposé
3. Vérifier les Security Groups (autoriser le trafic sur 8080)

### Erreur de connexion au backend
1. Vérifier que `API_URL` est correctement configurée
2. Tester la connectivité réseau entre les services
3. Vérifier les Security Groups (backend doit autoriser le frontend)

### L'application affiche une page blanche
1. Vérifier que les fichiers sont bien copiés : `docker exec <container> ls /usr/share/nginx/html`
2. Vérifier les logs Nginx dans CloudWatch
3. Vérifier que `index.html` existe

---

## 📝 Checklist finale

- [ ] Image buildée et testée localement
- [ ] Image pushée sur ECR
- [ ] Task Definition créée avec `API_URL` configurée
- [ ] Service ECS créé et lié à l'ALB
- [ ] Security Groups configurés (ALB → ECS → Backend)
- [ ] CloudWatch Logs configurés
- [ ] Healthcheck validé (retourne 200 sur `/health`)
- [ ] Application accessible via l'ALB
- [ ] Variable `API_URL` correctement injectée

---

## 🎉 Succès !

Votre frontend Angular est maintenant déployé sur AWS ECS avec une configuration dynamique de l'API URL ! 🚀

**Important** : La même image Docker fonctionne pour tous les environnements (dev, staging, prod). Seule la variable d'environnement `API_URL` change !

