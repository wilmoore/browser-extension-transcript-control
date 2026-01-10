/**
 * Content script for Transcript Control
 * Injects control button into YouTube player and handles transcript extraction
 */

// Load transcript module into page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/transcript.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

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
  try {
    // Request transcript from page script
    const transcript = await requestTranscript();
    if (transcript) {
      // Copy to clipboard silently
      await navigator.clipboard.writeText(transcript);
    }
    // No feedback per design spec (ADR-002)
  } catch {
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

    const handler = (event) => {
      if (event.data?.type === 'TRANSCRIPT_RESULT' && event.data?.messageId === messageId) {
        window.removeEventListener('message', handler);
        if (event.data.error) {
          resolve(null);
        } else {
          resolve(event.data.transcript);
        }
      }
    };

    window.addEventListener('message', handler);

    // Send request to page script (transcript.js listens for this)
    window.postMessage({ type: 'GET_TRANSCRIPT', messageId }, '*');

    // Timeout after 15 seconds
    setTimeout(() => {
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
  return document.querySelector('.ytp-right-controls');
}

/**
 * Find the CC button to position near
 * @returns {Element|null}
 */
function findCCButton() {
  return document.querySelector('.ytp-subtitles-button');
}

/**
 * Inject the control button into YouTube player
 * Uses safe DOM insertion that handles various YouTube layouts
 */
function injectControl() {
  // Already injected
  if (document.querySelector('[data-transcript-control]')) {
    return;
  }

  const container = findControlsContainer();
  if (!container) {
    return;
  }

  controlButton = createControlButton();
  const ccButton = findCCButton();

  // Strategy: Insert before CC button (to the left of it), otherwise at start of right controls
  if (ccButton) {
    // Use insertAdjacentElement for safer insertion regardless of parent structure
    try {
      ccButton.insertAdjacentElement('beforebegin', controlButton);
      return;
    } catch {
      // Fallback if insertAdjacentElement fails
    }
  }

  // Fallback: insert at start of right controls
  try {
    if (container.firstChild) {
      container.insertBefore(controlButton, container.firstChild);
    } else {
      container.appendChild(controlButton);
    }
  } catch {
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
  if (!isWatchPage()) {
    return;
  }

  // Try to inject immediately
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

  // Re-inject on navigation (YouTube SPA)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Small delay for new page content
      setTimeout(() => {
        if (isWatchPage()) {
          injectControl();
        }
      }, 500);
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start
init();
