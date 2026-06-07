// ═══════════════════════════════════════════════════════════════════════════════
// Background Service Worker — Entry Point
// Loads all modules via importScripts (MV3 service worker)
// ═══════════════════════════════════════════════════════════════════════════════

importScripts(
  'config.js',
  'cache.js',
  'localClassifier.js',
  'geminiApi.js',
  'focusSession.js',
  'messageHandler.js'
);
