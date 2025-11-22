import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-simulation-form',
  imports: [FormsModule, CommonModule],
  templateUrl: './simulation-form.html',
  styleUrl: './simulation-form.css',
})
export class SimulationForm {
  openSections: { [key: number]: boolean } = {
    1: true,  // Configuration Générale toujours ouverte
    2: false,
    3: false
  };

  toggleSection(section: number) {
    // La section 1 reste toujours ouverte
    if (section === 1) return;

    this.openSections[section] = !this.openSections[section];
  }

  onSubmit(event: Event) {
    event.preventDefault();
    console.log('Simulation lancée !');
    // La logique de soumission sera ajoutée plus tard
  }
}
