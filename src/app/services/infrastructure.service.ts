import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateInfraRequest,
  DestroyInfraRequest,
  InfraResponse,
  DeploymentStatusResponse
} from '../models/infrastructure.model';

@Injectable({
  providedIn: 'root'
})
export class InfrastructureService {

  // Getter pour récupérer l'URL de l'API Infrastructure
  private get baseUrl(): string {
    // Logs de débogage détaillés
    console.log('🔍 [InfrastructureService] Débogage baseUrl:');
    console.log('  - typeof window:', typeof window);
    console.log('  - window.__env:', typeof window !== 'undefined' ? window.__env : 'undefined');

    // Utiliser INFRA_API_URL si disponible, sinon fallback sur API_URL
    const env = typeof window !== 'undefined' ? window.__env : undefined;

    if (env) {
      console.log('  - window.__env.INFRA_API_URL:', (env as any)['INFRA_API_URL']);
      console.log('  - window.__env.API_URL:', env.API_URL);
    }

    const infraApiUrl = (env && (env as any)['INFRA_API_URL'])
      ? (env as any)['INFRA_API_URL']
      : (env && env.API_URL)
        ? env.API_URL
        : 'http://localhost:8080';

    console.log('🏗️ [InfrastructureService] URL finale:', infraApiUrl);
    return infraApiUrl;
  }

  constructor(private http: HttpClient) {
    console.log('🎯 [InfrastructureService] Service créé');
  }

  /**
   * Déclenche la création de l'infrastructure
   * @param request - Configuration de la demande de création
   * @returns Observable contenant la réponse avec deployment_id
   */
  createInfrastructure(request: CreateInfraRequest = {}): Observable<InfraResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const url = `${this.baseUrl}/infra/create`;
    console.log('🚀 POST', url, request);

    return this.http.post<InfraResponse>(url, request, { headers });
  }

  /**
   * Déclenche la destruction de l'infrastructure
   * @param request - Configuration de la demande de destruction
   * @returns Observable contenant la réponse avec deployment_id
   */
  destroyInfrastructure(request: DestroyInfraRequest = {}): Observable<InfraResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const url = `${this.baseUrl}/infra/destroy`;
    console.log('🔥 POST', url, request);

    return this.http.post<InfraResponse>(url, request, { headers });
  }

  /**
   * Vérifie le statut d'un déploiement en cours
   * @param deploymentId - UUID du déploiement
   * @returns Observable contenant le statut actuel
   */
  checkDeploymentStatus(deploymentId: string): Observable<DeploymentStatusResponse> {
    const url = `${this.baseUrl}/infra/status/${deploymentId}`;
    console.log('📊 GET', url);

    return this.http.get<DeploymentStatusResponse>(url);
  }

  /**
   * Récupère le dernier déploiement (le plus récent)
   * @returns Observable contenant le dernier déploiement
   */
  getLatestDeployment(): Observable<{ success: boolean; deployment?: DeploymentStatusResponse; message?: string }> {
    const url = `${this.baseUrl}/infra/latest-deployment`;
    console.log('🔍 [InfrastructureService] getLatestDeployment() appelé');
    console.log('🔍 [InfrastructureService] URL complète:', url);
    console.log('🔍 [InfrastructureService] Envoi de la requête GET...');

    return this.http.get<{ success: boolean; deployment?: DeploymentStatusResponse; message?: string }>(url);
  }
}

