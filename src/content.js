/**
 * Content script for Transcript Control
 * Injects control button into YouTube player and handles transcript extraction
 */

// Load transcript module
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

  // SVG icon - bordered Ț to match CC button style
  button.innerHTML = `
    <svg height="100%" viewBox="0 0 36 36" width="100%">
      <rect x="9" y="9" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
      <text x="18" y="18" text-anchor="middle" dominant-baseline="central" font-family="Roboto, Arial, sans-serif" font-size="12" font-weight="500" fill="currentColor">Ț</text>
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
    // Get transcript from injected page script
    const transcript = await new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data.type === 'TRANSCRIPT_RESULT') {
          window.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.transcript);
          }
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'GET_TRANSCRIPT' }, '*');

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Transcript request timeout'));
      }, 10000);
    });

    // Copy to clipboard silently
    await navigator.clipboard.writeText(transcript);
    // No feedback per design spec
  } catch {
    // Silent failure per design spec
  }
}

/**
 * Find the YouTube player controls container
 * @returns {Element|null}
 */
function findControlsContainer() {
  // Right controls container where CC button lives
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

  // Insert after CC button if present and is direct child of container
  const ccButton = findCCButton();
  if (ccButton && ccButton.parentElement === container && ccButton.nextSibling) {
    container.insertBefore(controlButton, ccButton.nextSibling);
  } else if (ccButton && ccButton.parentElement === container) {
    // CC button is last child, append after it
    ccButton.after(controlButton);
  } else {
    // Fallback: insert at start of right controls
    container.insertBefore(controlButton, container.firstChild);
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

// Message handler for transcript requests from page script
window.addEventListener('message', async (event) => {
  if (event.data.type === 'GET_TRANSCRIPT') {
    try {
      // Access page-level TranscriptControl via eval in page context
      const result = await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.textContent = `
          (async () => {
            try {
              const transcript = await window.TranscriptControl.getTranscript();
              window.postMessage({ type: 'TRANSCRIPT_RESULT', transcript }, '*');
            } catch (err) {
              window.postMessage({ type: 'TRANSCRIPT_RESULT', error: err.message }, '*');
            }
          })();
        `;
        document.documentElement.appendChild(script);
        script.remove();
      });
    } catch (err) {
      window.postMessage({ type: 'TRANSCRIPT_RESULT', error: err.message }, '*');
    }
  }
});

// Start
init();
