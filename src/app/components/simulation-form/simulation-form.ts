import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  constructor(private fb: FormBuilder) {
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

    if (this.simulationForm.valid) {
      console.log('Simulation lancée avec les données :', this.simulationForm.value);
      // La logique de soumission sera ajoutée plus tard
    } else {
      console.log('Formulaire invalide');
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.simulationForm.controls).forEach(key => {
        this.simulationForm.get(key)?.markAsTouched();
      });
    }
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
