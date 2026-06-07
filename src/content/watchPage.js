// ═══════════════════════════════════════════════════════════════════════════════
// Watch Page — deep analysis of individual video pages
// ═══════════════════════════════════════════════════════════════════════════════

let currentWatchVideoId = null;
let watchPageOverlay = null;

function createKnownChannelResult(channelName) {
  return {
    isEducational: true,
    confidence: 0.98,
    reason: `Known educational channel: ${channelName}`,
    method: 'known-channel'
  };
}

/** Runs deep analysis on the current watch page (transcript + AI classification) */
async function analyzeWatchPage() {
  const videoId = getVideoIdFromUrl(window.location.href);
  if (!videoId || videoId === currentWatchVideoId) return;
  currentWatchVideoId = videoId;
  setCurrentWatchClassification(null);
  trackVideoWatchTime();

  removeWatchPageOverlay();
  removeAnalyzingIndicator();

  const initialChannelName = getChannelName();
  if (isKnownEduChannel(initialChannelName)) {
    setCurrentWatchClassification(createKnownChannelResult(initialChannelName));
    return;
  }

  // Check cache first
  try {
    const cachedResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'getCachedClassification', videoId },
        (response) => {
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(response?.result || null);
        }
      );
    });

    if (cachedResult) {
      const channelName = getChannelName();
      if (isKnownEduChannel(channelName)) {
        setCurrentWatchClassification(createKnownChannelResult(channelName));
        return;
      }

      setCurrentWatchClassification(cachedResult);
      if (!cachedResult.isEducational) {
        createBlackOverlay(cachedResult.reason, cachedResult.confidence);
      }
      return;
    }
  } catch { /* no cache, continue */ }

  // Quick pre-check: known educational channels skip analysis
  await new Promise(r => setTimeout(r, 1500));
  const channelName = getChannelName();
  if (isKnownEduChannel(channelName)) {
    setCurrentWatchClassification(createKnownChannelResult(channelName));
    return;
  }

  // Show analyzing indicator
  const indicator = createAnalyzingIndicator();

  try {
    const transcriptResult = await fetchTranscript(videoId);
    const videoTitle = getVideoTitle();

    let textForAnalysis = '';
    if (transcriptResult.success && transcriptResult.transcript) {
      textForAnalysis = transcriptResult.transcript;
    } else {
      const description = document.querySelector('#description-text')?.textContent || '';
      textForAnalysis = `${videoTitle}. ${channelName}. ${description}`;
    }

    const classResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'classifyVideo',
        videoId,
        transcript: textForAnalysis,
        videoTitle,
        channelName
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Classification failed'));
        }
      });
    });

    removeAnalyzingIndicator();

    if (isKnownEduChannel(channelName)) {
      setCurrentWatchClassification(createKnownChannelResult(channelName));
      return;
    }

    setCurrentWatchClassification(classResult);
    if (!classResult.isEducational) {
      createBlackOverlay(classResult.reason, classResult.confidence);
    }
  } catch (error) {
    console.warn('MMP: Watch page analysis error:', error);
    removeAnalyzingIndicator();
  }
}
