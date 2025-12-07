import { Component, ChangeDetectorRef, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';
import { InfrastructureService } from '../../services/infrastructure.service';
import { StartRunRequest, RunningSimulation } from '../../models/simulation.model';
import { InfraState } from '../../models/infrastructure.model';

// Force recompilation
@Component({
  selector: 'app-simulation-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './simulation-form.html',
  styleUrl: './simulation-form.css',
})
export class SimulationForm implements OnInit, OnDestroy {
  openSections: { [key: number]: boolean } = {
    1: true,  // Configuration Générale toujours ouverte
    2: false,
    3: false
  };

  simulationForm: FormGroup;
  isSubmitting = false;
  isDownloadingReports = false;
  localRunningSimulations = new Set<string>(); // Track multiple local runs
  currentRunId: string | null = null;
  grafanaUrl: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  progressMap = new Map<string, { current: number; total: number; percentage: number }>(); // Progress per runId
  canStartInfo: { canStart: boolean; currentRunning: number; maxAllowed: number; available: number } = {
    canStart: true,
    currentRunning: 0,
    maxAllowed: 5,
    available: 5
  }; // Valeurs par défaut pour afficher le widget immédiatement

  // Gestion des runs en cours
  runningSimulations: RunningSimulation[] = [];
  private pollingInterval: any = null;
  private isBrowser: boolean;

  // Gestion de l'infrastructure
  infraState: InfraState = {
    isCreating: false,
    isDestroying: false,
    currentDeploymentId: null,
    currentStatus: null,
    lastError: null,
    lastUpdate: null,
    githubActionsUrl: null
  };
  private infraPollingInterval: any = null;

  constructor(
    private fb: FormBuilder,
    private simulationService: SimulationService,
    private infrastructureService: InfrastructureService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.simulationForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z0-9._-]{3,20}$/)
      ]],
      sensorsCount: [1, [
        Validators.required,
        Validators.min(1),
        Validators.max(100)
      ]],
      count: [10, [
        Validators.required,
        Validators.min(1),
        Validators.max(1000)
      ]],
      intervalMs: [200, [
        Validators.required,
        Validators.min(200),
        Validators.max(10000)
      ]]
    });
  }

  ngOnInit(): void {
    // Récupérer le dernier déploiement d'infrastructure au démarrage
    this.loadLatestInfraDeployment();

    // Démarrer un polling permanent pour vérifier l'état de l'infrastructure toutes les 5 secondes
    this.startPermanentInfraPolling();

    // Démarrer les chargements initiaux après que le cycle de détection soit terminé
    setTimeout(() => {
      this.loadRunningSimulations();
      this.loadCapacity();
      this.checkOrphanedSimulations();
    }, 0);

    // Démarrer le polling toutes les 1 seconde pour une réactivité optimale
    this.pollingInterval = setInterval(() => {
      this.loadRunningSimulations();
      this.loadCapacity();
    }, 1000);

    // Ajouter la protection contre la fermeture de page pendant une simulation (uniquement côté navigateur)
    if (this.isBrowser) {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  ngOnDestroy(): void {
    // Nettoyer le polling quand le composant est détruit
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Nettoyer le polling d'infrastructure
    if (this.infraPollingInterval) {
      clearInterval(this.infraPollingInterval);
    }

    // Retirer le listener beforeunload (uniquement côté navigateur)
    if (this.isBrowser) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  /**
   * Handler pour l'événement beforeunload - prévient l'utilisateur si une simulation est en cours
   */
  private handleBeforeUnload = (event: BeforeUnloadEvent): string | void => {
    if (this.localRunningSimulations.size > 0) {
      // Message standard pour les navigateurs modernes
      const message = `${this.localRunningSimulations.size} simulation(s) en cours. Si vous quittez cette page, elle(s) sera/seront interrompue(s) et restera/resteront en statut "RUNNING". Voulez-vous vraiment quitter ?`;

      // Pour les navigateurs modernes
      event.preventDefault();
      event.returnValue = message; // Chrome nécessite returnValue

      // Pour les anciens navigateurs
      return message;
    }
    return;
  };

  /**
   * Charge la liste des simulations en cours
   */
  private loadRunningSimulations(): void {
    this.simulationService.getRunningSimulations().subscribe({
      next: (runs) => {
        this.runningSimulations = runs;
        console.log(`📊 ${runs.length} simulation(s) en cours`, runs);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des runs en cours:', error);
      }
    });
  }

  /**
   * Charge les informations de capacité
   */
  private loadCapacity(): void {
    this.simulationService.canStartSimulation().subscribe({
      next: (response) => {
        this.canStartInfo = response;
      },
      error: (error) => {
        // En cas d'erreur (503 par exemple), récupérer quand même les infos
        if (error.status === 503 && error.error) {
          this.canStartInfo = error.error;
        } else {
          console.error('❌ Erreur lors du chargement de la capacité:', error);
        }
      }
    });
  }

  /**
   * Vérifie si l'utilisateur actuel a des simulations orphelines (RUNNING mais plus d'envoi actif)
   */
  private checkOrphanedSimulations(): void {
    const username = this.simulationForm.get('username')?.value;
    if (!username) {
      console.log('⚠️ Pas de username défini, impossible de vérifier les runs orphelins');
      return;
    }

    this.simulationService.getRunningSimulations().subscribe({
      next: (runs) => {
        const myOrphanedRuns = runs.filter(run =>
          run.username === username &&
          run.status === 'RUNNING'
        );

        if (myOrphanedRuns.length > 0) {
          console.warn(`⚠️ ${myOrphanedRuns.length} simulation(s) orpheline(s) détectée(s) pour ${username}:`, myOrphanedRuns);

          // Afficher un message d'avertissement
          this.errorMessage = `⚠️ Attention : ${myOrphanedRuns.length} simulation(s) en cours détectée(s).
            Ces simulations ont été interrompues (rafraîchissement de page).
            Utilisez le bouton "Abandonner" pour les arrêter proprement.`;
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la vérification des runs orphelins:', error);
      }
    });
  }

  /**
   * Abandonne une simulation en cours (marque comme FAILED)
   */
  abandonSimulation(runId: string): void {
    console.log(`🛑 Abandon de la simulation ${runId}`);

    const finishData = {
      status: 'FAILED',
      message: 'Simulation abandonée par l\'utilisateur (interruption)'
    };

    this.simulationService.finishRun(runId, finishData).subscribe({
      next: (response) => {
        console.log('✅ Run marqué comme abandonné:', response);
        // Recharger la liste
        this.loadRunningSimulations();
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'abandon du run:', error);
        this.errorMessage = `Erreur lors de l'abandon: ${error.message}`;
      }
    });
  }

  /**
   * Calcule le pourcentage de progression d'une simulation
   */
  calculateProgress(sim: RunningSimulation): number {
    if (sim.status !== 'RUNNING') return 100;

    const startTime = new Date(sim.startedAt).getTime();
    const now = new Date().getTime();
    const elapsedSeconds = (now - startTime) / 1000;
    const totalDuration = sim.params.duration;

    return Math.min(100, Math.round((elapsedSeconds / totalDuration) * 100));
  }

  /**
   * Calcule le temps restant pour une simulation
   */
  getRemainingTime(sim: RunningSimulation): string {
    if (sim.status !== 'RUNNING') return '0s';

    const startTime = new Date(sim.startedAt).getTime();
    const now = new Date().getTime();
    const elapsedSeconds = (now - startTime) / 1000;
    const totalDuration = sim.params.duration;
    const remainingSeconds = Math.max(0, totalDuration - elapsedSeconds);

    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)}s`;
    } else if (remainingSeconds < 3600) {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = Math.round(remainingSeconds % 60);
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Récupère la progression d'une simulation spécifique
   */
  getProgress(runId: string): { current: number; total: number; percentage: number } {
    return this.progressMap.get(runId) || { current: 0, total: 0, percentage: 0 };
  }

  /**
   * Télécharge les rapports de simulations (fichier ZIP)
   */
  downloadReports(): void {
    console.log('📥 Téléchargement des rapports...');
    this.isDownloadingReports = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Timeout de sécurité : si rien ne se passe après 30 secondes, on reset
    const timeoutId = setTimeout(() => {
      if (this.isDownloadingReports) {
        console.error('⏰ Timeout du téléchargement après 30 secondes');
        this.errorMessage = '⏰ Le téléchargement a pris trop de temps. Réessayez.';
        this.isDownloadingReports = false;
        this.cdr.detectChanges();
      }
    }, 30000);

    // Fonction pour garantir la remise à zéro
    const resetDownloadState = () => {
      this.isDownloadingReports = false;
      clearTimeout(timeoutId);
      console.log('✅ isDownloadingReports remis à false');
      this.cdr.detectChanges();
    };

    this.simulationService.downloadReports().subscribe({
      next: (blob) => {
        console.log('✅ Rapports téléchargés avec succès, taille:', blob.size, 'bytes');

        // Vérifier si le blob n'est pas vide
        if (blob.size === 0) {
          console.warn('⚠️ Le fichier téléchargé est vide');
          this.errorMessage = '⚠️ Aucun rapport disponible pour le moment.';
          resetDownloadState();
          return;
        }

        try {
          // Créer un lien temporaire pour télécharger le fichier
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `simulation-reports-${new Date().toISOString().slice(0, 10)}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Nettoyer l'URL temporaire
          setTimeout(() => window.URL.revokeObjectURL(url), 100);

          this.successMessage = '📦 Rapports téléchargés avec succès !';

          // Effacer le message après 3 secondes
          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        } catch (e) {
          console.error('❌ Erreur lors de la création du téléchargement:', e);
          this.errorMessage = '❌ Erreur lors du téléchargement du fichier.';
        } finally {
          resetDownloadState();
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du téléchargement des rapports:', error);
        console.log('Error status:', error.status);

        // Message d'erreur plus descriptif selon le type d'erreur
        let errorMsg = '❌ Erreur lors du téléchargement des rapports';

        if (error.status === 0) {
          errorMsg = '❌ Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
        } else if (error.status === 404) {
          errorMsg = '❌ Aucun rapport trouvé.';
        } else if (error.status === 500) {
          errorMsg = '❌ Erreur serveur lors de la génération des rapports.';
        } else if (error.error?.message) {
          errorMsg = `❌ ${error.error.message}`;
        } else if (error.message) {
          errorMsg = `❌ ${error.message}`;
        }

        this.errorMessage = errorMsg;

        // TOUJOURS remettre à false, même dans le cas d'un Blob
        resetDownloadState();

        // Effacer le message d'erreur après 5 secondes
        setTimeout(() => {
          if (this.errorMessage === errorMsg) {
            this.errorMessage = null;
          }
        }, 5000);
      },
      complete: () => {
        console.log('✅ Observable complete');
        // Triple sécurité finale
        setTimeout(() => {
          if (this.isDownloadingReports) {
            console.warn('⚠️ TRIPLE SECURITE: isDownloadingReports était encore true, remise à false');
            resetDownloadState();
          }
        }, 100);
      }
    });
  }

  toggleSection(section: number) {
    // La section 1 reste toujours ouverte
    if (section === 1) return;

    this.openSections[section] = !this.openSections[section];
  }

  onSubmit(event: Event) {
    event.preventDefault();

    if (this.simulationForm.invalid) {
      console.log('Formulaire invalide');
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.simulationForm.controls).forEach(key => {
        this.simulationForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Réinitialiser les messages
    this.errorMessage = null;
    this.successMessage = null;

    // Vérifier d'abord si on peut démarrer une simulation
    console.log('🔍 Vérification de la capacité de démarrage...');
    this.simulationService.canStartSimulation().subscribe({
      next: (canStartResponse) => {
        console.log('📊 Réponse can-start:', canStartResponse);

        if (!canStartResponse.canStart) {
          // Impossible de démarrer
          this.errorMessage = `❌ Impossible de lancer la simulation. ${canStartResponse.currentRunning}/${canStartResponse.maxAllowed} simulations en cours. Aucun slot disponible.`;
          console.error('❌ Capacité insuffisante:', canStartResponse);
          return;
        }

        // OK, on peut démarrer
        console.log(`✅ Capacité OK: ${canStartResponse.available} slot(s) disponible(s)`);
        this.startSimulation();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la vérification de capacité:', error);

        // Si c'est une 503, parser la réponse
        if (error.status === 503 && error.error) {
          this.errorMessage = `❌ Impossible de lancer la simulation. ${error.error.currentRunning}/${error.error.maxAllowed} simulations en cours. Aucun slot disponible.`;
        } else {
          this.errorMessage = `Erreur lors de la vérification: ${error.error?.message || error.message || 'Erreur inconnue'}`;
        }
      }
    });
  }

  /**
   * Démarre effectivement la simulation après vérification
   */
  private startSimulation(): void {
    // Récupération des valeurs du formulaire
    const formValues = this.simulationForm.value;
    const username = formValues.username;
    const sensorsCount = formValues.sensorsCount;
    const count = formValues.count;
    const intervalMs = formValues.intervalMs;

    // Génération des IDs de capteurs
    const sensorIds = this.simulationService.generateSensorIds('sensor', sensorsCount);

    // Préparation de la requête pour démarrer le Run
    const request: StartRunRequest = {
      sensorIds: sensorIds,
      duration: Math.ceil(count * intervalMs / 1000),
      interval: Math.ceil(intervalMs / 1000)
    };

    console.log('🚀 Démarrage du Run avec:', {
      username,
      sensorIds,
      request
    });

    // Réinitialiser les états
    this.grafanaUrl = null;
    this.currentRunId = null;
    this.isSubmitting = true;

    // Appel API pour démarrer le Run
    this.simulationService.startRun(username, request).subscribe({
      next: (response) => {
        console.log('✅ Run démarré avec succès:', response);
        console.log('📊 Run ID reçu:', response.runId);
        console.log('🔗 Grafana URL reçue:', response.grafanaUrl);

        this.currentRunId = response.runId;
        this.grafanaUrl = response.grafanaUrl;
        this.isSubmitting = false;

        // Ajouter ce run aux simulations locales en cours
        this.localRunningSimulations.add(response.runId);

        console.log('📊 État après mise à jour:');
        console.log('  - currentRunId:', this.currentRunId);
        console.log('  - grafanaUrl:', this.grafanaUrl);
        console.log('  - isSubmitting:', this.isSubmitting);
        console.log('  - localRunningSimulations:', Array.from(this.localRunningSimulations));

        // Recharger immédiatement la liste et la capacité pour meilleure réactivité
        this.loadRunningSimulations();
        this.loadCapacity();

        // Lancer l'envoi des données des capteurs
        this.startSendingSensorData(username, response.runId, sensorIds, count, intervalMs);
      },
      error: (error) => {
        console.error('❌ Erreur lors du démarrage du Run:', error);
        this.errorMessage = `Erreur: ${error.error?.message || error.message || 'Impossible de démarrer la simulation'}`;
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Envoie les données des capteurs de manière séquentielle
   */
  private startSendingSensorData(
    username: string,
    runId: string,
    sensorIds: string[],
    count: number,
    intervalMs: number
  ): void {
    const totalCalls = count * sensorIds.length;

    // Initialiser la progression pour ce runId spécifique
    this.progressMap.set(runId, {
      current: 0,
      total: totalCalls,
      percentage: 0
    });

    let callIndex = 0;

    const sendNextBatch = () => {
      if (callIndex >= count) {
        // Simulation terminée !
        this.onSimulationComplete(runId);
        return;
      }

      // Envoyer les données pour tous les capteurs
      const promises = sensorIds.map(sensorId => {
        const data = {
          sensorId: sensorId,
          reading: this.simulationService.generateRandomReading(),
          type: 'temperature'
        };

        console.log(`📤 Envoi des données pour ${sensorId}:`, data);
        return this.simulationService.sendSensorData(username, runId, data).toPromise();
      });

      Promise.all(promises)
        .then(() => {
          // Mettre à jour la progression pour CE runId spécifique
          const progress = this.progressMap.get(runId);
          if (progress) {
            progress.current += sensorIds.length;
            progress.percentage = Math.round((progress.current / progress.total) * 100);
            console.log(`📊 [${runId}] Progression: ${progress.current}/${progress.total} (${progress.percentage}%)`);
          }

          // Forcer la détection de changements
          this.cdr.detectChanges();

          callIndex++;
          setTimeout(sendNextBatch, intervalMs);
        })
        .catch(error => {
          console.error(`❌ Erreur lors de l'envoi des données pour ${runId}:`, error);
          this.errorMessage = `Erreur lors de l'envoi des données: ${error.message}`;
          this.localRunningSimulations.delete(runId);
          this.progressMap.delete(runId);
          this.cdr.detectChanges();
        });
    };

    // Démarrer l'envoi
    sendNextBatch();
  }

  /**
   * Appelée quand la simulation est terminée
   */
  private onSimulationComplete(runId: string): void {
    console.log(`✅ Simulation ${runId} terminée avec succès !`);

    // Retirer ce run des simulations locales en cours
    this.localRunningSimulations.delete(runId);

    this.successMessage = `🎉 Simulation ${runId} terminée avec succès !`;

    // Recharger immédiatement la liste et la capacité pour meilleure réactivité
    this.loadRunningSimulations();
    this.loadCapacity();

    // Appeler l'API pour confirmer la fin du run
    const finishData = {
      status: 'SUCCESS',
      message: 'Simulation completed successfully'
    };

    this.simulationService.finishRun(runId, finishData).subscribe({
      next: (response) => {
        console.log(`✅ Run ${runId} confirmé comme terminé:`, response);
        // Recharger encore une fois après confirmation
        this.loadRunningSimulations();
        this.loadCapacity();
      },
      error: (error) => {
        console.error(`⚠️ Erreur lors de la confirmation de fin du run ${runId}:`, error);
        // On n'affiche pas d'erreur à l'utilisateur car la simulation s'est bien passée
      }
    });

    // Réinitialiser la progression après 3 secondes
    setTimeout(() => {
      this.progressMap.delete(runId);
      this.cdr.detectChanges();
    }, 3000);
  }

  // Helpers pour afficher les erreurs
  getErrorMessage(fieldName: string): string {
    const control = this.simulationForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Ce champ est requis';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} caractères`;
    if (control.errors['pattern']) return 'Format invalide (lettres, chiffres, . _ - uniquement)';
    if (control.errors['min']) return `Valeur minimum: ${control.errors['min'].min}`;
    if (control.errors['max']) return `Valeur maximum: ${control.errors['max'].max}`;

    return '';
  }

  hasError(fieldName: string): boolean {
    const control = this.simulationForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  // ========================================
  // MÉTHODES DE GESTION DE L'INFRASTRUCTURE
  // ========================================

  /**
   * Démarre un polling permanent pour surveiller l'état de l'infrastructure
   * Appelé toutes les 5 secondes pour détecter les changements d'état même après rafraîchissement
   */
  private startPermanentInfraPolling(): void {
    // Polling permanent toutes les 5 secondes
    setInterval(() => {
      this.loadLatestInfraDeployment();
    }, 5000);

    console.log('🔄 [startPermanentInfraPolling] Polling permanent démarré (toutes les 5 secondes)');
  }

  /**
   * Charge le dernier déploiement d'infrastructure au démarrage
   */
  private loadLatestInfraDeployment(): void {
    this.infrastructureService.getLatestDeployment().subscribe({
      next: (response) => {
        if (response.success && response.deployment) {
          const deployment = response.deployment;

          // TOUJOURS mettre à jour ces champs à chaque appel
          this.infraState.currentDeploymentId = deployment.deployment_id;
          this.infraState.currentStatus = deployment.status;
          this.infraState.lastUpdate = new Date(); // Date actuelle du polling
          // Utiliser workflow_run_url (lien direct vers le job) si disponible, sinon github_actions_url
          this.infraState.githubActionsUrl = deployment.workflow_run_url || deployment.github_actions_url || null;

          // Si le déploiement est EN COURS (TRIGGERED ou IN_PROGRESS)
          if (deployment.status === 'TRIGGERING' ||
              deployment.status === 'TRIGGERED' ||
              deployment.status === 'IN_PROGRESS') {

            console.log('🔄 [Infra] En cours:', deployment.status, '- Dernière vérification:', new Date().toLocaleTimeString());

            // Déterminer si c'est une création ou destruction
            if (deployment.terraform_action === 'destroy') {
              this.infraState.isDestroying = true;
              this.infraState.isCreating = false;
            } else {
              // apply ou plan = création
              this.infraState.isCreating = true;
              this.infraState.isDestroying = false;
            }

            this.cdr.detectChanges();
          }
          // Si le déploiement est SUCCESS → Infrastructure réservée/créée
          else if (deployment.status === 'SUCCESS') {
            console.log('✅ [Infra] Infrastructure CRÉÉE (SUCCESS) - Dernière vérification:', new Date().toLocaleTimeString());

            this.infraState.isCreating = false;
            this.infraState.isDestroying = false;

            // Message de confirmation (une seule fois)
            if (!this.successMessage || !this.successMessage.includes('Infrastructure créée')) {
              this.successMessage = '✅ Infrastructure créée et réservée !';
            }

            this.cdr.detectChanges();
          }
          // Si le déploiement a FAILED
          else if (deployment.status === 'FAILED') {
            console.log('❌ [Infra] Déploiement ÉCHOUÉ - Dernière vérification:', new Date().toLocaleTimeString());

            this.infraState.lastError = deployment.error_message || 'Échec';
            this.infraState.isCreating = false;
            this.infraState.isDestroying = false;

            this.cdr.detectChanges();
          }
        } else {
          // Aucun déploiement trouvé → Réinitialiser l'état
          console.log('ℹ️ [Infra] Aucun déploiement trouvé');
          this.infraState.currentDeploymentId = null;
          this.infraState.currentStatus = null;
          this.infraState.isCreating = false;
          this.infraState.isDestroying = false;
          this.infraState.githubActionsUrl = null;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        if (error.status === 404) {
          // Table vide → Réinitialiser l'état
          console.log('ℹ️ [Infra] Table vide (404)');
          this.infraState.currentDeploymentId = null;
          this.infraState.currentStatus = null;
          this.infraState.isCreating = false;
          this.infraState.isDestroying = false;
          this.infraState.githubActionsUrl = null;
          this.cdr.detectChanges();
        } else {
          console.error('❌ [loadLatestInfraDeployment] Erreur:', error);
        }
      }
    });
  }

  /**
   * Déclenche la création de l'infrastructure
   */
  createInfrastructure(): void {
    const username = this.simulationForm.get('username')?.value || 'sentori94';

    console.log('🏗️ Démarrage de la création de l\'infrastructure (mode: apply)...');

    this.infraState.isCreating = true;
    this.infraState.lastError = null;
    this.errorMessage = null;

    const request = {
      user: username,
      environment: 'dev',
      mode: 'apply' as const  // MODE APPLY pour la production
    };

    this.infrastructureService.createInfrastructure(request).subscribe({
      next: (response) => {
        console.log('✅ Infrastructure - Création déclenchée (apply):', response);

        this.infraState.currentDeploymentId = response.deployment_id;
        this.infraState.currentStatus = response.status;
        this.infraState.lastUpdate = new Date();
        // Utiliser workflow_run_url (lien direct) si disponible, sinon github_actions_url
        this.infraState.githubActionsUrl = response.workflow_run_url || response.github_actions_url || null;

        this.successMessage = `🚀 Création de l'infrastructure déclenchée ! (ID: ${response.deployment_id})`;

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création de l\'infrastructure:', error);

        const errorMsg = error.error?.error || error.message || 'Erreur inconnue';
        this.infraState.lastError = errorMsg;
        this.infraState.isCreating = false;
        this.errorMessage = `❌ Erreur création infrastructure: ${errorMsg}`;

        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Déclenche la destruction de l'infrastructure
   */
  destroyInfrastructure(): void {
    const username = this.simulationForm.get('username')?.value || 'anonymous';

    // Confirmation avant destruction
    if (!confirm('⚠️ Êtes-vous sûr de vouloir détruire l\'infrastructure ? Cette action est irréversible.')) {
      return;
    }

    console.log('🔥 Démarrage de la destruction de l\'infrastructure...');

    this.infraState.isDestroying = true;
    this.infraState.lastError = null;
    this.errorMessage = null;

    const request = {
      user: username,
      environment: 'dev',
      mode: 'destroy' as const
    };

    this.infrastructureService.destroyInfrastructure(request).subscribe({
      next: (response) => {
        console.log('✅ Infrastructure - Destruction déclenchée:', response);

        this.infraState.currentDeploymentId = response.deployment_id;
        this.infraState.currentStatus = response.status;
        this.infraState.lastUpdate = new Date();

        this.successMessage = `🔥 Destruction de l'infrastructure déclenchée ! (ID: ${response.deployment_id})`;


        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la destruction de l\'infrastructure:', error);

        const errorMsg = error.error?.error || error.message || 'Erreur inconnue';
        this.infraState.lastError = errorMsg;
        this.infraState.isDestroying = false;
        this.errorMessage = `❌ Erreur destruction infrastructure: ${errorMsg}`;

        this.cdr.detectChanges();
      }
    });
  }


  /**
   * Retourne un libellé lisible pour le statut actuel
   */
  getInfraStatusLabel(): string {
    switch (this.infraState.currentStatus) {
      case 'TRIGGERING':
        return '⏳ Déclenchement en cours...';
      case 'TRIGGERED':
        return '🚀 Workflow GitHub déclenché';
      case 'IN_PROGRESS':
        return '⚙️ Déploiement en cours...';
      case 'SUCCESS':
        return '✅ Terminé avec succès';
      case 'FAILED':
        return '❌ Échec';
      default:
        return '';
    }
  }

  /**
   * Retourne le libellé du bouton de création/update selon l'état actuel
   */
  getCreateButtonLabel(): string {
    if (this.infraState.isCreating) {
      return 'Création en cours...';
    }

    // Si l'infrastructure est déjà créée (SUCCESS), afficher "Update"
    if (this.infraState.currentStatus === 'SUCCESS') {
      return 'Update Infrastructure';
    }

    // Sinon, afficher "Créer"
    return 'Créer l\'Infrastructure';
  }

  /**
   * Vérifie si une action d'infrastructure est en cours
   * Bloque les boutons si un déploiement est déjà en cours (quelque soit l'origine)
   */
  isInfraActionInProgress(): boolean {
    // Bloquer si :
    // - En train de créer/détruire
    // - Un déploiement est en cours (TRIGGERING, TRIGGERED, IN_PROGRESS)
    // Note: SUCCESS n'est plus bloquant pour permettre l'update
    return this.infraState.isCreating ||
           this.infraState.isDestroying ||
           this.infraState.currentStatus === 'TRIGGERING' ||
           this.infraState.currentStatus === 'TRIGGERED' ||
           this.infraState.currentStatus === 'IN_PROGRESS';
  }
}

