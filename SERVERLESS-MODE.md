# Mode Serverless - Documentation

## 🎯 Vue d'ensemble

L'application IoT Playground supporte maintenant **deux modes de déploiement** :

1. **Full ECS** (mode classique) - Infrastructure complète avec conteneurs ECS
2. **Serverless** (nouveau) - Architecture serverless avec AWS Lambda

## 🏗️ Architecture

### Mode Full ECS
- API Backend : `https://api-iot.sentori-studio.com`
- Infrastructure : Conteneurs ECS, RDS, etc.
- Grafana : Dashboard standard

### Mode Serverless  
- API Backend : `https://api-lambda-iot.sentori-studio.com`
- Infrastructure : AWS Lambda, DynamoDB, CloudWatch
- Grafana : Dashboard Serverless avec CloudWatch

## 🔧 Configuration

### Variables d'environnement (env.js)

```javascript
window.__env.API_URL = 'https://api-iot.sentori-studio.com';              // Full ECS
window.__env.SERVERLESS_API_URL = 'https://api-lambda-iot.sentori-studio.com'; // Serverless
window.__env.INFRA_API_URL = 'https://infra-manager-iot.sentori-studio.com';   // Infrastructure Manager
```

## 📁 Nouveaux fichiers

### Services
- `src/app/services/serverless-simulation.service.ts` - Service dédié pour les appels Lambda

### Modèles
- `src/app/models/simulation.model.ts` - Ajout du type `DeploymentMode` et `DeploymentModeConfig`

### Types
- `src/app/types/window.d.ts` - Déclaration globale TypeScript pour `window.__env`

### Composants
- `src/app/components/simulation-form/` - Modifié pour supporter les deux modes

## 🎨 Interface utilisateur

### Onglets de sélection
Deux onglets permettent de basculer entre les modes :
- 🐳 **Full ECS** - Mode classique avec infrastructure complète
- ⚡ **Serverless** - Mode serverless avec Lambda

### Comportement
- Le changement de mode recharge automatiquement les simulations en cours
- Chaque mode a son propre ensemble de runs
- La capacité (5 runs max) est partagée entre les modes

## 🔄 Fonctionnement

### Endpoints Serverless
Les endpoints Lambda sont identiques aux endpoints ECS :
- `GET /api/runs/can-start` - Vérifier la capacité
- `POST /api/runs/start` - Démarrer un run
- `POST /sensors/data` - Envoyer des données de capteur
- `POST /api/runs/{runId}/finish` - Terminer un run
- `GET /api/runs/running` - Lister les runs en cours
- `GET /api/reports/download` - Télécharger les rapports

### Grafana Serverless
Format d'URL Grafana pour le mode Serverless :
```
http://grafana-grafana-serverless-dev-{id}.eu-west-3.elb.amazonaws.com/d/iot-serverless-cloudwatch/iot-serverless-sensor-monitoring-cloudwatch?orgId=1&from=now-6h&to=now&refresh=5s
```

## 🚀 Utilisation

1. **Sélectionner le mode** en cliquant sur l'onglet désiré (Full ECS ou Serverless)
2. **Configurer la simulation** (username, capteurs, durée, intervalle)
3. **Lancer la simulation** - Le système utilise automatiquement l'API appropriée
4. **Suivre la progression** - Les runs en cours sont affichés en temps réel
5. **Visualiser dans Grafana** - Cliquer sur le lien du dashboard

## ⚙️ Fonctionnalités communes

Les deux modes supportent :
- ✅ Multi-runs (jusqu'à 5 simultanés)
- ✅ Suivi en temps réel
- ✅ Progression détaillée
- ✅ Abandon de simulations
- ✅ Téléchargement de rapports
- ✅ Détection de runs orphelins

## 🔐 Infrastructure Management

**Note importante** : La gestion de l'infrastructure (création/destruction) n'est disponible que pour le mode **Full ECS**.

Le mode Serverless est considéré comme toujours prêt (infrastructure permanente).

## 🐛 Débogage

Les logs dans la console incluent maintenant le préfixe `[ecs]` ou `[serverless]` pour identifier facilement le mode actif :

```javascript
console.log(`📊 [serverless] ${runs.length} simulation(s) en cours`);
console.log(`✅ [ecs] Run démarré avec succès`);
```

## 📊 Limitations

### Mode Serverless
- Pas de gestion d'infrastructure (toujours UP)
- Grafana Dashboard distinct avec CloudWatch
- Les métriques sont stockées dans CloudWatch au lieu de Prometheus

### Mode Full ECS
- Nécessite la création manuelle de l'infrastructure
- Dépend de la disponibilité des conteneurs ECS
- Coûts d'infrastructure plus élevés

## 🔮 Évolutions futures

- [ ] Déclenchement du GitHub Action pour créer le dashboard Grafana Serverless
- [ ] Vérification automatique du statut de l'infrastructure Grafana
- [ ] Statistiques comparatives entre les deux modes
- [ ] Support du basculement automatique en cas d'indisponibilité

## 📝 Notes de développement

### Service Pattern
Le composant utilise un pattern de service dynamique :

```typescript
private getActiveSimulationService() {
  return this.deploymentMode === 'serverless' 
    ? this.serverlessSimulationService 
    : this.simulationService;
}
```

Cela permet de basculer facilement entre les deux implémentations sans dupliquer le code.

### Polling
Le polling des runs (1 seconde) fonctionne indépendamment pour chaque mode.

### State Management
L'état des simulations est géré localement dans le composant. Chaque mode maintient sa propre liste de runs.

---

**Auteur** : Sentori Studio  
**Date** : 2025-01-16  
**Version** : 1.0.0

