// ═══════════════════════════════════════════════════════════════════════════════
// Message Handler — routes all chrome.runtime messages
// ═══════════════════════════════════════════════════════════════════════════════

let aiStatsUpdateQueue = Promise.resolve();

function getGeminiApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([GEMINI_API_KEY_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve((result[GEMINI_API_KEY_STORAGE_KEY] || '').trim());
    });
  });
}

function updateAiStats(mutator) {
  const runUpdate = () => new Promise((resolve, reject) => {
    chrome.storage.local.get(['aiStats'], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const current = result.aiStats || { aiClassified: 0, blocked: 0, overridden: 0 };
      const next = mutator({ ...current });

      chrome.storage.local.set({ aiStats: next }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(next);
      });
    });
  });

  const pending = aiStatsUpdateQueue.then(runUpdate, runUpdate);
  aiStatsUpdateQueue = pending.catch((error) => {
    console.warn('MMP: Failed to update AI stats:', error);
  });
  return pending;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ─── Full video classification (transcript + AI) ──────────────────────────
  if (message.type === 'classifyVideo') {
    const { videoId, transcript, videoTitle, channelName } = message;

    // Check cache first
    const cached = getCached(videoId);
    if (cached) {
      sendResponse({ success: true, result: cached.result, cached: true });
      return true;
    }

    (async () => {
      try {
        const apiKey = await getGeminiApiKey();
        let classResult;
        let classifiedByAi = false;

        if (!apiKey) {
          classResult = classifyLocally(transcript, videoTitle, channelName);
          classResult.reason = `Gemini API key not configured. ${classResult.reason}`;
        } else {
          try {
            classResult = await classifyWithGemini(apiKey, transcript, videoTitle, channelName);
            classifiedByAi = true;
          } catch (apiError) {
            console.warn('Gemini API failed, falling back to local:', apiError.message);
            classResult = classifyLocally(transcript, videoTitle, channelName);
            classResult.reason = `AI unavailable (${apiError.message}). ${classResult.reason}`;
          }
        }

        cacheResult(videoId, classResult);

        if (classifiedByAi) {
          await updateAiStats((aiStats) => {
            aiStats.aiClassified++;
            if (!classResult.isEducational) aiStats.blocked++;
            return aiStats;
          }).catch((error) => {
            console.warn('MMP: Classification succeeded but stats update failed:', error);
          });
        }

        sendResponse({ success: true, result: classResult, cached: false });
      } catch (error) {
        console.error('Classification error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }

  // ─── Quick title-only classification (browse page cards) ──────────────────
  if (message.type === 'quickClassifyTitle') {
    const { videoTitle, channelName } = message;
    const cacheKey = `title_${btoa(encodeURIComponent(videoTitle)).substring(0, 30)}`;

    const cached = getCached(cacheKey);
    if (cached) {
      sendResponse({ success: true, result: cached.result, cached: true });
      return true;
    }

    (async () => {
      try {
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
          const localResult = classifyLocally('', videoTitle, channelName);
          localResult.reason = `Gemini API key not configured. ${localResult.reason}`;
          cacheResult(cacheKey, localResult);
          sendResponse({ success: true, result: localResult, cached: false });
          return;
        }

        const now = Date.now();
        const timeSinceLast = now - lastApiCall;
        if (timeSinceLast < API_COOLDOWN_MS) {
          await new Promise(resolve => setTimeout(resolve, API_COOLDOWN_MS - timeSinceLast));
        }
        lastApiCall = Date.now();

        const quickPrompt = `Classify this YouTube video as EDUCATIONAL or NOT_EDUCATIONAL based on its title and channel. Be STRICT — only truly educational/learning content should pass.

EDUCATIONAL: tutorials, courses, lectures, coding, science, math, engineering, academic content, technical talks.
NOT_EDUCATIONAL: music, entertainment, news, vlogs, comedy, sports, gaming, movies, lifestyle, fashion, beauty, food, reactions, pranks, challenges, shorts.

Title: "${videoTitle}"
Channel: "${channelName}"

Respond ONLY with valid JSON: {"classification": "EDUCATIONAL" or "NOT_EDUCATIONAL", "confidence": 0.0-1.0, "reason": "brief reason"}`;

        const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: quickPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 80 }
          })
        });

        if (!response.ok) {
          const localResult = classifyLocally('', videoTitle, channelName);
          sendResponse({ success: true, result: localResult, cached: false });
          return;
        }

        const data = await response.json();
        let textResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let cleanJson = textResp.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
        }

        let result;
        try {
          const parsed = JSON.parse(cleanJson);
          result = {
            isEducational: parsed.classification === 'EDUCATIONAL',
            confidence: parsed.confidence || 0.5,
            reason: parsed.reason || 'AI quick classification',
            method: 'gemini-quick'
          };
        } catch {
          const isEdu = textResp.toUpperCase().includes('EDUCATIONAL') &&
                        !textResp.toUpperCase().includes('NOT_EDUCATIONAL');
          result = { isEducational: isEdu, confidence: 0.4, reason: 'Quick AI fallback', method: 'gemini-quick-fallback' };
        }

        cacheResult(cacheKey, result);
        sendResponse({ success: true, result, cached: false });
      } catch (error) {
        const localResult = classifyLocally('', videoTitle, channelName);
        sendResponse({ success: true, result: localResult, cached: false });
      }
    })();

    return true;
  }

  // ─── Record user override ────────────────────────────────────────────────
  if (message.type === 'recordOverride') {
    (async () => {
      try {
        await updateAiStats((aiStats) => {
          aiStats.overridden++;
          return aiStats;
        });
        sendResponse({ success: true });
      } catch (error) {
        console.error('MMP: Failed to record override:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // ─── Get cached classification ───────────────────────────────────────────
  if (message.type === 'getCachedClassification') {
    const cached = getCached(message.videoId);
    sendResponse({ success: true, result: cached?.result || null, cached: !!cached });
    return true;
  }
});

// ─── Keep stats safe when popup closes ──────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onDisconnect.addListener(() => {
      // Popup closed — stats are already in chrome.storage.local
    });
  }
});
