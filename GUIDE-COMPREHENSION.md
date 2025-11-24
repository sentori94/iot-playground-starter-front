# 📚 Guide de compréhension du projet - IoT Playground Frontend

> Guide simple pour comprendre comment fonctionne l'application Angular front-end

## 🎯 Vue d'ensemble en 1 minute

**C'est quoi ?** Une application web Angular qui permet de lancer des simulations de capteurs IoT.

**Ça fait quoi ?**
1. Tu remplis un formulaire (nombre de capteurs, fréquence, etc.)
2. Tu cliques sur "Lancer la Simulation"
3. L'app envoie des données au backend Spring Boot
4. Tu vois la progression en temps réel
5. Tu peux voir les résultats dans Grafana

**Architecture :**
```
┌─────────────────┐
│  Navigateur     │  ← Angular (ce projet)
└────────┬────────┘
         │ HTTP REST
         ↓
┌─────────────────┐
│ Backend         │  ← Spring Boot (autre projet)
│ (localhost:8080)│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Base de données │
│ + Prometheus    │
│ + Grafana       │
└─────────────────┘
```

---

## 📁 Structure du projet (les fichiers importants)

```
iot-playground-starter-front/
│
├── 📂 src/
│   ├── 📂 app/
│   │   ├── 📂 components/
│   │   │   └── simulation-form/          ⭐ LE CŒUR DE L'APP
│   │   │       ├── simulation-form.ts    → Logique (TypeScript)
│   │   │       ├── simulation-form.html  → Interface (HTML)
│   │   │       └── simulation-form.css   → Style (CSS)
│   │   │
│   │   ├── 📂 services/
│   │   │   └── simulation.service.ts     ⭐ Communication avec le backend
│   │   │
│   │   └── 📂 models/
│   │       └── simulation.model.ts       → Types TypeScript
│   │
│   ├── 📂 environments/
│   │   ├── environment.ts                → Config DEV (localhost)
│   │   └── environment.prod.ts           → Config PROD (URL dynamique)
│   │
│   └── 📂 assets/
│       └── env.js                        → Variables d'env au runtime
│
├── 📄 angular.json                       ⭐ Configuration Angular
├── 📄 package.json                       → Dépendances npm
│
├── 📂 .github/workflows/
│   └── ecr.yml                           ⭐ Déploiement automatique
│
├── 📄 Dockerfile                         ⭐ Build Docker
├── 📄 nginx.conf                         → Config serveur web
└── 📄 env.sh                             → Injection variables Docker
```

---

## 🧩 Les 3 fichiers principaux à comprendre

### 1️⃣ `simulation-form.ts` - La logique métier

**Ce qu'il fait :**
```typescript
export class SimulationForm {
  // VARIABLES
  simulationForm: FormGroup;              // Le formulaire
  runningSimulations: RunningSimulation[]; // Liste des simulations en cours
  
  // AU DÉMARRAGE
  ngOnInit() {
    // Charge la liste des simulations toutes les 1 seconde
    setInterval(() => {
      this.loadRunningSimulations();
      this.loadCapacity();
    }, 1000);
  }
  
  // QUAND TU CLIQUES SUR "LANCER"
  onSubmit() {
    // 1. Vérifie qu'il y a de la place
    // 2. Appelle startSimulation()
  }
  
  // LANCE LA SIMULATION
  startSimulation() {
    // 1. Déclare un "Run" sur le backend
    // 2. Lance startSendingSensorData()
  }
  
  // ENVOIE LES DONNÉES
  startSendingSensorData() {
    // En boucle :
    //   - Envoie les données de capteurs
    //   - Attend X millisecondes
    //   - Recommence
  }
}
```

**Les méthodes importantes :**
- `onSubmit()` → Quand tu cliques sur le bouton
- `startSimulation()` → Démarre une simulation
- `startSendingSensorData()` → Envoie les données en boucle
- `loadRunningSimulations()` → Rafraîchit la liste des simulations

---

### 2️⃣ `simulation.service.ts` - Communication API

**Ce qu'il fait :**
```typescript
export class SimulationService {
  private baseUrl = environment.apiUrl; // http://localhost:8080
  
  // Démarre un Run
  startRun(username: string, request: StartRunRequest) {
    return this.http.post(`${baseUrl}/api/runs/start`, request);
  }
  
  // Envoie les données d'un capteur
  sendSensorData(username: string, runId: string, data: SensorDataRequest) {
    return this.http.post(`${baseUrl}/sensors/data`, data);
  }
  
  // Récupère les simulations en cours
  getRunningSimulations() {
    return this.http.get(`${baseUrl}/api/runs/running`);
  }
  
  // Vérifie si on peut lancer une simulation
  canStartSimulation() {
    return this.http.get(`${baseUrl}/api/runs/can-start`);
  }
  
  // Télécharge les rapports
  downloadReports() {
    return this.http.get(`${baseUrl}/api/reports/download`);
  }
}
```

**Simple :** Ce fichier fait juste des appels HTTP vers ton backend Spring Boot !

---

### 3️⃣ `simulation-form.html` - L'interface

**Structure :**
```html
<form>
  <!-- ACCORDÉON 1 : Configuration Générale -->
  <div class="accordion-section">
    <input name="username">      <!-- Utilisateur -->
    <input name="sensorsCount">  <!-- Nombre de capteurs -->
    <input name="count">         <!-- Combien de fois envoyer -->
    <input name="intervalMs">    <!-- Fréquence -->
  </div>
  
  <!-- BOUTON -->
  <button (click)="onSubmit()">Lancer la Simulation</button>
  
  <!-- WIDGET CAPACITÉ -->
  <div class="capacity-widget">
    2/5 simulations en cours
  </div>
  
  <!-- LISTE DES SIMULATIONS -->
  <div *ngFor="let sim of runningSimulations">
    Run: {{ sim.id }}
    Progression: {{ calculateProgress(sim) }}%
  </div>
</form>
```

---

## 🔄 Flux de données complet

### Scénario : Tu lances une simulation

```
1. Tu remplis le formulaire
   └─ username: "john"
   └─ sensorsCount: 3
   └─ count: 10
   └─ intervalMs: 1000

2. Tu cliques sur "Lancer la Simulation"
   └─ onSubmit() appelé

3. Vérification de capacité
   └─ GET /api/runs/can-start
   └─ Réponse: { canStart: true, available: 4 }

4. Démarrage du Run
   └─ POST /api/runs/start
   └─ Body: { sensorIds: ["sensor-1", "sensor-2", "sensor-3"], duration: 10, interval: 1 }
   └─ Réponse: { runId: "run-20251123-143022-john", grafanaUrl: "http://..." }

5. Envoi des données en boucle (10 fois)
   Iteration 1:
     └─ POST /sensors/data { sensorId: "sensor-1", reading: 23.5 }
     └─ POST /sensors/data { sensorId: "sensor-2", reading: 24.1 }
     └─ POST /sensors/data { sensorId: "sensor-3", reading: 22.8 }
     └─ Attente 1000ms
   
   Iteration 2:
     └─ POST /sensors/data { sensorId: "sensor-1", reading: 23.7 }
     └─ POST /sensors/data { sensorId: "sensor-2", reading: 24.3 }
     └─ POST /sensors/data { sensorId: "sensor-3", reading: 23.1 }
     └─ Attente 1000ms
   
   ... (8 autres iterations)

6. Fin de la simulation
   └─ POST /api/runs/{runId}/finish
   └─ Message: "🎉 Simulation terminée avec succès !"
```

---

## 🎨 Le style CyberPunk

**Palette de couleurs :**
```css
Cyan néon:    #00ffff  (titres, bordures)
Magenta néon: #ff00ff  (accents)
Violet:       #9d00ff  (boutons)
Rouge néon:   #ff0066  (erreurs)
Vert néon:    #00ffaa  (succès)
Fond sombre:  #0a0a1e → #1a0a2e (dégradé)
```

**Effets :**
- Glow pulsant (animation)
- Bordures néon avec box-shadow
- Transitions fluides (0.3s)
- Font futuriste : Orbitron + Rajdhani

---

## 🐳 Docker & Déploiement

### Comment ça marche ?

**1. Build local (npm) :**
```bash
npm run build:prod
# Résultat : dist/iot-playground/browser/
#   ├── index.html
#   ├── main-abc123.js
#   └── styles-xyz789.css
```

**2. Build Docker (2 étapes) :**
```dockerfile
# Étape 1 : Build Angular
FROM node:24-alpine
RUN npm ci
RUN npm run build:prod

# Étape 2 : Servir avec Nginx
FROM nginx:1.25-alpine
COPY --from=build /app/dist/... /usr/share/nginx/html
```

**3. Variables d'environnement :**
```bash
# Au démarrage du container
env.sh injecte API_URL dans assets/env.js
→ window.__env.API_URL = "https://mon-backend.com"
→ Angular lit cette variable
→ Toutes les requêtes vont vers cette URL
```

**4. GitHub Actions :**
```yaml
1. npm ci + npm run build:prod
2. docker build
3. docker push vers AWS ECR
4. ✅ Image disponible dans ECR
```

---

## 🔧 Configuration selon l'environnement

### Développement local (`ng serve`)
```typescript
// environment.ts
apiUrl: 'http://localhost:8080'
```

### Production (Docker)
```typescript
// environment.prod.ts
apiUrl: window.__env.API_URL  // Lue depuis env.js
```

**Pourquoi ?**
- **Même image Docker** pour tous les environnements
- **Configuration au runtime** via variable `API_URL`
- **Pas de rebuild** pour changer l'URL

---

## 📝 Commandes utiles

### Développement
```bash
# Démarrer en local
npm start
# → http://localhost:4200

# Build de production
npm run build:prod

# Tester le build localement
docker build -t iot-front .
docker run -d -p 80:80 -e API_URL=http://localhost:8080 iot-front
```

### Git & Déploiement
```bash
# Pousser sur GitHub (déclenche le workflow)
git add .
git commit -m "feat: nouvelle feature"
git push origin master

# Le workflow GitHub Actions se déclenche automatiquement :
# 1. Build Angular
# 2. Build Docker
# 3. Push vers ECR
```

---

## 🐛 Les pièges courants

### 1. **SSR activé par erreur**
```json
// angular.json
"outputMode": "static"  // ✅ Bon
"outputMode": "server"  // ❌ Erreur ECONNREFUSED
```

### 2. **Budget CSS dépassé**
```json
// angular.json → budgets
"maximumError": "30kB"  // ✅ Assez grand pour les fonts
"maximumError": "8kB"   // ❌ Trop petit
```

### 3. **Mauvaise branche dans le workflow**
```yaml
# .github/workflows/ecr.yml
branches:
  - master  # ✅ Ton repo utilise master
  - main    # ❌ Si tu es sur master
```

### 4. **Oublier de commit angular.json**
```bash
# Toujours vérifier avant de pousser
git status
git add angular.json
git commit -m "fix: ..."
```

---

## 🎓 Pour aller plus loin (quand tu auras le temps)

### Concepts Angular à comprendre

1. **Components** → Blocs réutilisables (HTML + TS + CSS)
2. **Services** → Logique partagée (ex: appels API)
3. **Observables (RxJS)** → Gestion asynchrone (HTTP, events)
4. **Forms** → FormGroup, FormControl, validation
5. **Directives** → `*ngIf`, `*ngFor`, etc.

### Ressources recommandées

- **Angular Docs** : https://angular.dev/
- **RxJS** : https://rxjs.dev/
- **TypeScript** : https://www.typescriptlang.org/

---

## 💡 Résumé ultra-court

**Tu as une app Angular qui :**
1. 📝 Affiche un formulaire pour configurer une simulation
2. 🔄 Envoie des requêtes HTTP au backend Spring Boot
3. 📊 Affiche les simulations en cours en temps réel
4. 🐳 Se déploie automatiquement sur AWS ECR via GitHub Actions

**Les fichiers clés :**
- `simulation-form.ts` → Logique
- `simulation.service.ts` → API
- `simulation-form.html` → Interface
- `Dockerfile` → Build Docker
- `.github/workflows/ecr.yml` → Déploiement auto

**Tout fonctionne ? Oui ! 🎉**

---

## 🆘 En cas de problème

### Erreur de build ?
1. Vérifier `angular.json` → `"outputMode": "static"`
2. Vérifier les budgets CSS (30kB)
3. `npm ci` puis `npm run build:prod`

### API ne répond pas ?
1. Backend Spring Boot démarré ? (port 8080)
2. CORS configuré dans le backend ?
3. `environment.ts` a la bonne URL ?

### Docker ne build pas ?
1. `docker build -t test .` en local
2. Vérifier les logs
3. Nginx.conf correct ? (user nginx)

---

**Prends ton temps pour digérer tout ça ! Pas besoin de tout comprendre d'un coup. L'essentiel : ça marche ! 🚀**

**Questions ? Reviens quand tu veux ! 😊**

