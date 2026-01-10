/**
 * Transcript extraction module
 * Extracts full transcript from YouTube video player data
 */

/**
 * Extract video ID from current URL
 * @returns {string|null} Video ID or null if not found
 */
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Get player response data from YouTube page
 * @returns {object|null} Player response or null
 */
function getPlayerResponse() {
  // Try ytInitialPlayerResponse first (fastest)
  if (window.ytInitialPlayerResponse) {
    return window.ytInitialPlayerResponse;
  }

  // Fallback: Try to get from ytplayer config
  if (window.ytplayer?.config?.args?.player_response) {
    try {
      return JSON.parse(window.ytplayer.config.args.player_response);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Extract caption tracks from player response
 * @param {object} playerResponse - YouTube player response
 * @returns {Array} Array of caption track objects
 */
function getCaptionTracks(playerResponse) {
  return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
}

/**
 * Fetch transcript from caption track URL
 * @param {string} baseUrl - Caption track base URL
 * @returns {Promise<string>} Transcript text
 */
async function fetchTranscript(baseUrl) {
  // Request JSON format for easier parsing
  const url = `${baseUrl}&fmt=json3`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript: ${response.status}`);
  }

  const data = await response.json();
  return parseTranscriptJson(data);
}

/**
 * Parse JSON3 format transcript
 * @param {object} data - JSON3 transcript data
 * @returns {string} Formatted transcript text with timestamps
 */
function parseTranscriptJson(data) {
  const events = data.events || [];
  const lines = [];

  for (const event of events) {
    // Skip events without segments (like newlines or metadata)
    if (!event.segs) continue;

    const timestamp = formatTimestamp(event.tStartMs);
    const text = event.segs
      .map(seg => seg.utf8 || '')
      .join('')
      .trim();

    if (text) {
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
 * @returns {Promise<string>} Transcript text
 */
async function getTranscript() {
  const playerResponse = getPlayerResponse();
  if (!playerResponse) {
    throw new Error('Could not access video data');
  }

  const tracks = getCaptionTracks(playerResponse);
  if (tracks.length === 0) {
    throw new Error('No transcript available');
  }

  // Prefer non-auto-generated tracks, fallback to first available
  const preferredTrack = tracks.find(t => !t.kind || t.kind !== 'asr') || tracks[0];

  return fetchTranscript(preferredTrack.baseUrl);
}

// Export for content script
window.TranscriptControl = {
  getTranscript,
  getVideoId
};
