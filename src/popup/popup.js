document.addEventListener('DOMContentLoaded', () => {
  const loaderContainer = document.getElementById('loaderContainer');
  const loaderMessage = loaderContainer.querySelector('.loader-message');

  const toggle = document.getElementById('toggleFilter');
  const filteredCount = document.getElementById('filteredCount');
  const educationalCount = document.getElementById('educationalCount');
  const productivityScore = document.getElementById('productivityScore');
  const totalVideos = document.getElementById('totalVideos');
  const educationalTime = document.getElementById('educationalTime');
  const educationalProgress = document.getElementById('educationalProgress');
  const educationalPercentage = document.getElementById('educationalPercentage');

  const goalSlider = document.getElementById('goalSlider');
  const goalValue = document.getElementById('goalValue');
  const goalProgressText = document.getElementById('goalProgressText');
  const scoreRing = document.getElementById('scoreRing');
  const aiClassified = document.getElementById('aiClassified');
  const aiBlocked = document.getElementById('aiBlocked');
  const aiOverridden = document.getElementById('aiOverridden');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const saveGeminiApiKey = document.getElementById('saveGeminiApiKey');
  const geminiApiKeyStatus = document.getElementById('geminiApiKeyStatus');

  const focusSessionCard = document.getElementById('focusSessionCard');
  const focusSessionStatus = document.getElementById('focusSessionStatus');
  const focusSessionTimer = document.getElementById('focusSessionTimer');
  const focusSessionMeta = document.getElementById('focusSessionMeta');
  const focusSessionSelection = document.getElementById('focusSessionSelection');
  const focusSessionCustom = document.getElementById('focusSessionCustom');
  const focusSessionCustomSlider = document.getElementById('focusSessionCustomSlider');
  const focusSessionCustomValue = document.getElementById('focusSessionCustomValue');
  const focusSessionStart = document.getElementById('focusSessionStart');
  const focusSessionCancel = document.getElementById('focusSessionCancel');
  const focusSessionClear = document.getElementById('focusSessionClear');
  const focusSessionPresetButtons = Array.from(document.querySelectorAll('.focus-session-preset'));

  const scoreCircumference = 2 * Math.PI * 60;
  const defaultVideoStats = {
    filteredCount: 0,
    educationalCount: 0,
    totalVideos: 0,
    watchTime: { educational: 0, entertainment: 0 },
    educationalPercentage: 0,
    productivityScore: 0
  };
  const defaultAiStats = { aiClassified: 0, blocked: 0, overridden: 0 };
  const loaderMessages = [
    'Loading your productivity insights...',
    'Preparing to boost your focus...',
    'Getting your learning stats ready...',
    'Making YouTube work better for you...',
    'Calculating your educational progress...'
  ];

  const state = {
    focusSession: null,
    focusSelectionMode: 'preset',
    presetDuration: 25,
    customDuration: 25,
    focusSessionBusy: false,
    focusSessionIntervalId: null
  };

  loaderMessage.textContent = loaderMessages[Math.floor(Math.random() * loaderMessages.length)];

  function localGet(keys) {
    return new Promise(resolve => chrome.storage.local.get(keys, resolve));
  }

  function localSet(value) {
    return new Promise(resolve => chrome.storage.local.set(value, resolve));
  }

  function syncGet(keys) {
    return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
  }

  function syncSet(value) {
    return new Promise(resolve => chrome.storage.sync.set(value, resolve));
  }

  function runtimeSendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function queryYouTubeTabs() {
    return new Promise(resolve => chrome.tabs.query({ url: '*://*.youtube.com/*' }, resolve));
  }

  function reloadTab(tabId) {
    return new Promise(resolve => chrome.tabs.reload(tabId, resolve));
  }

  function sendTabMessage(tabId, message) {
    return new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, message, () => {
        resolve();
      });
    });
  }

  function showLoader(message) {
    loaderMessage.textContent = message;
    loaderContainer.style.opacity = '1';
    loaderContainer.style.display = 'flex';
  }

  function hideLoader(delay = 0) {
    setTimeout(() => {
      loaderContainer.style.opacity = '0';
      setTimeout(() => {
        loaderContainer.style.display = 'none';
      }, 200);
    }, delay);
  }

  function setRangeProgress(input, activeColor, inactiveColor) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(input.value) || 0;
    const percent = ((value - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, ${activeColor} ${percent}%, ${inactiveColor} ${percent}%)`;
  }

  function updateScoreRing(percent) {
    const offset = scoreCircumference - (percent / 100) * scoreCircumference;
    scoreRing.style.strokeDashoffset = offset;
  }

  function updateGoalDisplay(goalMinutes, learnedMinutes) {
    goalValue.textContent = `${goalMinutes} min`;
    const percentage = goalMinutes > 0
      ? Math.min(100, Math.round((learnedMinutes / goalMinutes) * 100))
      : 0;

    goalProgressText.textContent = `${percentage}% of goal`;
    goalSlider.value = goalMinutes;
    setRangeProgress(goalSlider, '#0d7377', '#e5e7eb');
  }

  function renderVideoStats(stats = defaultVideoStats) {
    const minutes = Math.round(stats.watchTime?.educational / 60) || 0;

    filteredCount.textContent = stats.filteredCount || 0;
    educationalCount.textContent = stats.educationalCount || 0;
    totalVideos.textContent = stats.totalVideos || 0;
    educationalTime.textContent = `${minutes} min`;
    educationalProgress.style.width = `${stats.educationalPercentage || 0}%`;
    educationalPercentage.textContent = `${stats.educationalPercentage || 0}%`;
    productivityScore.textContent = `${stats.productivityScore || 0}%`;
    updateScoreRing(stats.productivityScore || 0);
    updateGoalDisplay(parseInt(goalSlider.value, 10) || 30, minutes);
  }

  function renderCachedStats(stats) {
    filteredCount.textContent = stats.filteredCount || 0;
    educationalCount.textContent = stats.educationalCount || 0;
    totalVideos.textContent = stats.totalVideos || 0;
    educationalTime.textContent = stats.educationalTime || '0 min';
    educationalProgress.style.width = `${stats.educationalPercentage || 0}%`;
    educationalPercentage.textContent = `${stats.educationalPercentage || 0}%`;
    productivityScore.textContent = `${stats.productivityScore || 0}%`;
    updateScoreRing(stats.productivityScore || 0);
    updateGoalDisplay(parseInt(goalSlider.value, 10) || 30, parseInt(stats.educationalTime, 10) || 0);
  }

  function renderAiStats(stats = defaultAiStats) {
    aiClassified.textContent = stats.aiClassified || 0;
    aiBlocked.textContent = stats.blocked || 0;
    aiOverridden.textContent = stats.overridden || 0;
  }

  async function loadAiStats() {
    const result = await localGet(['aiStats']);
    renderAiStats(result.aiStats || defaultAiStats);
  }

  function getSelectedFocusDuration() {
    return state.focusSelectionMode === 'custom'
      ? state.customDuration
      : state.presetDuration;
  }

  function formatFocusTime(remainingMs) {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function stopFocusSessionInterval() {
    if (state.focusSessionIntervalId) {
      clearInterval(state.focusSessionIntervalId);
      state.focusSessionIntervalId = null;
    }
  }

  async function refreshFocusSession() {
    try {
      const response = await runtimeSendMessage({ type: 'getFocusSession' });
      state.focusSession = response?.success ? (response.result || null) : null;
      renderFocusSession();
    } catch (error) {
      console.warn('MMP: Failed to refresh focus session:', error);
    }
  }

  function getRunningFocusMeta(session) {
    if (session.filterManuallyChanged) {
      return 'Manual filter change detected. Session end will keep the current filter state.';
    }

    if (session.autoEnabledFilter) {
      return 'Filtering was enabled for this session and will restore unless you change it manually.';
    }

    return 'Filtering was already on when this session started.';
  }

  function getCompletedFocusMeta(session) {
    if (session.autoEnabledFilter && session.filterManuallyChanged) {
      return 'Session complete. Your manual filter change was preserved.';
    }

    if (session.autoEnabledFilter) {
      return 'Session complete. Filtering was restored to its pre-session state.';
    }

    return 'Session complete. Filtering stayed in its existing state.';
  }

  function renderFocusSelectionControls() {
    const running = state.focusSession?.status === 'running';
    const disabled = running || state.focusSessionBusy;
    const selectedDuration = getSelectedFocusDuration();

    focusSessionPresetButtons.forEach((button) => {
      const duration = Number(button.dataset.duration);
      const active = state.focusSelectionMode === 'preset' && duration === state.presetDuration;
      button.classList.toggle('is-active', active);
      button.disabled = disabled;
    });

    focusSessionCustomSlider.value = state.customDuration;
    focusSessionCustomSlider.disabled = disabled;
    focusSessionCustomValue.textContent = `${state.customDuration} min`;
    focusSessionCustom.classList.toggle('is-active', state.focusSelectionMode === 'custom');
    setRangeProgress(focusSessionCustomSlider, '#fb923c', '#dbeafe');

    if (!running) {
      focusSessionStart.textContent = `Start ${selectedDuration} min session`;
    }

    focusSessionStart.disabled = state.focusSessionBusy;
    focusSessionCancel.disabled = state.focusSessionBusy;
    focusSessionClear.disabled = state.focusSessionBusy;
  }

  function renderFocusSession() {
    const session = state.focusSession;
    const running = session?.status === 'running';
    const completed = session?.status === 'completed';

    renderFocusSelectionControls();

    if (running) {
      focusSessionCard.dataset.state = 'running';
      focusSessionStatus.textContent = 'Running';
      focusSessionTimer.textContent = formatFocusTime(session.endsAt - Date.now());
      focusSessionMeta.textContent = getRunningFocusMeta(session);
      focusSessionSelection.textContent = `Session length: ${session.durationMinutes} min`;
      focusSessionStart.hidden = true;
      focusSessionCancel.hidden = false;
      focusSessionClear.hidden = true;

      stopFocusSessionInterval();
      state.focusSessionIntervalId = window.setInterval(() => {
        if (!state.focusSession || state.focusSession.status !== 'running') {
          stopFocusSessionInterval();
          return;
        }

        const remainingMs = state.focusSession.endsAt - Date.now();
        if (remainingMs <= 0) {
          focusSessionTimer.textContent = '00:00';
          stopFocusSessionInterval();
          refreshFocusSession();
          return;
        }

        focusSessionTimer.textContent = formatFocusTime(remainingMs);
      }, 1000);
      return;
    }

    stopFocusSessionInterval();

    if (completed) {
      focusSessionCard.dataset.state = 'completed';
      focusSessionStatus.textContent = 'Complete';
      focusSessionTimer.textContent = `${session.durationMinutes} min`;
      focusSessionMeta.textContent = getCompletedFocusMeta(session);
      focusSessionSelection.textContent = state.focusSelectionMode === 'custom'
        ? `Selected: ${state.customDuration} min custom session`
        : `Selected: ${state.presetDuration} min preset`;
      focusSessionStart.hidden = false;
      focusSessionCancel.hidden = true;
      focusSessionClear.hidden = false;
      return;
    }

    focusSessionCard.dataset.state = 'idle';
    focusSessionStatus.textContent = 'Ready';
    focusSessionTimer.textContent = `${getSelectedFocusDuration()} min`;
    focusSessionMeta.textContent = 'Start a countdown that can auto-enable filtering while you study.';
    focusSessionSelection.textContent = state.focusSelectionMode === 'custom'
      ? `Selected: ${state.customDuration} min custom session`
      : `Selected: ${state.presetDuration} min preset`;
    focusSessionStart.hidden = false;
    focusSessionCancel.hidden = true;
    focusSessionClear.hidden = true;
  }

  async function setFilterEnabled(enabled) {
    showLoader(enabled ? 'Enabling focus mode...' : 'Disabling focus mode...');

    try {
      await syncSet({
        distractionFilterEnabled: enabled,
        lastUpdated: Date.now()
      });

      const tabs = await queryYouTubeTabs();

      if (enabled) {
        await Promise.all(tabs.map(tab => reloadTab(tab.id)));
        return;
      }

      await localSet({
        videoStats: {
          ...defaultVideoStats,
          lastUpdated: Date.now()
        },
        lastStats: {
          filteredCount: 0,
          educationalCount: 0,
          totalVideos: 0,
          educationalTime: '0 min',
          educationalPercentage: 0,
          productivityScore: 0,
          timestamp: Date.now()
        },
        aiStats: {
          ...defaultAiStats
        }
      });

      await Promise.all(tabs.map(tab => sendTabMessage(tab.id, { type: 'toggleFilter', enabled: false })));
      renderVideoStats(defaultVideoStats);
      renderAiStats(defaultAiStats);
    } finally {
      hideLoader(500);
    }
  }

  async function handleStartFocusSession() {
    state.focusSessionBusy = true;
    renderFocusSession();

    try {
      const response = await runtimeSendMessage({
        type: 'startFocusSession',
        durationMinutes: getSelectedFocusDuration()
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to start focus session.');
      }

      state.focusSession = response.result;
      renderFocusSession();
    } catch (error) {
      console.error('MMP: Failed to start focus session:', error);
    } finally {
      state.focusSessionBusy = false;
      renderFocusSession();
    }
  }

  async function handleCancelFocusSession() {
    state.focusSessionBusy = true;
    renderFocusSession();

    try {
      const response = await runtimeSendMessage({ type: 'cancelFocusSession' });
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to cancel focus session.');
      }

      state.focusSession = null;
      renderFocusSession();
    } catch (error) {
      console.error('MMP: Failed to cancel focus session:', error);
    } finally {
      state.focusSessionBusy = false;
      renderFocusSession();
    }
  }

  async function handleClearCompletedFocusSession() {
    state.focusSessionBusy = true;
    renderFocusSession();

    try {
      const response = await runtimeSendMessage({ type: 'clearCompletedFocusSession' });
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to clear focus session.');
      }

      state.focusSession = null;
      renderFocusSession();
    } catch (error) {
      console.error('MMP: Failed to clear completed focus session:', error);
    } finally {
      state.focusSessionBusy = false;
      renderFocusSession();
    }
  }

  async function initializePopup() {
    const minimumLoaderTime = new Promise(resolve => setTimeout(resolve, 500));

    try {
      const [syncState, localState, focusResponse] = await Promise.all([
        syncGet(['distractionFilterEnabled']),
        localGet(['videoStats', 'lastStats', 'dailyGoal', 'aiStats', 'geminiApiKey']),
        runtimeSendMessage({ type: 'getFocusSession' }).catch(() => ({ success: false, result: null })),
        minimumLoaderTime
      ]);

      toggle.checked = Boolean(syncState.distractionFilterEnabled);

      const dailyGoal = localState.dailyGoal || 30;
      updateGoalDisplay(dailyGoal, 0);

      geminiApiKeyInput.value = localState.geminiApiKey || '';
      if (localState.geminiApiKey) {
        geminiApiKeyStatus.textContent = 'Key saved locally. AI classification is enabled.';
      }

      if (localState.lastStats && Date.now() - localState.lastStats.timestamp < 3600000) {
        renderCachedStats(localState.lastStats);
      }

      renderVideoStats(localState.videoStats || defaultVideoStats);
      renderAiStats(localState.aiStats || defaultAiStats);

      state.focusSession = focusResponse?.success ? (focusResponse.result || null) : null;
      renderFocusSession();

      hideLoader();
    } catch (error) {
      console.error('MMP: Error loading popup state:', error);
      renderVideoStats(defaultVideoStats);
      renderAiStats(defaultAiStats);
      renderFocusSession();
      hideLoader();
    }
  }

  goalSlider.addEventListener('input', () => {
    const value = parseInt(goalSlider.value, 10);
    updateGoalDisplay(value, parseInt(educationalTime.textContent, 10) || 0);
  });

  goalSlider.addEventListener('change', () => {
    const value = parseInt(goalSlider.value, 10);
    localSet({ dailyGoal: value }).catch((error) => {
      console.error('MMP: Failed to save daily goal:', error);
    });
  });

  saveGeminiApiKey.addEventListener('click', () => {
    const geminiApiKey = geminiApiKeyInput.value.trim();
    localSet({ geminiApiKey }).then(() => {
      geminiApiKeyStatus.textContent = geminiApiKey
        ? 'Key saved locally. AI classification is enabled.'
        : 'Key cleared. Local classification will be used.';
    }).catch((error) => {
      console.error('MMP: Failed to save Gemini API key:', error);
      geminiApiKeyStatus.textContent = 'Could not save the key. Please try again.';
    });
  });

  toggle.addEventListener('change', () => {
    setFilterEnabled(toggle.checked).catch(error => {
      console.error('MMP: Failed to toggle filter:', error);
      toggle.checked = !toggle.checked;
      hideLoader();
    });
  });

  focusSessionPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (state.focusSession?.status === 'running') return;
      state.focusSelectionMode = 'preset';
      state.presetDuration = Number(button.dataset.duration);
      renderFocusSession();
    });
  });

  focusSessionCustomSlider.addEventListener('input', () => {
    if (state.focusSession?.status === 'running') return;
    state.focusSelectionMode = 'custom';
    state.customDuration = Number(focusSessionCustomSlider.value);
    renderFocusSession();
  });

  focusSessionStart.addEventListener('click', () => {
    if (state.focusSession?.status === 'running') return;
    handleStartFocusSession();
  });

  focusSessionCancel.addEventListener('click', () => {
    if (state.focusSession?.status !== 'running') return;
    handleCancelFocusSession();
  });

  focusSessionClear.addEventListener('click', () => {
    if (state.focusSession?.status !== 'completed') return;
    handleClearCompletedFocusSession();
  });

  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
      try {
        const localState = await localGet(null);
        
        const videoStats = localState.videoStats || defaultVideoStats;
        const aiStats = localState.aiStats || defaultAiStats;
        const timestamp = new Date().toISOString();
        const educationalWatchTime = Math.round(videoStats.watchTime?.educational / 60) || 0;
        const entertainmentWatchTime = Math.round(videoStats.watchTime?.entertainment / 60) || 0;

        const headers = ['Timestamp', 'Educational Videos', 'Filtered Videos', 'Total Checked', 'Edu Watch Time (min)', 'Ent Watch Time (min)', 'Productivity Score (%)', 'AI Analyzed', 'AI Blocked', 'AI Overridden'];
        const row = [
          timestamp,
          videoStats.educationalCount,
          videoStats.filteredCount,
          videoStats.totalVideos,
          educationalWatchTime,
          entertainmentWatchTime,
          videoStats.productivityScore,
          aiStats.aiClassified,
          aiStats.blocked,
          aiStats.overridden
        ];

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\\n' + row.join(',');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `mmp_productivity_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('MMP: Failed to export CSV:', error);
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.videoStats) {
        renderVideoStats(changes.videoStats.newValue || defaultVideoStats);
        loadAiStats().catch(error => console.warn('MMP: Failed to refresh AI stats:', error));
      }

      if (changes.focusSession) {
        state.focusSession = changes.focusSession.newValue || null;
        renderFocusSession();
      }

      if (changes.aiStats && !changes.videoStats) {
        renderAiStats(changes.aiStats.newValue || defaultAiStats);
      }

      if (changes.dailyGoal) {
        updateGoalDisplay(changes.dailyGoal.newValue || 30, parseInt(educationalTime.textContent, 10) || 0);
      }
    }

    if (namespace === 'sync' && changes.distractionFilterEnabled) {
      toggle.checked = Boolean(changes.distractionFilterEnabled.newValue);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== 'statsUpdate' || !message.stats) return;

    const stats = message.stats;
    const minutes = Math.round(stats.watchTime?.educational / 60) || 0;

    renderVideoStats(stats);
    loadAiStats().catch(error => console.warn('MMP: Failed to refresh AI stats:', error));

    localSet({
      lastStats: {
        filteredCount: stats.filteredCount || 0,
        educationalCount: stats.educationalCount || 0,
        totalVideos: stats.totalVideos || 0,
        educationalTime: `${minutes} min`,
        educationalPercentage: stats.educationalPercentage || 0,
        productivityScore: stats.productivityScore || 0,
        timestamp: Date.now()
      }
    }).catch(error => console.warn('MMP: Failed to cache last stats:', error));
  });

  initializePopup();
});
