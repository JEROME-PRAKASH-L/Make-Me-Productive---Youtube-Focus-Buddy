// ═══════════════════════════════════════════════════════════════════════════════
// Classification Cache — in-memory + storage backed cache
// ═══════════════════════════════════════════════════════════════════════════════

let classificationCache = {};

// Load cache on startup & clean expired entries (>7 days)
chrome.storage.local.get(['classificationCache'], (result) => {
  if (result.classificationCache) {
    classificationCache = result.classificationCache;
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    let cleaned = false;
    for (const [videoId, entry] of Object.entries(classificationCache)) {
      if (now - entry.timestamp > SEVEN_DAYS) {
        delete classificationCache[videoId];
        cleaned = true;
      }
    }
    if (cleaned) {
      chrome.storage.local.set({ classificationCache });
    }
  }
});

/** Store a classification result in cache, evicting old entries if >500 */
function cacheResult(key, result) {
  classificationCache[key] = { result, timestamp: Date.now() };

  const entries = Object.entries(classificationCache);
  if (entries.length > 500) {
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    classificationCache = Object.fromEntries(entries.slice(-400));
  }
  chrome.storage.local.set({ classificationCache });
}

/** Retrieve a cached classification result */
function getCached(key) {
  return classificationCache[key] || null;
}
