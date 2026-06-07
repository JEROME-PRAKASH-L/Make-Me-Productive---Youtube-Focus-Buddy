// ═══════════════════════════════════════════════════════════════════════════════
// Focus Sessions — persistent countdown timer and filter restoration logic
// ═══════════════════════════════════════════════════════════════════════════════

const FOCUS_SESSION_ALARM = 'focus-session-end';
let suppressedFilterChangeTarget = null;

function localGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function localSet(value) {
  return new Promise(resolve => chrome.storage.local.set(value, resolve));
}

function localRemove(keys) {
  return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
}

function syncGet(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

function syncSet(value) {
  return new Promise(resolve => chrome.storage.sync.set(value, resolve));
}

function clearAlarm(name) {
  return new Promise(resolve => chrome.alarms.clear(name, resolve));
}

async function getStoredFocusSession() {
  const result = await localGet(['focusSession']);
  return result.focusSession || null;
}

async function setStoredFocusSession(session) {
  await localSet({ focusSession: session });
}

async function removeStoredFocusSession() {
  await localRemove(['focusSession']);
}

async function setFilterEnabledFromSession(enabled) {
  suppressedFilterChangeTarget = enabled;
  await syncSet({
    distractionFilterEnabled: enabled,
    lastUpdated: Date.now()
  });
}

async function scheduleFocusSessionAlarm(endsAt) {
  await clearAlarm(FOCUS_SESSION_ALARM);
  chrome.alarms.create(FOCUS_SESSION_ALARM, { when: endsAt });
}

async function restoreFilterStateIfNeeded(session) {
  if (session.autoEnabledFilter && !session.filterManuallyChanged) {
    await setFilterEnabledFromSession(Boolean(session.previousFilterEnabled));
  }
}

async function completeFocusSession() {
  const session = await getStoredFocusSession();
  if (!session || session.status !== 'running') return session || null;

  await clearAlarm(FOCUS_SESSION_ALARM);
  await restoreFilterStateIfNeeded(session);

  const completedSession = {
    ...session,
    status: 'completed',
    completedAt: Date.now()
  };

  await setStoredFocusSession(completedSession);
  return completedSession;
}

async function cancelFocusSession() {
  const session = await getStoredFocusSession();
  if (!session || session.status !== 'running') return null;

  await clearAlarm(FOCUS_SESSION_ALARM);
  await restoreFilterStateIfNeeded(session);
  await removeStoredFocusSession();
  return null;
}

async function clearCompletedFocusSession() {
  const session = await getStoredFocusSession();
  if (session?.status === 'completed') {
    await removeStoredFocusSession();
  }
  return null;
}

async function startFocusSession(durationMinutes) {
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 5 || duration > 120 || duration % 5 !== 0) {
    throw new Error('Focus session duration must be a 5-minute increment between 5 and 120 minutes.');
  }

  const existingSession = await getStoredFocusSession();
  if (existingSession?.status === 'running') {
    throw new Error('A focus session is already running.');
  }

  const syncState = await syncGet(['distractionFilterEnabled']);
  const previousFilterEnabled = Boolean(syncState.distractionFilterEnabled);
  const startedAt = Date.now();
  const session = {
    status: 'running',
    durationMinutes: duration,
    startedAt,
    endsAt: startedAt + (duration * 60 * 1000),
    previousFilterEnabled,
    autoEnabledFilter: !previousFilterEnabled,
    filterManuallyChanged: false,
    completedAt: null
  };

  await setStoredFocusSession(session);
  await scheduleFocusSessionAlarm(session.endsAt);

  if (!previousFilterEnabled) {
    await setFilterEnabledFromSession(true);
  }

  return session;
}

async function reconcileFocusSession() {
  const session = await getStoredFocusSession();
  if (!session) {
    await clearAlarm(FOCUS_SESSION_ALARM);
    return null;
  }

  if (session.status === 'running') {
    if (!session.endsAt || session.endsAt <= Date.now()) {
      return completeFocusSession();
    }

    await scheduleFocusSessionAlarm(session.endsAt);
    return session;
  }

  await clearAlarm(FOCUS_SESSION_ALARM);
  return session;
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync' || !changes.distractionFilterEnabled) return;

  const nextValue = Boolean(changes.distractionFilterEnabled.newValue);
  if (suppressedFilterChangeTarget !== null && nextValue === suppressedFilterChangeTarget) {
    suppressedFilterChangeTarget = null;
    return;
  }

  (async () => {
    const session = await getStoredFocusSession();
    if (!session || session.status !== 'running' || session.filterManuallyChanged) return;

    await setStoredFocusSession({
      ...session,
      filterManuallyChanged: true
    });
  })().catch(error => console.warn('MMP: Failed to track manual filter change:', error));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== FOCUS_SESSION_ALARM) return;
  completeFocusSession().catch(error => console.warn('MMP: Failed to complete focus session:', error));
});

chrome.runtime.onInstalled.addListener(() => {
  reconcileFocusSession().catch(error => console.warn('MMP: Focus session init failed:', error));
});

chrome.runtime.onStartup.addListener(() => {
  reconcileFocusSession().catch(error => console.warn('MMP: Focus session startup failed:', error));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['getFocusSession', 'startFocusSession', 'cancelFocusSession', 'clearCompletedFocusSession'].includes(message.type)) {
    return false;
  }

  (async () => {
    try {
      if (message.type === 'getFocusSession') {
        const session = await reconcileFocusSession();
        sendResponse({ success: true, result: session });
        return;
      }

      if (message.type === 'startFocusSession') {
        const session = await startFocusSession(message.durationMinutes);
        sendResponse({ success: true, result: session });
        return;
      }

      if (message.type === 'cancelFocusSession') {
        await cancelFocusSession();
        sendResponse({ success: true, result: null });
        return;
      }

      await clearCompletedFocusSession();
      sendResponse({ success: true, result: null });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});

reconcileFocusSession().catch(error => console.warn('MMP: Focus session bootstrap failed:', error));
