// ═══════════════════════════════════════════════════════════════════════════════
// Background Config — API keys, model settings, constants
// ═══════════════════════════════════════════════════════════════════════════════

// API keys are read from chrome.storage.local at runtime and never committed.
const GEMINI_API_KEY_STORAGE_KEY = 'geminiApiKey';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Rate limiting: max 1 request per 1.5 seconds
let lastApiCall = 0;
const API_COOLDOWN_MS = 1500;
