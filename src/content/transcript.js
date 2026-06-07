// ═══════════════════════════════════════════════════════════════════════════════
// YouTube Transcript Fetcher
// ═══════════════════════════════════════════════════════════════════════════════

/** Extracts a YouTube video ID from a URL */
function getVideoIdFromUrl(url) {
  const match = url?.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/** Fetches the transcript/captions for a YouTube video */
async function fetchTranscript(videoId) {
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(pageUrl);
    const html = await response.text();

    // Extract ytInitialPlayerResponse JSON
    const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/s);
    if (!playerMatch) {
      return { success: false, transcript: '', error: 'No player response found' };
    }

    let playerResponse;
    try {
      playerResponse = JSON.parse(playerMatch[1]);
    } catch {
      return { success: false, transcript: '', error: 'Failed to parse player response' };
    }

    // Get caption tracks
    const captionTracks = playerResponse?.captions
      ?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return { success: false, transcript: '', error: 'No captions available' };
    }

    // Prefer English captions, fall back to first available
    const enTrack = captionTracks.find(t =>
      t.languageCode === 'en' || t.languageCode?.startsWith('en')
    ) || captionTracks[0];

    if (!enTrack?.baseUrl) {
      return { success: false, transcript: '', error: 'No caption URL found' };
    }

    // Fetch the timed text XML
    const captionResponse = await fetch(enTrack.baseUrl);
    const captionXml = await captionResponse.text();

    // Parse XML and extract text
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(captionXml, 'text/xml');
    const textNodes = xmlDoc.querySelectorAll('text');
    const transcriptLines = [];

    textNodes.forEach(node => {
      let text = node.textContent || '';
      text = text.replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'")
                 .replace(/\n/g, ' ')
                 .trim();
      if (text) transcriptLines.push(text);
    });

    const transcript = transcriptLines.join(' ');
    return { success: true, transcript, language: enTrack.languageCode };
  } catch (error) {
    return { success: false, transcript: '', error: error.message };
  }
}
