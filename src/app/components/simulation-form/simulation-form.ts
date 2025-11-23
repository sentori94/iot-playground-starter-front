import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';
import { StartRunRequest } from '../../models/simulation.model';

@Component({
  selector: 'app-simulation-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './simulation-form.html',
  styleUrl: './simulation-form.css',
})
export class SimulationForm {
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

  constructor(
    private fb: FormBuilder,
    private simulationService: SimulationService,
    private cdr: ChangeDetectorRef
  ) {
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

    // Réinitialiser les messages
    this.errorMessage = null;
    this.successMessage = null;
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

  // ...existing code (getErrorMessage, hasError)...

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
