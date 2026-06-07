// ═══════════════════════════════════════════════════════════════════════════════
// Gemini AI Classification
// ═══════════════════════════════════════════════════════════════════════════════

async function classifyWithGemini(apiKey, transcriptText, videoTitle, channelName) {
  // Rate limiting
  const now = Date.now();
  const timeSinceLast = now - lastApiCall;
  if (timeSinceLast < API_COOLDOWN_MS) {
    await new Promise(resolve => setTimeout(resolve, API_COOLDOWN_MS - timeSinceLast));
  }
  lastApiCall = Date.now();

  const truncatedTranscript = transcriptText.substring(0, 2000);

  const prompt = `You are a STRICT content classifier for a YouTube productivity extension. Your job is to ensure ONLY genuinely educational/learning content is shown. Be STRICT — when in doubt, classify as NOT_EDUCATIONAL.

EDUCATIONAL (must be the PRIMARY purpose of the video):
- Programming tutorials, coding lessons, software development, algorithms, DSA
- Computer science concepts, system design, technical interviews
- Science: physics, chemistry, biology, astronomy, environmental science
- Mathematics: calculus, statistics, algebra, geometry, proofs
- Engineering: electronics, mechanical, civil, robotics
- Academic lectures, university courses, research presentations
- Professional skills tutorials: UX/UI design, data analysis, cloud computing
- Language learning (grammar, vocabulary, structured lessons)
- Finance/economics THEORY (not stock tips or crypto hype)
- Documentaries that are primarily informational/educational

NOT_EDUCATIONAL (block these — be aggressive):
- Music videos, song lyrics, album releases, concerts, ANY music content
- Movies, trailers, teasers, TV shows, web series, anime, K-drama
- Comedy, pranks, memes, reaction videos, roasts, skits
- Vlogs, travel vlogs, day-in-life, lifestyle, family content
- Gaming, gameplay, walkthroughs, esports, game highlights
- News, breaking news, current events, political commentary
- Celebrity content, gossip, interviews (non-technical)
- Fashion, beauty, makeup, skincare, fitness routines
- Food, cooking shows, recipes, mukbang, ASMR
- Unboxing, hauls, product reviews (non-technical)
- Sports highlights, match replays, sports news
- Motivational/inspirational speeches (not structured teaching)
- Shorts, TikTok-style content, viral videos
- Ads, sponsored content, promotions
- ANY video primarily in a non-educational entertainment format

CRITICAL RULES:
1. Music + lyrics/lyrical = NOT_EDUCATIONAL always
2. News/breaking news = NOT_EDUCATIONAL always
3. Entertainment channel = NOT_EDUCATIONAL even if title sounds educational
4. "Interview" is NOT_EDUCATIONAL unless it's a technical job interview prep
5. A coding livestream IS educational. A music livestream is NOT.
6. If the content mixes entertainment with small educational bits, classify as NOT_EDUCATIONAL

Video Title: "${videoTitle}"
Channel: "${channelName}"
Transcript excerpt:
"""
${truncatedTranscript}
"""

Respond with ONLY valid JSON (no markdown, no code fences):
{"classification": "EDUCATIONAL" or "NOT_EDUCATIONAL", "confidence": 0.0-1.0, "reason": "brief reason"}`;

  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 150 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let cleanJson = textResponse.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
  }

  try {
    const result = JSON.parse(cleanJson);
    return {
      isEducational: result.classification === 'EDUCATIONAL',
      confidence: result.confidence || 0.5,
      reason: result.reason || 'AI classification',
      method: 'gemini-ai'
    };
  } catch (parseError) {
    const isEdu = textResponse.toUpperCase().includes('EDUCATIONAL') &&
                  !textResponse.toUpperCase().includes('NOT_EDUCATIONAL');
    return {
      isEducational: isEdu,
      confidence: 0.4,
      reason: 'AI response parsed with fallback',
      method: 'gemini-ai-fallback'
    };
  }
}
