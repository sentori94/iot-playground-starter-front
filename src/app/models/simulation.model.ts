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

