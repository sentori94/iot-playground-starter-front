// Modèles pour la gestion de l'infrastructure via API Gateway

export interface CreateInfraRequest {
  environment?: string;
  user?: string;
  state_bucket_name?: string;
  mode?: 'apply' | 'plan';
}

export interface DestroyInfraRequest {
  environment?: string;
  user?: string;
  state_bucket_name?: string;
  mode?: 'destroy';
}

export interface InfraResponse {
  success: boolean;
  deployment_id: string;
  status: DeploymentStatus;
  message: string;
  timestamp: string;
  mode: string;
  environment: string;
  check_status_url: string;
  github_actions_url: string;
  workflow_run_url?: string;  // Lien direct vers le job spécifique (optionnel)
}

export interface InfraErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export interface DeploymentStatusResponse {
  deployment_id: string;
  environment: string;
  status: DeploymentStatus;
  terraform_action: 'apply' | 'destroy' | 'plan';
  requested_by: string;
  state_bucket: string;
  created_at: number;
  updated_at: number;
  workflow_file: string;
  github_actions_url: string;
  workflow_run_url: string | null;  // Lien direct vers le job spécifique
  error_message: string | null;
}

export interface DeploymentNotFoundResponse {
  success: false;
  error: string;
  deployment_id: string;
}

export type DeploymentStatus =
  | 'TRIGGERING'    // En train de déclencher
  | 'TRIGGERED'     // Workflow GitHub déclenché
  | 'IN_PROGRESS'   // En cours d'exécution
  | 'SUCCESS'       // ✅ Terminé avec succès
  | 'FAILED';       // ❌ Échec

export interface InfraState {
  isCreating: boolean;
  isDestroying: boolean;
  currentDeploymentId: string | null;
  currentStatus: DeploymentStatus | null;
  lastError: string | null;
  lastUpdate: Date | null;
  githubActionsUrl: string | null;
}

