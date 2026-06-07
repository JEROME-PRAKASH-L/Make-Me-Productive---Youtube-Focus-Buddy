// ═══════════════════════════════════════════════════════════════════════════════
// Classifier — keyword matching & classification helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Word-boundary aware matching.
 * Prevents "fun" matching "function", "tour" matching "tutorial", etc.
 */
function matchesKeyword(text, keyword) {
  try {
    // For keywords ending with non-word chars (like "mix -"), use simple includes
    if (/[^a-zA-Z0-9]$/.test(keyword.trim())) {
      return text.toLowerCase().includes(keyword.toLowerCase());
    }
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
  } catch {
    return text.toLowerCase().includes(keyword.toLowerCase());
  }
}

/** Returns true if text contains any educational keyword */
function isEducational(text) {
  return educationalKeywords.some(kw => matchesKeyword(text, kw));
}

/** Returns the first matching entertainment keyword, or undefined */
function shouldFilterOut(text) {
  return entertainmentKeywords.find(kw => matchesKeyword(text, kw));
}

/** Returns true if the channel name matches a known educational channel */
function isKnownEduChannel(text) {
  const lower = text.toLowerCase();
  return knownEducationalChannels.some(ch => lower.includes(ch));
}

/** Gets a motivational message for the matched keyword */
function getMotivationalMessage(keyword) {
  if (distractingKeywordMessages[keyword]) {
    return distractingKeywordMessages[keyword];
  }
  // Try partial match: check if any key is contained within the keyword
  const lowerKeyword = keyword.toLowerCase();
  for (const [key, message] of Object.entries(distractingKeywordMessages)) {
    if (lowerKeyword.includes(key)) {
      return message;
    }
  }
  const messages = Object.values(distractingKeywordMessages);
  return messages[Math.floor(Math.random() * messages.length)];
}
