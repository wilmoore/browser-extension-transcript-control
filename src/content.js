/**
 * Content script for Transcript Control
 * Injects control button into YouTube player and handles transcript extraction
 */

const LOG_PREFIX = '[TranscriptControl:content]';

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

log('Content script initializing...');

// Load transcript module into page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/transcript.js');
script.onload = () => {
  log('transcript.js injected successfully');
  script.remove();
};
script.onerror = (err) => {
  logError('Failed to inject transcript.js:', err);
};
(document.head || document.documentElement).appendChild(script);
log('transcript.js injection initiated');

/**
 * Control button element reference
 * @type {HTMLButtonElement|null}
 */
let controlButton = null;

/**
 * Create the transcript control button element
 * Styled to match YouTube's native player controls
 * @returns {HTMLButtonElement}
 */
function createControlButton() {
  const button = document.createElement('button');
  button.className = 'ytp-button transcript-control-btn';
  button.setAttribute('aria-label', 'Copy transcript');
  button.setAttribute('title', 'Copy transcript');
  button.setAttribute('data-transcript-control', 'true');

  // SVG icon - bordered Ț to match CC button style (24x24 like YouTube's native icons)
  button.innerHTML = `
    <svg height="24" width="24" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
      <text x="12" y="14" text-anchor="middle" dominant-baseline="central" font-family="Roboto, Arial, sans-serif" font-size="11" font-weight="500" fill="currentColor">Ț</text>
    </svg>
  `;

  button.addEventListener('click', handleClick);
  return button;
}

/**
 * Handle control button click
 * Extracts transcript and copies to clipboard silently
 */
async function handleClick() {
  log('Button clicked, requesting transcript...');
  try {
    // Request transcript from page script
    const transcript = await requestTranscript();
    if (transcript) {
      log('Transcript received, length:', transcript.length);
      // Copy to clipboard silently
      await navigator.clipboard.writeText(transcript);
      log('Transcript copied to clipboard successfully');
    } else {
      logError('Received empty or null transcript');
    }
    // No feedback per design spec (ADR-002)
  } catch (err) {
    logError('handleClick failed:', err.message);
    // Silent failure per design spec (ADR-002)
  }
}

/**
 * Request transcript from page script via message passing
 * The transcript.js page script listens for GET_TRANSCRIPT messages
 * and responds with TRANSCRIPT_RESULT
 * @returns {Promise<string|null>}
 */
function requestTranscript() {
  return new Promise((resolve) => {
    const messageId = `transcript-${Date.now()}`;
    log('Sending GET_TRANSCRIPT message with id:', messageId);

    const handler = (event) => {
      if (event.data?.type === 'TRANSCRIPT_RESULT' && event.data?.messageId === messageId) {
        log('Received TRANSCRIPT_RESULT response');
        window.removeEventListener('message', handler);
        if (event.data.error) {
          logError('Transcript extraction error:', event.data.error);
          resolve(null);
        } else {
          log('Transcript extraction successful, length:', event.data.transcript?.length);
          resolve(event.data.transcript);
        }
      }
    };

    window.addEventListener('message', handler);

    // Send request to page script (transcript.js listens for this)
    window.postMessage({ type: 'GET_TRANSCRIPT', messageId }, '*');

    // Timeout after 15 seconds
    setTimeout(() => {
      logError('Transcript request timed out after 15s');
      window.removeEventListener('message', handler);
      resolve(null);
    }, 15000);
  });
}

/**
 * Find the YouTube player controls container
 * @returns {Element|null}
 */
function findControlsContainer() {
  const container = document.querySelector('.ytp-right-controls');
  log('findControlsContainer:', container ? 'found' : 'not found');
  return container;
}

/**
 * Find the CC button to position near
 * @returns {Element|null}
 */
function findCCButton() {
  const ccButton = document.querySelector('.ytp-subtitles-button');
  log('findCCButton:', ccButton ? 'found' : 'not found');
  return ccButton;
}

/**
 * Inject the control button into YouTube player
 * Uses safe DOM insertion that handles various YouTube layouts
 */
function injectControl() {
  log('injectControl called');

  // Already injected
  if (document.querySelector('[data-transcript-control]')) {
    log('Button already injected, skipping');
    return;
  }

  const container = findControlsContainer();
  if (!container) {
    log('Controls container not found, will retry');
    return;
  }

  controlButton = createControlButton();
  log('Control button created');
  const ccButton = findCCButton();

  // Strategy: Insert before CC button (to the left of it), otherwise at start of right controls
  if (ccButton) {
    // Use insertAdjacentElement for safer insertion regardless of parent structure
    try {
      ccButton.insertAdjacentElement('beforebegin', controlButton);
      log('Button injected before CC button');
      return;
    } catch (err) {
      logError('insertAdjacentElement failed:', err.message);
      // Fallback if insertAdjacentElement fails
    }
  }

  // Fallback: insert at start of right controls
  try {
    if (container.firstChild) {
      container.insertBefore(controlButton, container.firstChild);
      log('Button injected at start of right controls');
    } else {
      container.appendChild(controlButton);
      log('Button appended to right controls');
    }
  } catch (err) {
    logError('Fallback insertion failed:', err.message);
    // Silent failure - button won't appear but extension won't break
  }
}

/**
 * Check if current page is a video watch page
 * @returns {boolean}
 */
function isWatchPage() {
  return window.location.pathname === '/watch';
}

/**
 * Initialize control injection with retry logic
 */
function init() {
  log('init() called');

  if (!isWatchPage()) {
    log('Not a watch page, exiting init');
    return;
  }

  // Try to inject immediately
  log('Attempting immediate injection');
  injectControl();

  // Retry with observer for dynamic loading
  const observer = new MutationObserver(() => {
    if (isWatchPage() && !document.querySelector('[data-transcript-control]')) {
      injectControl();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  log('MutationObserver set up for dynamic loading');

  // Re-inject on navigation (YouTube SPA)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      log('URL changed from', lastUrl, 'to', location.href);
      lastUrl = location.href;
      // Small delay for new page content
      setTimeout(() => {
        if (isWatchPage()) {
          log('Re-injecting after SPA navigation');
          injectControl();
        }
      }, 500);
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  log('URL observer set up for SPA navigation');
}

// Start
log('Starting initialization');
init();
