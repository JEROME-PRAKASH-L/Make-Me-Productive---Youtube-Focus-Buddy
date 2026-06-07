// ═══════════════════════════════════════════════════════════════════════════════
// Background Config — API keys, model settings, constants
// ═══════════════════════════════════════════════════════════════════════════════

// Do not commit real API keys. Leave blank for local keyword fallback.
const GEMINI_API_KEY = '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Rate limiting: max 1 request per 1.5 seconds
let lastApiCall = 0;
const API_COOLDOWN_MS = 1500;
