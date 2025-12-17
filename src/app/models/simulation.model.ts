export interface StartRunRequest {
  sensorIds: string[];
  duration: number;
  interval: number;
}

export interface StartRunResponse {
  runId: string;
  grafanaUrl: string;
}

export interface SensorDataRequest {
  sensorId: string;
  reading: number;
  type?: string; // Par défaut: "temperature"
}

export interface SimulationConfig {
  username: string;
  sensorsCount: number;
  count: number;
  intervalMs: number;
}

export interface SimulationProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface CanStartResponse {
  canStart: boolean;
  currentRunning: number;
  maxAllowed: number;
  available: number;
}

export interface RunningSimulation {
  id: string;
  username: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  params: {
    runId: string;
    sensorIds: string[];
    duration: number;
    interval: number;
  };
  grafanaUrl: string;
  errorMessage: string | null;
}

// Types pour le mode de déploiement
export type DeploymentMode = 'ecs' | 'serverless';

export interface DeploymentModeConfig {
  mode: DeploymentMode;
  label: string;
  apiUrl: string;
  grafanaUrlTemplate?: string;
}

