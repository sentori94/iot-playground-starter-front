# GitHub Actions Workflows

Ce répertoire contient les workflows GitHub Actions pour l'automatisation CI/CD du projet IoT Playground Frontend.

## 📋 Workflows disponibles

### 1. `ecr.yml` - Build & Push to ECR

**Déclencheurs** :
- 🔘 Manuel (workflow_dispatch)
- 🔄 Push sur `main` ou `develop`
- 🔀 Pull Request vers `main`

**Actions** :
1. ✅ Lint et tests unitaires
2. 🐳 Build de l'image Docker
3. 🔍 Scan de sécurité avec Trivy
4. ⬆️  Push vers AWS ECR (3 tags)
5. 📊 Résumé et notification

**Variables requises** :
- `AWS_ACCOUNT_ID` - Account ID AWS
- `AWS_REGION` - Région AWS (ex: eu-west-1)
- `ECR_REPOSITORY_FRONT` - Nom du repository ECR

**Secrets requis** :
- `AWS_ACCESS_KEY_ID` - Access Key AWS
- `AWS_SECRET_ACCESS_KEY` - Secret Key AWS

## 🚀 Utilisation

### Déclenchement manuel

1. Aller dans l'onglet **Actions**
2. Sélectionner **Build & Push Frontend to ECR**
3. Cliquer sur **Run workflow**
4. Choisir la branche
5. Cliquer sur **Run workflow**

### Déclenchement automatique

```bash
# Push sur main déclenche automatiquement le workflow
git push origin main
```

## 📖 Documentation complète

Voir [GITHUB-ACTIONS-SETUP.md](../GITHUB-ACTIONS-SETUP.md) pour :
- Configuration détaillée des secrets et variables
- Création de l'utilisateur IAM AWS
- Troubleshooting
- Bonnes pratiques de sécurité

## 🏷️ Tags Docker générés

Chaque build génère 3 tags :
- `latest` - Dernier build
- `{commit-sha}` - SHA court du commit (7 caractères)
- `{timestamp}` - Date/heure du build (YYYYMMdd-HHmmss)

**Exemple** :
```
iot-playground-front:latest
iot-playground-front:a1b2c3d
iot-playground-front:20251123-143022
```

## 📊 Artifacts générés

- **test-results** - Résultats des tests et coverage
- **trivy-results** - Rapport de sécurité Trivy

## 🔐 Sécurité

- ✅ Scan automatique des vulnérabilités (Trivy)
- ✅ Upload des résultats dans GitHub Security
- ✅ Credentials AWS via secrets GitHub
- ✅ Encryption AES256 dans ECR

---

**Dernière mise à jour** : 2025-01-23

