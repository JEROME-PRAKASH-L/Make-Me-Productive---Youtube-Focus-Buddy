// ═══════════════════════════════════════════════════════════════════════════════
// Lifecycle — initialization, observers, navigation, and message handling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Navigation Detection (YouTube SPA) ─────────────────────────────────────
let lastUrl = location.href;

function checkForNavigation() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (location.pathname === '/watch') {
      currentWatchVideoId = null;
      setCurrentWatchClassification(null);
      setTimeout(() => {
        trackVideoWatchTime();
        analyzeWatchPage();
      }, 2000);
    } else {
      removeWatchPageOverlay();
      removeAnalyzingIndicator();
      currentWatchVideoId = null;
      resetWatchTracking();
    }
  }
}

// ─── Filter Initialization ──────────────────────────────────────────────────
function initFilter() {
  try {
    stats = {
      filteredCount: 0,
      educationalCount: 0,
      totalVideos: 0,
      watchTime: { educational: 0, entertainment: 0 }
    };

    filterRunning = false;
    applyFilter();
    trackVideoWatchTime();

    // If on a watch page, run deep analysis
    if (location.pathname === '/watch') {
      setTimeout(() => analyzeWatchPage(), 2000);
    }

    // Mutation observer for new content
    const mutationObserver = new MutationObserver(() => {
      if (!filterRunning) applyFilter();
      trackVideoWatchTime();
      checkForNavigation();
    });

    // Intersection observer for lazy-loaded cards
    const intersectionObserver = new IntersectionObserver((entries) => {
      const processEntries = async () => {
        for (const entry of entries) {
          if (entry.isIntersecting && !entry.target.hasAttribute('data-processed')) {
            await processVideo(entry.target);
          }
        }
      };
      processEntries().catch(e => console.log('Intersection error:', e));
    }, { root: null, rootMargin: '100px', threshold: 0.1 });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    const observeNewVideos = () => {
      const unprocessed = document.querySelectorAll(`
        ytd-rich-item-renderer:not([data-processed]),
        ytd-video-renderer:not([data-processed]),
        ytd-grid-video-renderer:not([data-processed])
      `);
      unprocessed.forEach(v => intersectionObserver.observe(v));
    };

    observeNewVideos();
    const newVideoObserver = new MutationObserver(observeNewVideos);
    newVideoObserver.observe(document.body, { childList: true, subtree: true });

    // URL change detection (YouTube SPA navigation)
    const navigationInterval = setInterval(checkForNavigation, 1000);

    return {
      disconnect: () => {
        mutationObserver.disconnect();
        intersectionObserver.disconnect();
        newVideoObserver.disconnect();
        clearInterval(navigationInterval);
        removeWatchPageOverlay();
        removeAnalyzingIndicator();
        resetWatchTracking();
      }
    };
  } catch (error) {
    console.log('Init filter error:', error);
    return null;
  }
}

// ─── All Video Card Selectors (for reset) ───────────────────────────────────
const ALL_VIDEO_SELECTORS = `ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer,
  ytd-compact-video-renderer, ytd-compact-playlist-renderer, ytd-compact-radio-renderer,
  ytd-radio-renderer, ytd-playlist-renderer,
  ytd-reel-item-renderer, ytd-shorts, ytd-in-feed-ad-layout-renderer,
  ytd-promoted-video-renderer, ytd-display-ad-renderer`;

/** Restores all video cards to their original state */
function resetAllVideoCards() {
  document.querySelectorAll('.focus-filter-overlay').forEach(o => o.remove());
  document.querySelectorAll(ALL_VIDEO_SELECTORS).forEach(item => {
    item.style.opacity = '';
    item.style.pointerEvents = '';
    item.style.position = '';
    item.style.display = '';
    item.style.maxHeight = '';
    item.style.overflow = '';
    item.style.margin = '';
    item.style.padding = '';
    item.removeAttribute('data-processed');
    item.querySelectorAll('ytd-channel-renderer img, img#img, yt-image img, ytd-thumbnail img, #thumbnail img').forEach(t => {
      t.style.display = '';
      t.style.opacity = '';
    });
  });
}

// ─── Extension Lifecycle ────────────────────────────────────────────────────
let observer = null;

// Start filter if enabled
chrome.storage.sync.get(["distractionFilterEnabled"], result => {
  if (result.distractionFilterEnabled) {
    if (observer) observer.disconnect();
    observer = initFilter();
  }
});

// React to setting changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.distractionFilterEnabled) {
    if (changes.distractionFilterEnabled.newValue) {
      if (observer) observer.disconnect();
      observer = initFilter();
    } else {
      if (observer) { observer.disconnect(); observer = null; }

      removeWatchPageOverlay();
      removeAnalyzingIndicator();
      currentWatchVideoId = null;
      resetWatchTracking();

      chrome.storage.local.set({
        videoStats: {
          filteredCount: 0, educationalCount: 0, totalVideos: 0,
          watchTime: { educational: 0, entertainment: 0 },
          educationalPercentage: 0, productivityScore: 0, lastUpdated: Date.now()
        },
        aiStats: {
          aiClassified: 0,
          blocked: 0,
          overridden: 0
        }
      });

      stats = {
        filteredCount: 0, educationalCount: 0, totalVideos: 0,
        watchTime: { educational: 0, entertainment: 0 }
      };

      resetAllVideoCards();
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'toggleFilter') {
    if (message.enabled) {
      sendResponse({ success: true });
      window.location.reload();
      return true;
    } else {
      if (observer) { observer.disconnect(); observer = null; }
      removeWatchPageOverlay();
      removeAnalyzingIndicator();
      resetWatchTracking();
      resetAllVideoCards();
      sendResponse({ success: true });
    }
  }
  return true;
});
