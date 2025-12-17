// Déclaration globale pour window.__env
// Cette interface centralise tous les types d'environnement

declare global {
  interface Window {
    __env?: {
      API_URL?: string;
      SERVERLESS_API_URL?: string;
      INFRA_API_URL?: string;
    };
  }
}

export {};

