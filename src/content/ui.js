// ═══════════════════════════════════════════════════════════════════════════════
// UI — DOM helpers for overlays and indicators (injected into YouTube pages)
// ═══════════════════════════════════════════════════════════════════════════════

/** Gets the current video title from the watch page */
function getVideoTitle() {
  return document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent
    || document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent
    || document.querySelector('#title h1')?.textContent
    || document.title.replace(' - YouTube', '')
    || '';
}

/** Gets the current channel name from the watch page */
function getChannelName() {
  return document.querySelector('ytd-channel-name yt-formatted-string a')?.textContent
    || document.querySelector('#channel-name a')?.textContent
    || document.querySelector('#owner-name a')?.textContent
    || '';
}

/** Injects animation keyframes if not already present */
function ensureStyles() {
  if (!document.getElementById('mmp-styles')) {
    const style = document.createElement('style');
    style.id = 'mmp-styles';
    style.textContent = `
      @keyframes mmpSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      @keyframes mmpSlideIn { 0%{transform:translateX(100px);opacity:0} 100%{transform:translateX(0);opacity:1} }
      @keyframes mmpFadeIn { 0%{opacity:0} 100%{opacity:1} }
    `;
    document.head.appendChild(style);
  }
}

/** Creates the "Analyzing video content..." indicator */
function createAnalyzingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'mmp-analyzing-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 70px; right: 20px;
    background: rgba(13, 115, 119, 0.95);
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px; font-weight: 500;
    z-index: 99999;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: mmpSlideIn 0.3s ease;
  `;
  indicator.innerHTML = `
    <div style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top:2px solid white;border-radius:50%;animation:mmpSpin 0.8s linear infinite"></div>
    <span>Analyzing video content...</span>
  `;

  ensureStyles();
  document.body.appendChild(indicator);
  return indicator;
}

/** Removes the analyzing indicator */
function removeAnalyzingIndicator() {
  const ind = document.getElementById('mmp-analyzing-indicator');
  if (ind) ind.remove();
}

/** Creates the full-screen blocking overlay for non-educational content */
function createBlackOverlay(reason, confidence) {
  removeWatchPageOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'mmp-watch-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.93);
    z-index: 99998;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    animation: mmpFadeIn 0.4s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `;

  const confidencePct = Math.round((confidence || 0.5) * 100);

  overlay.innerHTML = `
    <div style="text-align:center;max-width:480px;padding:2rem;">
      <div style="width:80px;height:80px;margin:0 auto 1.5rem;background:rgba(239,68,68,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h2 style="color:white;font-size:1.5rem;font-weight:700;margin:0 0 0.75rem;">Non-Educational Content Detected</h2>
      <p style="color:#9ca3af;font-size:0.95rem;margin:0 0 0.5rem;line-height:1.5;">
        <span id="mmp-block-reason"></span>
      </p>
      <p style="color:#6b7280;font-size:0.8rem;margin:0 0 2rem;">
        Confidence: <span id="mmp-block-confidence"></span>
      </p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="mmp-go-back" style="
          background: linear-gradient(135deg, #0d7377, #10908f);
          color: white; border: none;
          padding: 12px 28px; border-radius: 10px;
          font-size: 0.95rem; font-weight: 600; cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(13,115,119,0.3);
        ">← Go Back</button>
        <button id="mmp-watch-anyway" style="
          background: transparent;
          color: #9ca3af;
          border: 1px solid #374151;
          padding: 12px 28px; border-radius: 10px;
          font-size: 0.95rem; font-weight: 500; cursor: pointer;
          transition: all 0.2s;
        ">Watch Anyway</button>
      </div>
    </div>
  `;

  overlay.querySelector('#mmp-block-reason').textContent =
    reason || 'This video was classified as non-educational content.';
  overlay.querySelector('#mmp-block-confidence').textContent = `${confidencePct}%`;

  document.body.appendChild(overlay);
  watchPageOverlay = overlay;

  // Pause the video
  const video = document.querySelector('video');
  if (video) video.pause();

  // Button handlers
  overlay.querySelector('#mmp-go-back').addEventListener('click', () => {
    window.history.back();
  });

  overlay.querySelector('#mmp-watch-anyway').addEventListener('click', () => {
    removeWatchPageOverlay();
    chrome.runtime.sendMessage({ type: 'recordOverride' });
    const vid = document.querySelector('video');
    if (vid) vid.play();
  });

  // Hover effects
  const goBackBtn = overlay.querySelector('#mmp-go-back');
  goBackBtn.addEventListener('mouseenter', () => { goBackBtn.style.transform = 'scale(1.05)'; });
  goBackBtn.addEventListener('mouseleave', () => { goBackBtn.style.transform = 'scale(1)'; });

  const watchBtn = overlay.querySelector('#mmp-watch-anyway');
  watchBtn.addEventListener('mouseenter', () => { watchBtn.style.borderColor = '#6b7280'; watchBtn.style.color = '#d1d5db'; });
  watchBtn.addEventListener('mouseleave', () => { watchBtn.style.borderColor = '#374151'; watchBtn.style.color = '#9ca3af'; });
}

/** Removes the watch-page overlay */
function removeWatchPageOverlay() {
  if (watchPageOverlay) {
    watchPageOverlay.remove();
    watchPageOverlay = null;
  }
  const existing = document.getElementById('mmp-watch-overlay');
  if (existing) existing.remove();
}

// ─── Browse-page overlay style ──────────────────────────────────────────────
const blackOverlayStyle = `
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.92);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 12px;
  font-size: 13px; font-weight: 600;
  color: #ef4444;
  border-radius: 12px;
  z-index: 9999;
`;
