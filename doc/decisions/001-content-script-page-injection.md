# 001. Use Content Script with Page Script Injection

Date: 2026-01-10

## Status

Accepted

## Context

Chrome extensions need to access YouTube's internal player data (`ytInitialPlayerResponse`) to retrieve transcript URLs. Content scripts run in an isolated world and cannot directly access page-level JavaScript variables.

## Decision

Use a two-layer architecture:
1. **Content script** (`content.js`) - Handles DOM manipulation, button injection, and clipboard operations
2. **Injected page script** (`transcript.js`) - Runs in page context to access `window.ytInitialPlayerResponse` and fetch transcripts

Communication between layers uses `window.postMessage()` with typed message events.

## Consequences

**Positive:**
- Full access to YouTube's player data without complex workarounds
- Clean separation of concerns between DOM and data layers
- Reliable transcript extraction from YouTube's internal API

**Negative:**
- Requires `web_accessible_resources` in manifest for the injected script
- Message passing adds slight complexity
- Two files to maintain instead of one

## Alternatives Considered

1. **Fetch transcript from external API** - Rejected due to reliability concerns and added network dependency
2. **Parse DOM for transcript** - Rejected as YouTube doesn't expose transcript in DOM without user interaction
3. **Use background script** - Rejected as it still can't access page context

## Related

- Planning: `.plan/.done/mvp-transcript-control/`
