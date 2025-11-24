# 🚀 Configuration API_URL pour AWS ECS

## Comment ça fonctionne ?

Le Dockerfile a été configuré pour injecter dynamiquement la variable `API_URL` au **runtime** (au démarrage du container) via le script `docker-entrypoint-simple.sh`.

### Flux d'exécution :
1. Le container démarre sur ECS
2. Le script `docker-entrypoint-simple.sh` s'exécute
3. Il lit la variable d'environnement `API_URL`
4. Il génère le fichier `/usr/share/nginx/html/assets/env.js` avec cette valeur
5. Nginx démarre et sert l'application
6. L'application Angular lit `window.__env.API_URL`

## ☁️ Configuration sur AWS ECS

### Dans la Task Definition JSON

```json
{
  "family": "iot-playground-front",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "YOUR_ECR_REPO_URI:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "API_URL",
          "value": "https://your-backend-url.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/iot-playground-front",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Via AWS Console

1. Ouvrez **Amazon ECS** → **Task Definitions**
2. Sélectionnez votre task definition
3. Créez une nouvelle révision
4. Dans **Container Definitions** → **Environment variables** :
   - **Key** : `API_URL`
   - **Value** : `https://your-backend-url.com`
5. Enregistrez et déployez

### Via Terraform

```hcl
resource "aws_ecs_task_definition" "frontend" {
  family = "iot-playground-front"
  
  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${aws_ecr_repository.frontend.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "API_URL"
          value = "https://${aws_lb.backend.dns_name}"
        }
      ]
    }
  ])
}
```

## 🧪 Test Local

### Docker Run
```bash
docker build -t iot-playground-front:test .

docker run -p 8080:8080 \
  -e API_URL=https://my-api.example.com \
  iot-playground-front:test
```

### Docker Compose
```yaml
services:
  frontend:
    build: .
    ports:
      - "8080:8080"
    environment:
      - API_URL=http://backend:8080
```

### Vérifier l'injection
```bash
# Démarrer le container
docker run -d --name test-front \
  -p 8080:8080 \
  -e API_URL=https://test-api.com \
  iot-playground-front:test

# Vérifier le fichier env.js généré
docker exec test-front cat /usr/share/nginx/html/assets/env.js

# Devrait afficher :
# (function (window) {
#   window.__env = window.__env || {};
#   window.__env.API_URL = 'https://test-api.com';
# }(this));

# Vérifier les logs
docker logs test-front
```

## 🔍 Exemples d'URLs selon l'environnement

| Environnement | API_URL |
|---------------|---------|
| **Développement local** | `http://localhost:8080` |
| **Docker Compose** | `http://backend:8080` |
| **AWS ECS avec ALB** | `https://iot-backend-alb-123.eu-west-1.elb.amazonaws.com` |
| **AWS ECS avec domaine custom** | `https://api.votredomaine.com` |
| **Staging** | `https://api-staging.votredomaine.com` |
| **Production** | `https://api.votredomaine.com` |

## 🎯 Avantages de cette approche

✅ **Aucun rebuild nécessaire** : La même image Docker fonctionne partout  
✅ **Configuration dynamique** : Change l'URL via une simple variable d'environnement  
✅ **Sécurisé** : Pas de secrets hardcodés dans l'image  
✅ **Flexible** : Fonctionne avec n'importe quelle URL backend  
✅ **Compatible ECS** : S'intègre parfaitement avec les Task Definitions AWS  

## 🛠️ Dépannage

### Le frontend ne trouve pas le backend
1. Vérifiez les logs du container :
   ```bash
   docker logs <container-id>
   ```
   
2. Vérifiez que `API_URL` est bien injecté :
   ```bash
   docker exec <container-id> cat /usr/share/nginx/html/assets/env.js
   ```

3. Vérifiez dans le navigateur (Console DevTools) :
   ```javascript
   console.log(window.__env.API_URL);
   ```

### CORS errors
Si vous avez des erreurs CORS, assurez-vous que votre backend autorise l'origine du frontend dans sa configuration CORS.

