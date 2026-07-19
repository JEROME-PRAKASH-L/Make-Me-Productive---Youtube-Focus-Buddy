# Make Me Productive – YouTube Focus Buddy

**Make Me Productive – YouTube Focus Buddy** is a Chrome extension that helps you stay focused and productive on YouTube by automatically hiding distracting entertainment videos—including Shorts, ads, and breaking news sections—while highlighting educational content. It uses **Gemini 2.0 Flash AI** for transcript-based video classification with a local keyword fallback, and tracks your productivity with real-time analytics.

## Features

- **AI-Powered Content Filtering**:
  - Classifies videos using Google Gemini 2.0 Flash transcript analysis
  - Falls back to intelligent keyword scoring when AI is unavailable
  - Filters out entertainment, Shorts, ads, and breaking news sections
  - Preserves educational videos such as tutorials, courses, and lectures
  - Real-time filtering of newly loaded and dynamically added content

- **Productivity Analytics**:
  - Tracks the number of educational vs. non-educational videos shown
  - Measures educational and entertainment watch time
  - Calculates a personalized productivity score based on your viewing habits
  - Configurable daily learning goal with progress tracking
  - Provides real-time progress and score updates

- **Motivational Overlays**:
  - Displays context-aware motivational messages over distracting videos
  - Elegant overlay design with blur and fade effects
  - Encourages you to focus on learning and personal growth

- **User-Friendly Interface**:
  - Modern popup with productivity statistics and progress bars
  - Easy toggle switch to enable or disable filtering
  - Visual display of educational content percentage and productivity score
  - AI analysis stats (classified, blocked, overridden)

- **Privacy-Focused**:
  - All keyword classification happens locally in your browser
  - AI classification uses Gemini API with no user data stored externally
  - Settings sync across your Chrome instances

## Benefits

- **Enhanced Learning**: Focus on educational content that adds value to your goals
- **Time Management**: Reduce time spent on entertainment and distractions
- **Progress Tracking**: Monitor your YouTube usage and educational content consumption
- **Behavior Change**: Motivational overlays help build better viewing habits
- **Productivity Boost**: Clear visualization of your productivity helps maintain focus

## Installation

1. Clone or download this repository to your local machine.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the folder containing this project.
5. Optional: open the extension popup, paste your Gemini API key into **Gemini API key**, and click **Save**. Leave it blank to use local keyword classification only.

The key is stored in Chrome's local extension storage. It is never placed in the extension source or committed to the repository.

## Usage

1. Click the extension icon in your Chrome toolbar.
2. Toggle "Make Me Productive" to enable or disable filtering.
3. Visit YouTube to see the changes in action.
4. Check your productivity stats in the popup window:
   - Number of filtered videos
   - Educational video count
   - Educational and entertainment watch time
   - Productivity score
   - Educational content percentage

## File Structure

```
├── manifest.json                   # Chrome extension manifest (MV3)
├── icons/
│   └── icon.png                    # Extension icon
├── src/
│   ├── content/                    # Content script modules (YouTube page)
│   │   ├── keywords.js             # Keyword lists, channel lists, messages
│   │   ├── classifier.js           # Classification logic (matchesKeyword, isEducational, shouldFilterOut)
│   │   ├── transcript.js           # YouTube transcript fetching
│   │   ├── ui.js                   # DOM helpers, overlays, indicators
│   │   ├── stats.js                # Productivity stats & watch time tracking
│   │   ├── watchPage.js            # Watch page analysis (single video view)
│   │   ├── browsePage.js           # Browse/search page filtering (video cards)
│   │   └── lifecycle.js            # Init, navigation detection, observers
│   ├── background/                 # Background service worker modules
│   │   ├── index.js                # Entry point (importScripts loader)
│   │   ├── config.js               # API keys, model settings, constants
│   │   ├── cache.js                # Classification cache with expiry
│   │   ├── geminiApi.js            # Gemini 2.0 Flash API classification
│   │   ├── localClassifier.js      # Weighted keyword scoring fallback
│   │   └── messageHandler.js       # Message routing & tab communication
│   └── popup/                      # Extension popup UI
│       ├── popup.html              # Popup HTML structure
│       ├── popup.css               # Popup styles
│       └── popup.js                # Popup logic, stats display, toggle
├── README.md
└── LICENSE
```

## How It Works

1. **Content Script** (`src/content/`):
   - Observes YouTube page changes via MutationObserver + IntersectionObserver
   - On browse/search pages: scans video cards, classifies titles locally, hides distracting ones
   - On watch pages: fetches transcript, sends to background for AI classification
   - Overlays distracting videos with motivational messages
   - Tracks stats and watch time for educational and entertainment content

2. **Background Service Worker** (`src/background/`):
   - Receives classification requests from content script
   - Sends transcripts to Gemini 2.0 Flash API for AI analysis
   - Falls back to weighted keyword scoring if API unavailable
   - Caches results for 7 days to minimize API calls
   - Routes messages between content script, popup, and storage

3. **Popup** (`src/popup/`):
   - Toggle to enable/disable filtering
   - Real-time productivity dashboard (stats, score ring, goal tracker)
   - AI analysis stats (classified, blocked, overridden)

## Customization

- **Distracting Keywords**: Edit `entertainmentKeywords` in `src/content/keywords.js`
- **Educational Keywords**: Edit `educationalKeywords` in `src/content/keywords.js`
- **Motivational Messages**: Customize `distractingKeywordMessages` in `src/content/keywords.js`
- **Known Edu Channels**: Add trusted channels to `knownEducationalChannels` in `src/content/keywords.js`

### Example keyword sets (recommended starting point)
- Entertainment keywords: short, prank, meme, trailer, reaction, vlog, funny, gaming, music video, dance, gossip, celebrity, drama, challenge
- Educational keywords: tutorial, how to, lecture, course, lesson, explain, guide, walkthrough, lecture, study, tutorial, documentary, science, programming, math, history

## Permissions

This extension requires:
- **Storage**: To save settings and stats.
- **Tabs**: To reload the active tab when toggling the filter.

## Upcoming features

Planned improvements and near-term work:
- Add better keywords: expanded, categorized default lists (tutorials, coding, science, language), synonym expansion, and community-importable keyword packs.
- Optional ML-assisted classifier: lightweight classifier to improve precision beyond keywords.
- Per-channel and per-playlist whitelists/blacklists.
- Scheduled focus sessions (pomodoro-style) and auto-enable filters during sessions.
- Export/import productivity data (CSV) and manual backup.
- Improved popup UI: trends, historical graphs, and configurable goals.
- Community keyword sharing and moderation workflow (opt-in).
- Accessibility and i18n support for non-English keywords.

## Development

- To test changes quickly:
  - Update files in the project folder.
  - In chrome://extensions reload the unpacked extension.
- Use the console on YouTube pages (DevTools) to debug content script logs.

## Privacy & Security

- Keyword-based classification runs entirely in the browser.
- AI classification sends only video transcripts to Google Gemini API — no personal data.
- Uses Chrome Storage for local settings, stats, and the optional Gemini API key.
- No tracking, no analytics, no third-party services beyond Gemini.

## Troubleshooting

- If filtering doesn't appear:
  - Ensure the extension is enabled in chrome://extensions.
  - Reload the active YouTube tab.
  - Open DevTools console on YouTube to check for script errors.
- If dynamic elements aren't filtered, reload the tab or ensure the content script injection matches YouTube pages in `manifest.json`.

## Contributing

- Contributions welcome. Please open issues or PRs.
- Keep changes focused, update any relevant keywords and tests (if added).

## License

MIT License. Free to use, modify, and distribute.
