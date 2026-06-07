// ═══════════════════════════════════════════════════════════════════════════════
// Stats — productivity tracking & calculation
// ═══════════════════════════════════════════════════════════════════════════════

let stats = {
  filteredCount: 0,
  educationalCount: 0,
  totalVideos: 0,
  watchTime: { educational: 0, entertainment: 0 }
};

let currentWatchClassification = null;
let watchTrackerObserver = null;
let trackedVideoElement = null;
let trackedVideoHandlers = null;
let watchTimeInterval = null;
let watchSessionStartedAt = 0;
let watchSessionActive = false;

function setCurrentWatchClassification(classificationResult) {
  currentWatchClassification = classificationResult
    ? {
        isEducational: !!classificationResult.isEducational,
        method: classificationResult.method || 'unknown'
      }
    : null;
}

function resolveCurrentVideoEducationalState() {
  if (currentWatchClassification && typeof currentWatchClassification.isEducational === 'boolean') {
    return currentWatchClassification.isEducational;
  }

  const channelName = typeof getChannelName === 'function' ? getChannelName() : '';
  const videoTitle = typeof getVideoTitle === 'function' ? getVideoTitle() : '';
  return isKnownEduChannel(channelName) || isEducational(videoTitle);
}

function clearWatchInterval() {
  if (watchTimeInterval) {
    clearInterval(watchTimeInterval);
    watchTimeInterval = null;
  }
}

function recordWatchTimeChunk() {
  if (!watchSessionActive || watchSessionStartedAt === 0) return;

  const now = Date.now();
  const watchDuration = (now - watchSessionStartedAt) / 1000;
  if (watchDuration <= 0) return;

  if (resolveCurrentVideoEducationalState()) {
    stats.watchTime.educational += watchDuration;
  } else {
    stats.watchTime.entertainment += watchDuration;
  }

  watchSessionStartedAt = now;
  updateProductivityStats();
}

function stopWatchSession() {
  if (!watchSessionActive) {
    clearWatchInterval();
    return;
  }

  recordWatchTimeChunk();
  watchSessionActive = false;
  watchSessionStartedAt = 0;
  clearWatchInterval();
}

function startWatchSession() {
  if (!trackedVideoElement || watchSessionActive) return;

  watchSessionActive = true;
  watchSessionStartedAt = Date.now();
  clearWatchInterval();

  watchTimeInterval = setInterval(() => {
    if (
      !trackedVideoElement ||
      trackedVideoElement.paused ||
      trackedVideoElement.ended ||
      !document.contains(trackedVideoElement)
    ) {
      stopWatchSession();
      return;
    }

    recordWatchTimeChunk();
  }, 1000);
}

function detachTrackedVideo() {
  stopWatchSession();

  if (trackedVideoElement && trackedVideoHandlers) {
    trackedVideoElement.removeEventListener('play', trackedVideoHandlers.onPlay);
    trackedVideoElement.removeEventListener('pause', trackedVideoHandlers.onPause);
    trackedVideoElement.removeEventListener('ended', trackedVideoHandlers.onEnded);
  }

  trackedVideoElement = null;
  trackedVideoHandlers = null;
}

function resetWatchTracking() {
  setCurrentWatchClassification(null);
  detachTrackedVideo();

  if (watchTrackerObserver) {
    watchTrackerObserver.disconnect();
    watchTrackerObserver = null;
  }
}

/** Tracks educational vs entertainment watch time on the video element */
function trackVideoWatchTime() {
  try {
    const attachToVideo = () => {
      if (location.pathname !== '/watch') {
        resetWatchTracking();
        return false;
      }

      const video = document.querySelector('video');
      if (!video) return false;

      if (video === trackedVideoElement) return true;

      detachTrackedVideo();

      trackedVideoElement = video;
      trackedVideoHandlers = {
        onPlay: () => startWatchSession(),
        onPause: () => stopWatchSession(),
        onEnded: () => stopWatchSession()
      };

      video.addEventListener('play', trackedVideoHandlers.onPlay);
      video.addEventListener('pause', trackedVideoHandlers.onPause);
      video.addEventListener('ended', trackedVideoHandlers.onEnded);

      if (!video.paused && !video.ended) {
        startWatchSession();
      }

      return true;
    };

    if (attachToVideo()) return;

    if (watchTrackerObserver) {
      watchTrackerObserver.disconnect();
      watchTrackerObserver = null;
    }

    // Watch for delayed video element creation on SPA navigation.
    watchTrackerObserver = new MutationObserver(() => {
      if (attachToVideo()) {
        watchTrackerObserver.disconnect();
        watchTrackerObserver = null;
      }
    });
    watchTrackerObserver.observe(document.body, { childList: true, subtree: true });

    // Failsafe: stop observing if no video appears after some time.
    setTimeout(() => {
      if (watchTrackerObserver) {
        watchTrackerObserver.disconnect();
        watchTrackerObserver = null;
      }
    }, 30000);
  } catch (error) { /* ignore */ }
}

/** Recalculates scores and persists stats to chrome.storage */
function updateProductivityStats() {
  try {
    const totalWatchTime = stats.watchTime.educational + stats.watchTime.entertainment;
    const educationalPercentage = totalWatchTime > 0
      ? Math.round((stats.watchTime.educational / totalWatchTime) * 100) : 0;

    const watchTimeScore = totalWatchTime > 0
      ? (stats.watchTime.educational / totalWatchTime) * 60 : 0;
    const videoRatioScore = stats.totalVideos > 0
      ? (stats.educationalCount / stats.totalVideos) * 40 : 0;
    const productivityScore = Math.round(watchTimeScore + videoRatioScore);

    const scoreBreakdown = {
      watchTimeScore: Math.round(watchTimeScore),
      videoRatioScore: Math.round(videoRatioScore),
      watchTimePercent: totalWatchTime > 0 ? Math.round((stats.watchTime.educational / totalWatchTime) * 100) : 0,
      videoRatioPercent: stats.totalVideos > 0 ? Math.round((stats.educationalCount / stats.totalVideos) * 100) : 0
    };

    const fullStats = {
      ...stats,
      educationalPercentage,
      productivityScore,
      totalVideos: stats.totalVideos,
      lastUpdated: Date.now(),
      scoreBreakdown
    };

    chrome.storage.local.set({ videoStats: fullStats });

    chrome.runtime.sendMessage({
      type: 'statsUpdate',
      stats: { ...stats, educationalPercentage, productivityScore, totalVideos: stats.totalVideos, scoreBreakdown }
    }, response => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          window.location.reload();
        }
      }
    });
  } catch (error) {
    if (error.message?.includes('Extension context invalidated')) {
      window.location.reload();
    }
  }
}

/** Debounce helper */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedUpdateStats = debounce(updateProductivityStats, 300);
