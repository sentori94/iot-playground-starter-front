import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StartRunRequest, StartRunResponse, SensorDataRequest, CanStartResponse, RunningSimulation } from '../models/simulation.model';

@Injectable({
  providedIn: 'root'
})
export class ServerlessSimulationService {
  // URL de base pour le mode Serverless
  private get baseUrl(): string {
    // Priorité : SERVERLESS_API_URL > fallback sur URL hardcodée
    return (typeof window !== 'undefined' && window.__env && (window.__env as any).SERVERLESS_API_URL)
      ? (window.__env as any).SERVERLESS_API_URL
      : 'https://api-lambda-iot.sentori-studio.com';
  }

  constructor(private http: HttpClient) {
    console.log('🎯 [ServerlessSimulationService] Service créé');
  }

  /**
   * Vérifie si on peut démarrer une nouvelle simulation (Serverless)
   * @returns Observable contenant les informations de capacité
   */
  canStartSimulation(): Observable<CanStartResponse> {
    console.log('📞 [Serverless] Appel canStartSimulation vers:', `${this.baseUrl}/api/runs/can-start`);
    return this.http.get<CanStartResponse>(`${this.baseUrl}/api/runs/can-start`);
  }

  /**
   * Démarre un nouveau Run de simulation (Serverless)
   * @param username - Nom de l'utilisateur (header X-User)
   * @param request - Configuration du run (sensorIds, duration, interval)
   * @returns Observable contenant le runId et l'URL Grafana
   */
  startRun(username: string, request: StartRunRequest): Observable<StartRunResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User': username
    });

    console.log('🚀 [Serverless] Démarrage du run vers:', `${this.baseUrl}/api/runs/start`);
    return this.http.post<any>(
      `${this.baseUrl}/api/runs/start`,
      request,
      { headers }
    ).pipe(
      map((response: any) => {
        // Si la réponse a 'id' au lieu de 'runId', on le mappe
        if (response.id && !response.runId) {
          return {
            runId: response.id,
            grafanaUrl: response.grafanaUrl
          };
        }
        return response;
      })
    );
  }

  /**
   * Envoie les données d'un capteur (Serverless)
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
      `${this.baseUrl}/api/sensors/data`,
      data,
      { headers }
    );
  }

  /**
   * Confirme la fin d'un run de simulation (Serverless)
   * @param runId - ID du run à terminer
   * @param finishData - Données de fin (statut, message, etc.)
   * @returns Observable contenant le run mis à jour
   */
  finishRun(runId: string, finishData: { status?: string, message?: string }): Observable<any> {
    console.log('🏁 [Serverless] Fin du run:', runId);
    return this.http.post<any>(
      `${this.baseUrl}/api/runs/${runId}/finish`,
      finishData
    );
  }

  /**
   * Récupère la liste des simulations en cours (Serverless)
   * @returns Observable contenant la liste des runs actifs
   */
  getRunningSimulations(): Observable<RunningSimulation[]> {
    return this.http.get<RunningSimulation[]>(`${this.baseUrl}/api/runs/running`);
  }

  /**
   * Télécharge les rapports de simulations (fichier ZIP) (Serverless)
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

