// Environnement de production (ECS/Docker)
// L'URL sera injectée dynamiquement au runtime via window.__env
export const environment = {
  production: true,
  apiUrl: (window as any).__env?.API_URL || 'http://localhost:8080'
};

