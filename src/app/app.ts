import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SimulationForm } from './components/simulation-form/simulation-form';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SimulationForm],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('iot-playground');
}
