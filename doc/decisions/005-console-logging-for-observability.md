# 005. Console Logging for Observability

Date: 2026-01-11

## Status

Accepted

## Context

ADR-002 established silent operation design with no UI feedback. While this serves the power-user UX goal, it makes debugging impossible when issues arise. Users report "nothing happens" with no way to verify if the extension is working or diagnose failures.

## Decision

Add comprehensive console logging throughout the extension lifecycle while maintaining ADR-002 compliance (no UI feedback).

Logging conventions:
- **Prefix**: `[TranscriptControl:{module}]` for easy filtering
  - `[TranscriptControl:content]` - Content script operations
  - `[TranscriptControl:transcript]` - Transcript module operations
- **Levels**: `console.log` for info, `console.error` for errors
- **Scope**: All significant operations logged:
  - Script injection lifecycle
  - Button creation and injection
  - Message passing events
  - API calls and responses
  - Transcript parsing
  - Clipboard operations

```javascript
const LOG_PREFIX = '[TranscriptControl:content]';

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}
```

## Consequences

### Positive

- Debugging possible via DevTools console
- Users can verify extension is working
- Root cause analysis is straightforward
- E2E tests can verify logging behavior
- Maintains ADR-002 compliance (no UI feedback)

### Negative

- Console output in production (acceptable per ADR-002)
- Slight performance overhead (negligible)
- Users need to know to check DevTools

## Alternatives Considered

### 1. Build-time logging toggle
Rejected: Adds build complexity, testing would differ from production.

### 2. Background page logging
Rejected: Would require additional permission, more complex architecture.

### 3. Optional UI toast for developers
Rejected: Violates ADR-002, creates two UX modes to maintain.

## Related

- ADR-002: Silent Operation Design
- Planning: `.plan/.done/fix-transcript-no-debug-feedback/`
