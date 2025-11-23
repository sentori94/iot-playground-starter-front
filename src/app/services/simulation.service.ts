import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StartRunRequest, StartRunResponse, SensorDataRequest } from '../models/simulation.model';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private readonly baseUrl = 'http://localhost:8080'; // URL de votre backend Spring Boot

  constructor(private http: HttpClient) {}

  /**
   * Démarre un nouveau Run de simulation
   * @param username - Nom de l'utilisateur (header X-User)
   * @param request - Configuration du run (sensorIds, duration, interval)
   * @returns Observable contenant le runId et l'URL Grafana
   */
  startRun(username: string, request: StartRunRequest): Observable<StartRunResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User': username
    });

    return this.http.post<StartRunResponse>(
      `${this.baseUrl}/api/runs/start`,
      request,
      { headers }
    );
  }

  /**
   * Envoie les données d'un capteur
   * @param username - Nom de l'utilisateur (header X-User)
   * @param runId - ID du run (header X-Run-Id)
   * @param data - Données du capteur (sensorId, reading)
   * @returns Observable vide
   */
  sendSensorData(username: string, runId: string, data: SensorDataRequest): Observable<void> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User': username,
      'X-Run-Id': runId
    });

    return this.http.post<void>(
      `${this.baseUrl}/sensors/data`,
      data,
      { headers }
    );
  }

  /**
   * Confirme la fin d'un run de simulation
   * @param runId - ID du run à terminer
   * @param finishData - Données de fin (statut, message, etc.)
   * @returns Observable contenant le run mis à jour
   */
  finishRun(runId: string, finishData: { status?: string, message?: string }): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/api/runs/${runId}/finish`,
      finishData
    );
  }

  /**
   * Génère la liste des IDs de capteurs basée sur un préfixe et un nombre
   * @param prefix - Préfixe pour les IDs (ex: "sensor")
   * @param count - Nombre de capteurs
   * @returns Tableau d'IDs de capteurs
   */
  generateSensorIds(prefix: string = 'sensor', count: number): string[] {
    return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);
  }

  /**
   * Génère une valeur de lecture aléatoire pour un capteur de température
   * @param min - Valeur minimale (défaut: 15)
   * @param max - Valeur maximale (défaut: 35)
   * @returns Valeur aléatoire avec 1 décimale
   */
  generateRandomReading(min: number = 15, max: number = 35): number {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  }
}

