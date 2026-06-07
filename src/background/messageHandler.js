// ═══════════════════════════════════════════════════════════════════════════════
// Message Handler — routes all chrome.runtime messages
// ═══════════════════════════════════════════════════════════════════════════════

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
        let classResult;
        try {
          classResult = await classifyWithGemini(GEMINI_API_KEY, transcript, videoTitle, channelName);
        } catch (apiError) {
          console.warn('Gemini API failed, falling back to local:', apiError.message);
          classResult = classifyLocally(transcript, videoTitle, channelName);
          classResult.reason = `AI unavailable (${apiError.message}). ${classResult.reason}`;
        }

        cacheResult(videoId, classResult);

        // Update AI stats
        chrome.storage.local.get(['aiStats'], (statsResult) => {
          const aiStats = statsResult.aiStats || { aiClassified: 0, blocked: 0, overridden: 0 };
          aiStats.aiClassified++;
          if (!classResult.isEducational) aiStats.blocked++;
          chrome.storage.local.set({ aiStats });
        });

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

        const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
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
    chrome.storage.local.get(['aiStats'], (result) => {
      const aiStats = result.aiStats || { aiClassified: 0, blocked: 0, overridden: 0 };
      aiStats.overridden++;
      chrome.storage.local.set({ aiStats });
    });
    sendResponse({ success: true });
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
