/**
 * Transcript extraction module
 * Extracts full transcript from YouTube video using Innertube API with Android client
 *
 * Uses Android client context to bypass PoToken requirement (exp=xpe parameter)
 * that would otherwise cause empty responses from caption endpoints.
 */

/**
 * Android client context for Innertube API
 * This bypasses the PoToken requirement that web client URLs have
 */
const ANDROID_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '19.09.37',
    androidSdkVersion: 30,
    hl: 'en',
    gl: 'US'
  }
};

/**
 * Extract video ID from current URL
 * @returns {string|null} Video ID or null if not found
 */
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Get Innertube API key from YouTube page config
 * @returns {string|null} API key or null if not found
 */
function getApiKey() {
  return window.ytcfg?.data_?.INNERTUBE_API_KEY || null;
}

/**
 * Fetch fresh player data using Innertube API with Android client
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object|null>} Player response data or null
 */
async function fetchPlayerData(videoId) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Could not find API key');
  }

  const response = await fetch(`/youtubei/v1/player?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: ANDROID_CONTEXT,
      videoId
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Player API failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Extract caption tracks from player response
 * @param {object} playerData - YouTube player response
 * @returns {Array} Array of caption track objects
 */
function getCaptionTracks(playerData) {
  return playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
}

/**
 * Fetch transcript XML from caption track URL
 * @param {string} baseUrl - Caption track base URL
 * @returns {Promise<string>} Raw XML transcript
 */
async function fetchTranscriptXml(baseUrl) {
  const response = await fetch(baseUrl, {
    credentials: 'include',
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transcript: ${response.status}`);
  }

  return response.text();
}

/**
 * Decode HTML entities in text
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#47;': '/',
    '&nbsp;': ' '
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }

  // Handle numeric entities like &#123;
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
}

/**
 * Parse transcript XML into formatted text with timestamps
 * YouTube uses <p t="ms" d="ms">text</p> format
 * @param {string} xml - Raw XML transcript
 * @returns {string} Formatted transcript text
 */
function parseTranscriptXml(xml) {
  // Match <p t="startMs" d="durationMs">text</p>
  const regex = /<p t="(\d+)"[^>]*>([^<]*)<\/p>/g;
  const lines = [];
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const startMs = parseInt(match[1], 10);
    const rawText = match[2];

    // Clean up text
    const text = decodeHtmlEntities(rawText)
      .replace(/\n/g, ' ')  // Replace newlines with spaces
      .trim();

    if (text) {
      const timestamp = formatTimestamp(startMs);
      lines.push(`[${timestamp}] ${text}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format milliseconds to MM:SS or HH:MM:SS timestamp
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Get full transcript for current video
 * Prefers manual captions over auto-generated
 * Uses Android client to bypass PoToken requirement
 * @returns {Promise<string>} Transcript text
 */
async function getTranscript() {
  const videoId = getVideoId();
  if (!videoId) {
    throw new Error('No video ID found');
  }

  // Fetch fresh player data using Android client
  const playerData = await fetchPlayerData(videoId);

  const tracks = getCaptionTracks(playerData);
  if (tracks.length === 0) {
    throw new Error('No transcript available');
  }

  // Prefer non-auto-generated tracks (manual captions), fallback to first available
  const preferredTrack = tracks.find(t => !t.kind || t.kind !== 'asr') || tracks[0];

  // Fetch and parse transcript
  const xml = await fetchTranscriptXml(preferredTrack.baseUrl);

  if (!xml || xml.length === 0) {
    throw new Error('Empty transcript response');
  }

  const transcript = parseTranscriptXml(xml);

  if (!transcript) {
    throw new Error('Failed to parse transcript');
  }

  return transcript;
}

// Export for content script
window.TranscriptControl = {
  getTranscript,
  getVideoId
};

// Listen for transcript requests from content script
// This runs in page context and can respond directly via postMessage
window.addEventListener('message', async (event) => {
  // Only handle messages from this window
  if (event.source !== window) return;

  // Check for transcript request with messageId
  if (event.data?.type === 'GET_TRANSCRIPT' && event.data?.messageId) {
    const messageId = event.data.messageId;
    try {
      const transcript = await getTranscript();
      window.postMessage({ type: 'TRANSCRIPT_RESULT', messageId, transcript }, '*');
    } catch (err) {
      window.postMessage({ type: 'TRANSCRIPT_RESULT', messageId, error: err.message }, '*');
    }
  }
});
