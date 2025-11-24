// Environnement de production (ECS/Docker)
// L'URL sera injectée dynamiquement au runtime via window.__env

// Déclaration du type pour window.__env
declare global {
  interface Window {
    __env?: {
      API_URL?: string;
    };
  }
}

// Fonction pour récupérer l'API URL au runtime
export function getApiUrl(): string {
  const hasWindowEnv = typeof window !== 'undefined' && window.__env;
  const apiUrl = hasWindowEnv && window.__env ? (window.__env.API_URL || 'http://localhost:8080') : 'http://localhost:8080';

  console.log('🌍 getApiUrl() appelée:');
  console.log('  - window.__env existe?', hasWindowEnv ? 'Oui' : 'Non');
  if (hasWindowEnv && window.__env) {
    console.log('  - window.__env.API_URL =', window.__env.API_URL);
  }
  console.log('  - URL finale utilisée:', apiUrl);

  return apiUrl;
}

export const environment = {
  production: true,
  get apiUrl() {
    return getApiUrl();
  }
};

