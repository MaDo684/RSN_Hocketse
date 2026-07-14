'use strict';

window.APP_CONFIG = {
  schoolName: 'Realschule Neuffen',
  logoUrls: [
    'https://realschule-neuffen.de/favicon.ico',
    'https://realschule-neuffen.de/apple-touch-icon.png',
    'https://realschule-neuffen.de/wp-content/uploads/logo.png'
  ],
  // SHA-256 Hash von FV_RSN2025. Kein Klartext-Passwort im Code ablegen.
  adminPasswordHash: '2217ab5ce2d6f562246d7b1e951783c651682f25878e177ff0280f6f7c788bad'
};

window.SUPABASE_CONFIG = {
  enabled: true,
  url: 'https://dfwsnylpqnqbagrgvgvj.supabase.co',
  publishableKey: 'sb_publishable_XtnMpx7T6Zg8koEGkZ4U3A_nUm-344Y',
  table: 'products',
  pollIntervalSeconds: 20
};
