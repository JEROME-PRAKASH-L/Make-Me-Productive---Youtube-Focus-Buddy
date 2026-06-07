// ═══════════════════════════════════════════════════════════════════════════════
// Browse Page — processes video cards on the YouTube home/search/browse pages
// ═══════════════════════════════════════════════════════════════════════════════

let filterRunning = false;

const CARD_TITLE_SELECTORS = [
  '#video-title',
  '#video-title-link',
  'a#video-title-link',
  'h3 a',
  'yt-formatted-string#video-title'
];

const CARD_CHANNEL_SELECTORS = [
  'ytd-channel-name #text',
  '#channel-name #text',
  '#channel-name a',
  '#byline a',
  '#byline-container #byline',
  '#text.ytd-channel-name',
  'yt-formatted-string.ytd-channel-name'
];

function getCardText(item, selectors) {
  for (const selector of selectors) {
    const text = item.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return '';
}

/** Processes a single video card element */
const processVideo = async (item) => {
  item.setAttribute('data-processed', 'true');
  stats.totalVideos++;

  const isAd = item.tagName.toLowerCase().includes('ad') ||
    (item.hasAttribute('id') && item.id.toLowerCase().includes('ad')) ||
    item.classList.contains('ytd-promoted-video-renderer') ||
    item.tagName.toLowerCase().includes('promoted');

  const isShort = item.tagName.toLowerCase().includes('reel') ||
    item.tagName.toLowerCase().includes('shorts') ||
    item.innerHTML.toLowerCase().includes('shorts');

  const textContent = item.innerText || '';
  const videoTitle = getCardText(item, CARD_TITLE_SELECTORS) || textContent.trim();
  const channelInCard = getCardText(item, CARD_CHANNEL_SELECTORS);
  const classificationText = `${videoTitle} ${channelInCard}`.trim() || textContent.trim();
  const isEduChannel = isKnownEduChannel(channelInCard);

  const isSponsored = textContent.toLowerCase().includes('sponsored') ||
    textContent.toLowerCase().includes('ad ·') ||
    !!item.querySelector('ytd-ad-slot-renderer, [id*="ad-"], .ytd-promoted-sparkles-web-renderer');

  const hasEduKeywords = isEducational(classificationText);
  const titleEntertainmentKeyword = shouldFilterOut(videoTitle);
  const supplementalEntertainmentKeyword = shouldFilterOut(classificationText) || shouldFilterOut(textContent);
  const hasEntertainmentKeywords = titleEntertainmentKeyword || supplementalEntertainmentKeyword;
  const isVideoEducational = (hasEduKeywords && !isSponsored) || isEduChannel;

  const hasStrongEdu = strongEduSignals.test(videoTitle);

  // BLOCK unless proven educational
  const shouldBlock = isAd || isSponsored || isShort ||
    (!isVideoEducational && !hasStrongEdu);

  // Only count as educational if the video is NOT being blocked
  if (!shouldBlock && (isVideoEducational || hasStrongEdu)) {
    stats.educationalCount++;
  }

  if (shouldBlock) {
    stats.filteredCount++;

    const keyword = hasEntertainmentKeywords;

    item.style.transition = 'opacity 0.3s ease';

    const overlay = document.createElement('div');
    overlay.className = 'focus-filter-overlay';
    overlay.style.cssText = blackOverlayStyle + `
      opacity: 0;
      transform: scale(0.95);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    const message = isAd || isSponsored ? "🚫 Ad blocked"
      : isShort ? "⏭️ Short skipped — think long-term"
      : keyword ? `🚫 Blocked: ${getMotivationalMessage(keyword)}`
      : "🚫 Blocked: Stay focused on learning!";

    overlay.innerHTML = `
      <div style="color:#ef4444;font-size:20px;margin-bottom:6px;">✕</div>
      <div style="color:#d1d5db;font-size:12px;font-weight:500;line-height:1.4;padding:0 8px;">${message}</div>
    `;

    item.style.position = 'relative';
    item.appendChild(overlay);

    const thumbnails = item.querySelectorAll('ytd-channel-renderer img, img#img, yt-image img, ytd-thumbnail img, #thumbnail img');
    thumbnails.forEach(thumb => {
      thumb.style.transition = 'opacity 0.3s ease';
      thumb.style.opacity = '0';
    });

    await new Promise(resolve => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.style.transform = 'scale(1)';
        item.style.opacity = '0';
        item.style.maxHeight = '0';
        item.style.overflow = 'hidden';
        item.style.margin = '0';
        item.style.padding = '0';
        item.style.pointerEvents = 'none';
        setTimeout(() => {
          item.style.display = 'none';
          resolve();
        }, 300);
      });
    });
  }

  debouncedUpdateStats();
};

/** Selectors for all YouTube video card elements */
const VIDEO_CARD_SELECTORS = `
  ytd-rich-item-renderer:not([data-processed]),
  ytd-video-renderer:not([data-processed]),
  ytd-grid-video-renderer:not([data-processed]),
  ytd-compact-video-renderer:not([data-processed]),
  ytd-compact-playlist-renderer:not([data-processed]),
  ytd-compact-radio-renderer:not([data-processed]),
  ytd-radio-renderer:not([data-processed]),
  ytd-playlist-renderer:not([data-processed]),
  ytd-reel-item-renderer:not([data-processed]),
  ytd-shorts:not([data-processed]),
  ytd-in-feed-ad-layout-renderer:not([data-processed]),
  ytd-promoted-video-renderer:not([data-processed]),
  ytd-display-ad-renderer:not([data-processed])
`;

/** Scans the page for unprocessed video cards and filters them */
function applyFilter() {
  if (filterRunning) return;
  filterRunning = true;

  requestAnimationFrame(async () => {
    try {
      const videoItems = document.querySelectorAll(VIDEO_CARD_SELECTORS);
      for (const item of Array.from(videoItems)) {
        await processVideo(item);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.log('Filter application error:', error);
    } finally {
      filterRunning = false;
    }
  });
}
