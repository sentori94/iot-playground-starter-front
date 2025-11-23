# 🚀 IoT Playground - Frontend Angular

> Interface web moderne et réactive pour la simulation et le monitoring de capteurs IoT en temps réel

[![Angular](https://img.shields.io/badge/Angular-21.0-red?logo=angular)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-ECS%20Ready-orange?logo=amazon-aws)](https://aws.amazon.com/ecs/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📋 Description

Application Angular front-end pour **IoT Playground**, une plateforme de simulation et de monitoring de capteurs IoT. Cette interface permet de :

- 🎮 **Lancer des simulations** de capteurs IoT avec configuration personnalisée
- 📊 **Monitorer en temps réel** via l'intégration Grafana
- 🔄 **Gérer plusieurs simulations** simultanées (multi-utilisateurs)
- 📦 **Télécharger les rapports** de simulation au format ZIP
- ⚡ **Visualiser la capacité** du système en temps réel
- 🛡️ **Protéger les données** avec confirmation avant fermeture de page

## ✨ Fonctionnalités principales

### 🎯 Gestion des simulations

- **Configuration intuitive** : Nombre de capteurs, fréquence d'envoi, durée
- **Multi-simulations** : Lancez plusieurs simulations en parallèle
- **Progression en temps réel** : Barre de progression pour chaque simulation
- **Validation de formulaire** : Vérification des paramètres avant lancement
- **Protection beforeunload** : Alerte avant de quitter avec simulations en cours

### 📈 Monitoring et visualisation

- **Widget de capacité** : Affichage temps réel des slots disponibles (X/5 simulations)
- **Liste des simulations actives** : Vue globale des runs en cours (tous utilisateurs)
- **Intégration Grafana** : Lien direct vers le dashboard de métriques
- **Polling intelligent** : Mise à jour automatique toutes les secondes

### 🎨 Interface utilisateur

- **Design CyberPunk** : Interface moderne avec animations néon (cyan/magenta)
- **Responsive** : Adapté à tous les écrans (desktop, tablette, mobile)
- **Accordéon interactif** : Organisation claire des paramètres
- **Alertes contextuelles** : Messages d'erreur/succès clairs et temporisés
- **Animations fluides** : Transitions et effets visuels professionnels

### 🛠️ Fonctionnalités techniques

- **Gestion d'état avancée** : Map et Set pour éviter les conflits
- **Détection automatique** : Simulations orphelines après rafraîchissement
- **Bouton Abandonner** : Arrêt propre des simulations en cours
- **Téléchargement de rapports** : Export ZIP des résultats de simulation
- **Configuration dynamique** : URL de l'API configurable par environnement

## 🏗️ Architecture technique

### Stack technologique

```
Frontend:
├── Angular 21.0 (Standalone Components)
├── TypeScript 5.0
├── RxJS (Reactive programming)
└── HttpClient (API calls)

Backend Communication:
├── REST API (Spring Boot)
├── Polling (1 seconde)
└── HTTP Observables

Déploiement:
├── Docker (Multi-stage build)
├── Nginx (Serveur web)
└── AWS ECR/ECS Ready
```

### Architecture des composants

```
src/
├── app/
│   ├── components/
│   │   └── simulation-form/          # Composant principal
│   │       ├── simulation-form.ts    # Logique métier
│   │       ├── simulation-form.html  # Template
│   │       └── simulation-form.css   # Styles CyberPunk
│   ├── services/
│   │   └── simulation.service.ts     # Communication API
│   ├── models/
│   │   └── simulation.model.ts       # Interfaces TypeScript
│   └── app.component.ts              # App root
├── environments/
│   ├── environment.ts                # Config dev
│   └── environment.prod.ts           # Config prod
└── assets/
    └── env.js                        # Variables runtime
```

## 🚀 Installation et démarrage

### Prérequis

- Node.js 20+ et npm
- Angular CLI 21.0
- Backend Spring Boot en cours d'exécution (port 8080)

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd iot-playground-starter-front

# Installer les dépendances
npm install

# Démarrer le serveur de développement
ng serve
```

L'application sera accessible sur `http://localhost:4200`

### Configuration de l'API

Par défaut, l'application pointe vers `http://localhost:8080`. Pour changer l'URL :

**En développement** : Modifier `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'  // Votre URL
};
```

**En production (Docker)** : Utiliser la variable d'environnement `API_URL`

```bash
docker run -d -p 80:80 \
  -e API_URL=https://api.example.com \
  iot-playground-front
```

📖 **Voir [CONFIGURATION-API-URL.md](CONFIGURATION-API-URL.md) pour plus de détails**

## 🐳 Déploiement Docker

### Build local

```bash
# Build de l'image
docker build -t iot-playground-front .

# Run du container
docker run -d -p 80:80 \
  -e API_URL=http://localhost:8080 \
  --name iot-front \
  iot-playground-front

# Accéder à l'application
open http://localhost
```

### Déploiement sur AWS ECR

```bash
# Utiliser le script automatisé
.\build-and-push-ecr.ps1 -Region "eu-west-1" -RepositoryName "iot-playground-front" -Tag "latest"
```

📖 **Voir [DOCKER-ECR-DEPLOYMENT.md](DOCKER-ECR-DEPLOYMENT.md) pour le guide complet**

### Docker Compose (avec backend)

```bash
docker-compose up -d
```

Cela démarre :
- Frontend sur `http://localhost:80`
- Backend sur `http://localhost:8080`

## 📡 API Endpoints utilisés

L'application communique avec les endpoints suivants du backend :

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/runs/can-start` | GET | Vérifier la capacité disponible |
| `/api/runs/start` | POST | Démarrer une nouvelle simulation |
| `/api/runs/running` | GET | Récupérer les simulations en cours |
| `/api/runs/{runId}/finish` | POST | Terminer une simulation |
| `/sensors/data` | POST | Envoyer les données de capteur |
| `/api/reports/download` | GET | Télécharger les rapports (ZIP) |

## 🎨 Design et UX

### Palette de couleurs CyberPunk

```css
Primary:   #00ffff (Cyan néon)
Secondary: #ff00ff (Magenta néon)
Accent:    #9d00ff (Violet)
Success:   #00ffaa (Vert néon)
Error:     #ff0066 (Rouge néon)
Warning:   #ffa500 (Orange)
Background: #0a0a1e → #1a0a2e (Dégradé sombre)
```

### Typographie

- **Titres** : Orbitron (Google Fonts) - Style futuriste
- **Corps** : Rajdhani (Google Fonts) - Lisible et moderne

### Animations

- Glow pulsant sur les titres et icônes
- Transitions fluides (0.3s ease)
- Barre de progression animée avec effet "shine"
- Effets hover avec scale et translation
- Animation slide-in au chargement

## 📊 Performances

- **Image Docker finale** : ~25-30 MB (Nginx Alpine)
- **Temps de build** : ~2-3 minutes
- **Temps de chargement** : <1 seconde (assets gzippés)
- **Polling** : 1 requête/seconde (2 endpoints)
- **Gzip compression** : Activée pour tous les assets
- **Cache des assets** : 1 an pour JS/CSS/images

## 🔒 Sécurité

- ✅ **Utilisateur non-root** dans le container Docker
- ✅ **Headers de sécurité** (X-Frame-Options, X-XSS-Protection, etc.)
- ✅ **Scan automatique des images** dans ECR
- ✅ **Validation des formulaires** côté client
- ✅ **Pas de credentials hardcodés**
- ✅ **Variables d'environnement** pour la configuration sensible

## 🧪 Tests

### Tests unitaires

```bash
ng test
```

### Tests e2e

```bash
ng e2e
```

### Build de production

```bash
ng build --configuration production
```

## 📝 Scripts disponibles

| Script | Description |
|--------|-------------|
| `ng serve` | Démarrer le serveur de développement |
| `ng build` | Build de production |
| `ng test` | Lancer les tests unitaires |
| `docker build -t iot-front .` | Build de l'image Docker |
| `.\build-and-push-ecr.ps1` | Deploy vers AWS ECR |

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📚 Documentation

- [Configuration API URL](CONFIGURATION-API-URL.md) - Guide de configuration selon l'environnement
- [Déploiement Docker/ECR](DOCKER-ECR-DEPLOYMENT.md) - Guide complet de déploiement
- [Angular Documentation](https://angular.dev/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🐛 Troubleshooting

### Erreur CORS

Si vous rencontrez des erreurs CORS :
1. Vérifier que l'URL de l'API est correcte dans `environment.ts`
2. Configurer CORS dans le backend Spring Boot
3. Vérifier le protocole (http vs https)

### Bouton bloqué sur "Téléchargement en cours"

Le bouton possède plusieurs protections contre le blocage :
- Timeout de 30 secondes
- Reset automatique dans le callback `error`
- Callback `complete` avec vérification finale

### Simulations qui restent en "RUNNING"

Utiliser le bouton "🛑 Abandonner" pour nettoyer les simulations orphelines.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

Développé avec ❤️ pour la gestion et le monitoring de capteurs IoT

---

**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2025  
**Angular** : 21.0.0  
**Node.js** : 20+

