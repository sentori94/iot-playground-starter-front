# 🚀 Déploiement Docker vers AWS ECR

Ce document explique comment builder et déployer l'application Angular front-end vers AWS ECR (Elastic Container Registry).

## 📋 Prérequis

- Docker Desktop installé et démarré
- AWS CLI configuré avec vos credentials (`aws configure`)
- Droits ECR sur votre compte AWS
- PowerShell (Windows)

## 🏗️ Architecture du Dockerfile

Le Dockerfile utilise une approche **multi-stage** :

### Stage 1 : Build (Node.js)
- Base : `node:20-alpine`
- Installation des dépendances avec `npm ci`
- Build de production Angular
- Résultat : fichiers statiques optimisés

### Stage 2 : Runtime (Nginx)
- Base : `nginx:1.25-alpine`
- Copie des fichiers buildés depuis le stage 1
- Configuration Nginx personnalisée
- Utilisateur non-root pour la sécurité
- Healthcheck intégré

## 🚀 Déploiement rapide

### Option 1 : Script automatisé (Recommandé)

```powershell
# Déploiement avec valeurs par défaut
.\build-and-push-ecr.ps1

# Déploiement avec paramètres personnalisés
.\build-and-push-ecr.ps1 -Region "us-east-1" -RepositoryName "mon-front" -Tag "v1.0.0"
```

### Option 2 : Commandes manuelles

```powershell
# 1. Récupérer l'Account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$REGION = "eu-west-1"
$REPO_NAME = "iot-playground-front"

# 2. Authentification à ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# 3. Créer le repository (si nécessaire)
aws ecr create-repository --repository-name $REPO_NAME --region $REGION --image-scanning-configuration scanOnPush=true

# 4. Build de l'image
docker build -t $REPO_NAME .

# 5. Tag de l'image
docker tag "${REPO_NAME}:latest" "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/${REPO_NAME}:latest"

# 6. Push vers ECR
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/${REPO_NAME}:latest"
```

## 🧪 Test en local

### Build de l'image Docker

```powershell
docker build -t iot-playground-front .
```

### Run du container

```powershell
# Démarrer le container
docker run -d -p 80:80 --name iot-front iot-playground-front

# Accéder à l'application
# Ouvrir http://localhost dans votre navigateur
```

### Vérification du healthcheck

```powershell
docker inspect --format='{{json .State.Health}}' iot-front
```

### Voir les logs

```powershell
docker logs -f iot-front
```

### Arrêter et supprimer

```powershell
docker stop iot-front
docker rm iot-front
```

## 📦 Configuration Nginx

Le fichier `nginx.conf` inclut :

- ✅ **Gzip compression** pour réduire la taille des fichiers
- ✅ **Cache des assets statiques** (JS, CSS, images) pendant 1 an
- ✅ **Headers de sécurité** (X-Frame-Options, X-XSS-Protection, etc.)
- ✅ **Routing Angular** (toutes les routes redirigent vers index.html)
- ✅ **Endpoint /health** pour les healthchecks
- ✅ **Utilisateur non-root** pour la sécurité

## 🔐 Sécurité

- Container exécuté avec un utilisateur non-root (`nginx-user`)
- Headers de sécurité configurés
- Scan automatique des images dans ECR (`scanOnPush=true`)
- Pas de credentials hardcodés

## 📊 Tailles d'image

- **Image de build** (~500 MB avec Node.js + dépendances)
- **Image finale** (~25-30 MB avec Nginx Alpine + build Angular)

## 🛠️ Variables d'environnement

Si vous avez besoin de configurer des variables d'environnement au runtime :

### Option 1 : Avec docker-compose

```yaml
services:
  front:
    image: <account-id>.dkr.ecr.eu-west-1.amazonaws.com/iot-playground-front:latest
    ports:
      - "80:80"
    environment:
      - API_URL=https://api.example.com
```

### Option 2 : Script d'injection au démarrage

Pour injecter des variables dans les fichiers Angular buildés, créez un script `entrypoint.sh`.

## 🔄 CI/CD avec GitHub Actions

Exemple de workflow `.github/workflows/deploy-ecr.yml` :

```yaml
name: Deploy to ECR

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: iot-playground-front
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
```

## 📝 Commandes utiles

### Lister les images dans ECR

```powershell
aws ecr describe-images --repository-name iot-playground-front --region eu-west-1
```

### Supprimer une image

```powershell
aws ecr batch-delete-image --repository-name iot-playground-front --image-ids imageTag=latest --region eu-west-1
```

### Supprimer le repository

```powershell
aws ecr delete-repository --repository-name iot-playground-front --force --region eu-west-1
```

### Voir les logs du scan de sécurité

```powershell
aws ecr describe-image-scan-findings --repository-name iot-playground-front --image-id imageTag=latest --region eu-west-1
```

## 🐛 Troubleshooting

### Erreur "no basic auth credentials"

→ Votre authentification ECR a expiré (valide 12h). Relancez :
```powershell
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com
```

### Erreur "repository does not exist"

→ Créez le repository d'abord :
```powershell
aws ecr create-repository --repository-name iot-playground-front --region eu-west-1
```

### Build très lent

→ Vérifiez votre `.dockerignore` pour exclure `node_modules` et `dist`

### Application ne démarre pas

→ Vérifiez les logs :
```powershell
docker logs <container-id>
```

## 📚 Ressources

- [Documentation AWS ECR](https://docs.aws.amazon.com/ecr/)
- [Documentation Nginx](https://nginx.org/en/docs/)
- [Best practices Docker](https://docs.docker.com/develop/dev-best-practices/)
- [Angular Production Build](https://angular.io/guide/deployment)

---

**Créé le** : 2025-01-23  
**Dernière mise à jour** : 2025-01-23

