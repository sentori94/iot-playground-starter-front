# 🔧 Configuration GitHub Actions - ECR Deployment

Ce document explique comment configurer les secrets et variables pour le workflow GitHub Actions qui déploie l'application Angular vers AWS ECR.

## 📋 Prérequis

1. Compte AWS avec droits ECR
2. Repository GitHub avec droits admin
3. AWS CLI configuré localement (pour tester)

## 🔐 Secrets à configurer

Allez dans **Settings** → **Secrets and variables** → **Actions** → **Secrets** de votre repository GitHub.

### Secrets requis

| Secret | Description | Exemple |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | Access Key ID de votre utilisateur AWS IAM | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Secret Access Key de votre utilisateur AWS IAM | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### Comment créer un utilisateur IAM pour GitHub Actions

```bash
# 1. Créer un utilisateur IAM
aws iam create-user --user-name github-actions-ecr

# 2. Créer une policy pour ECR
cat > ecr-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:CreateRepository",
        "ecr:ListImages",
        "ecr:DescribeImages"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# 3. Créer la policy
aws iam create-policy \
  --policy-name GitHubActionsECRPolicy \
  --policy-document file://ecr-policy.json

# 4. Attacher la policy à l'utilisateur
aws iam attach-user-policy \
  --user-name github-actions-ecr \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/GitHubActionsECRPolicy

# 5. Créer les access keys
aws iam create-access-key --user-name github-actions-ecr
```

**Important** : Notez immédiatement les `AccessKeyId` et `SecretAccessKey` affichés !

## ⚙️ Variables à configurer

Allez dans **Settings** → **Secrets and variables** → **Actions** → **Variables** de votre repository GitHub.

### Variables requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `AWS_ACCOUNT_ID` | Votre AWS Account ID (12 chiffres) | `123456789012` |
| `AWS_REGION` | Région AWS pour ECR | `eu-west-1` |
| `ECR_REPOSITORY_FRONT` | Nom du repository ECR pour le frontend | `iot-playground-front` |

### Comment obtenir votre AWS Account ID

```bash
# Via AWS CLI
aws sts get-caller-identity --query Account --output text
```

Ou via la console AWS : cliquez sur votre nom en haut à droite → "Account".

## 🚀 Configuration du workflow

### Déclencheurs configurés

Le workflow se déclenche dans ces cas :

1. **Manuellement** : Via le bouton "Run workflow" dans l'onglet Actions
2. **Push sur main** : Automatiquement quand vous poussez sur la branche `main`
3. **Push sur develop** : Pour tester avant de merger sur main
4. **Pull Request** : Pour valider les PR avant merge (tests seulement, pas de push ECR)

### Jobs du workflow

```
┌─────────────────────────────────────┐
│ Job 1: lint-and-test                │
│ - Setup Node.js 20                  │
│ - npm ci (install)                  │
│ - Lint avec ESLint                  │
│ - Tests unitaires                   │
│ - Upload artifacts (coverage)       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Job 2: build-and-push-ecr           │
│ - Configure AWS credentials         │
│ - Login to ECR                      │
│ - Check/Create ECR repository       │
│ - Build Docker image                │
│ - Scan avec Trivy (sécurité)        │
│ - Push vers ECR (3 tags)            │
│ - Summary                           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Job 3: deploy-notification          │
│ - Notification succès/échec         │
└─────────────────────────────────────┘
```

### Tags Docker créés

Pour chaque build, 3 tags sont créés :

1. **`latest`** - Tag par défaut (toujours le dernier build)
2. **`{SHORT_SHA}`** - 7 premiers caractères du commit (ex: `a1b2c3d`)
3. **`{TIMESTAMP}`** - Date et heure du build (ex: `20251123-143022`)

**Exemple** :
```
iot-playground-front:latest
iot-playground-front:a1b2c3d
iot-playground-front:20251123-143022
```

## 🧪 Test du workflow en local

Avant de pousser, testez localement :

```bash
# 1. Build Docker
docker build -t iot-playground-front .

# 2. Test du container
docker run -d -p 80:80 \
  -e API_URL=http://localhost:8080 \
  --name test-front \
  iot-playground-front

# 3. Vérifier
curl http://localhost

# 4. Nettoyer
docker stop test-front
docker rm test-front
```

## 📝 Exemple de configuration complète

### 1. Créer les secrets

```bash
# Dans GitHub : Settings → Secrets → Actions → New repository secret

Nom: AWS_ACCESS_KEY_ID
Valeur: AKIAIOSFODNN7EXAMPLE

Nom: AWS_SECRET_ACCESS_KEY
Valeur: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### 2. Créer les variables

```bash
# Dans GitHub : Settings → Variables → Actions → New repository variable

Nom: AWS_ACCOUNT_ID
Valeur: 123456789012

Nom: AWS_REGION
Valeur: eu-west-1

Nom: ECR_REPOSITORY_FRONT
Valeur: iot-playground-front
```

### 3. Déclencher le workflow

**Option A - Manuellement** :
1. Allez dans l'onglet **Actions**
2. Sélectionnez **Build & Push Frontend to ECR**
3. Cliquez sur **Run workflow**
4. Sélectionnez la branche (ex: `main`)
5. Cliquez sur **Run workflow**

**Option B - Automatiquement** :
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

## 📊 Monitoring du workflow

### Voir les logs

1. Allez dans l'onglet **Actions** de votre repository
2. Cliquez sur le workflow en cours ou terminé
3. Cliquez sur un job pour voir les logs détaillés

### Artifacts disponibles

Le workflow génère ces artifacts :
- **test-results** : Résultats des tests et coverage
- **trivy-results** : Scan de sécurité de l'image Docker

Pour les télécharger :
1. Ouvrir le workflow terminé
2. Section **Artifacts** en bas de page
3. Cliquer pour télécharger

## 🔒 Sécurité

### Scan de sécurité avec Trivy

Le workflow intègre **Trivy** pour scanner les vulnérabilités :
- Scan de l'image Docker
- Détection des vulnérabilités CRITICAL et HIGH
- Upload des résultats dans GitHub Security

Voir les résultats :
**Security** → **Code scanning** → **Trivy scan results**

### Bonnes pratiques

✅ **À FAIRE** :
- Utiliser des secrets GitHub (jamais hardcodés)
- Créer un utilisateur IAM dédié pour GitHub Actions
- Utiliser le principe du moindre privilège (policy ECR minimale)
- Activer le scan automatique dans ECR (`scanOnPush=true`)
- Rotation régulière des access keys

❌ **À NE PAS FAIRE** :
- Committer les credentials dans le code
- Utiliser votre compte root AWS
- Donner des droits admin à l'utilisateur GitHub Actions
- Partager les secrets entre plusieurs projets

## 🐛 Troubleshooting

### Erreur "Access Denied"

**Cause** : Credentials AWS incorrects ou permissions insuffisantes

**Solution** :
1. Vérifier que `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` sont corrects
2. Vérifier que l'utilisateur IAM a la policy ECR attachée
3. Tester localement :
   ```bash
   aws ecr describe-repositories --region eu-west-1
   ```

### Erreur "Repository does not exist"

**Cause** : Le repository ECR n'existe pas

**Solution** : Le workflow crée automatiquement le repository, mais vous pouvez le créer manuellement :
```bash
aws ecr create-repository \
  --repository-name iot-playground-front \
  --region eu-west-1 \
  --image-scanning-configuration scanOnPush=true
```

### Erreur de build Docker

**Cause** : Problème dans le Dockerfile ou les dépendances

**Solution** :
1. Tester le build localement : `docker build -t test .`
2. Vérifier les logs du workflow dans GitHub Actions
3. Vérifier que `package.json` est correct

### Tests qui échouent

**Cause** : Tests unitaires en échec

**Solution** :
1. Lancer les tests localement : `npm test`
2. Corriger les tests qui échouent
3. Ou désactiver temporairement les tests dans le workflow

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🔄 Mise à jour du workflow

Pour modifier le workflow :

1. Éditer `.github/workflows/ecr.yml`
2. Commit et push
3. Le nouveau workflow sera utilisé pour les prochains runs

**Exemple - Changer la version de Node.js** :
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'  # Changé de 20 à 22
```

---

**Créé le** : 2025-01-23  
**Dernière mise à jour** : 2025-01-23  
**Auteur** : DevOps Team

