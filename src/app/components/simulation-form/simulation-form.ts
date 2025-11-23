import { Component, ChangeDetectorRef, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';
import { StartRunRequest, RunningSimulation } from '../../models/simulation.model';

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
  isRunning = false;
  currentRunId: string | null = null;
  grafanaUrl: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  progress = { current: 0, total: 0, percentage: 0 };
  canStartInfo: { canStart: boolean; currentRunning: number; maxAllowed: number; available: number } | null = null;

  // Gestion des runs en cours
  runningSimulations: RunningSimulation[] = [];
  private pollingInterval: any = null;
  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private simulationService: SimulationService,
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
    // Charger la liste des runs en cours au démarrage
    this.loadRunningSimulations();

    // Vérifier si l'utilisateur a des simulations orphelines (RUNNING mais plus d'envoi)
    this.checkOrphanedSimulations();

    // Démarrer le polling toutes les 3 secondes
    this.pollingInterval = setInterval(() => {
      this.loadRunningSimulations();
    }, 3000);

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

    // Retirer le listener beforeunload (uniquement côté navigateur)
    if (this.isBrowser) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  /**
   * Handler pour l'événement beforeunload - prévient l'utilisateur si une simulation est en cours
   */
  private handleBeforeUnload = (event: BeforeUnloadEvent): string | void => {
    if (this.isRunning) {
      // Message standard pour les navigateurs modernes
      const message = 'Une simulation est en cours. Si vous quittez cette page, elle sera interrompue et restera en statut "RUNNING". Voulez-vous vraiment quitter ?';

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
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des runs en cours:', error);
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
          this.cdr.detectChanges();
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
        this.cdr.detectChanges();
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

    const percentage = Math.min(100, Math.round((elapsedSeconds / totalDuration) * 100));
    return percentage;
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
        this.canStartInfo = canStartResponse;

        if (!canStartResponse.canStart) {
          // Impossible de démarrer
          this.errorMessage = `❌ Impossible de lancer la simulation. ${canStartResponse.currentRunning}/${canStartResponse.maxAllowed} simulations en cours. Aucun slot disponible.`;
          console.error('❌ Capacité insuffisante:', canStartResponse);
          this.cdr.detectChanges();
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
          this.canStartInfo = error.error;
          this.errorMessage = `❌ Impossible de lancer la simulation. ${error.error.currentRunning}/${error.error.maxAllowed} simulations en cours. Aucun slot disponible.`;
        } else {
          this.errorMessage = `Erreur lors de la vérification: ${error.error?.message || error.message || 'Erreur inconnue'}`;
        }
        this.cdr.detectChanges();
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
    this.progress = { current: 0, total: 0, percentage: 0 };

    // Appel API pour démarrer le Run
    this.simulationService.startRun(username, request).subscribe({
      next: (response) => {
        console.log('✅ Run démarré avec succès:', response);
        console.log('📊 Run ID reçu:', response.runId);
        console.log('🔗 Grafana URL reçue:', response.grafanaUrl);

        this.currentRunId = response.runId;
        this.grafanaUrl = response.grafanaUrl;
        this.isSubmitting = false;
        this.isRunning = true;

        console.log('📊 État après mise à jour:');
        console.log('  - currentRunId:', this.currentRunId);
        console.log('  - grafanaUrl:', this.grafanaUrl);
        console.log('  - isSubmitting:', this.isSubmitting);
        console.log('  - isRunning:', this.isRunning);

        // Forcer la détection de changements
        this.cdr.detectChanges();
        console.log('🔄 Détection de changements forcée');

        // Lancer l'envoi des données des capteurs
        this.startSendingSensorData(username, response.runId, sensorIds, count, intervalMs);
      },
      error: (error) => {
        console.error('❌ Erreur lors du démarrage du Run:', error);
        this.errorMessage = `Erreur: ${error.error?.message || error.message || 'Impossible de démarrer la simulation'}`;
        this.isSubmitting = false;
        this.cdr.detectChanges();
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
    this.progress.total = totalCalls;
    this.progress.current = 0;
    this.progress.percentage = 0;

    let callIndex = 0;

    const sendNextBatch = () => {
      if (callIndex >= count) {
        // Simulation terminée !
        this.onSimulationComplete();
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
          this.progress.current += sensorIds.length;
          this.progress.percentage = Math.round((this.progress.current / this.progress.total) * 100);
          console.log(`📊 Progression: ${this.progress.current}/${this.progress.total} (${this.progress.percentage}%)`);

          // Forcer la détection de changements
          this.cdr.detectChanges();

          callIndex++;
          setTimeout(sendNextBatch, intervalMs);
        })
        .catch(error => {
          console.error('❌ Erreur lors de l\'envoi des données:', error);
          this.errorMessage = `Erreur lors de l'envoi des données: ${error.message}`;
          this.isRunning = false;
          this.cdr.detectChanges();
        });
    };

    // Démarrer l'envoi
    sendNextBatch();
  }

  /**
   * Appelée quand la simulation est terminée
   */
  private onSimulationComplete(): void {
    console.log('✅ Simulation terminée avec succès !');
    this.isRunning = false;
    this.successMessage = '🎉 Simulation terminée avec succès !';

    // Forcer la détection de changements
    this.cdr.detectChanges();

    // Appeler l'API pour confirmer la fin du run
    if (this.currentRunId) {
      const finishData = {
        status: 'SUCCESS',
        message: 'Simulation completed successfully'
      };

      this.simulationService.finishRun(this.currentRunId, finishData).subscribe({
        next: (response) => {
          console.log('✅ Run confirmé comme terminé:', response);
        },
        error: (error) => {
          console.error('⚠️ Erreur lors de la confirmation de fin du run:', error);
          // On n'affiche pas d'erreur à l'utilisateur car la simulation s'est bien passée
        }
      });
    }

    // Réinitialiser la progression après 3 secondes
    setTimeout(() => {
      this.progress = { current: 0, total: 0, percentage: 0 };
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
}
