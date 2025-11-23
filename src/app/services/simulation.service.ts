import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StartRunRequest, StartRunResponse, SensorDataRequest, CanStartResponse, RunningSimulation } from '../models/simulation.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private readonly baseUrl = environment.apiUrl; // URL configurée selon l'environnement

  constructor(private http: HttpClient) {}

  /**
   * Vérifie si on peut démarrer une nouvelle simulation
   * @returns Observable contenant les informations de capacité
   */
  canStartSimulation(): Observable<CanStartResponse> {
    return this.http.get<CanStartResponse>(`${this.baseUrl}/api/runs/can-start`);
  }

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
   * Récupère la liste des simulations en cours
   * @returns Observable contenant la liste des runs actifs
   */
  getRunningSimulations(): Observable<RunningSimulation[]> {
    return this.http.get<RunningSimulation[]>(`${this.baseUrl}/api/runs/running`);
  }

  /**
   * Télécharge les rapports de simulations (fichier ZIP)
   * @returns Observable contenant le blob du fichier ZIP
   */
  downloadReports(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/api/reports/download`, {
      responseType: 'blob',
      observe: 'body'
    });
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
