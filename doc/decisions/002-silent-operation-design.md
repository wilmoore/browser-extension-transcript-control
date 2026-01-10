# 002. Silent Operation Design

Date: 2026-01-10

## Status

Accepted

## Context

The PRD explicitly requires zero UI feedback - no toasts, confirmations, or error messages. This is a deliberate design choice to optimize for "exit velocity" and serve power users who understand clipboard behavior.

## Decision

Implement completely silent operation:
- **Success**: Copy to clipboard with no visual feedback
- **Failure**: Catch all errors silently, no user notification
- **Loading**: No spinners or state changes

```javascript
try {
  await navigator.clipboard.writeText(transcript);
  // No feedback per design spec
} catch {
  // Silent failure per design spec
}
```

## Consequences

**Positive:**
- Zero cognitive load for users
- Muscle memory-friendly operation
- No UI elements to maintain
- Matches PRD anti-features (no UI feedback/messaging)

**Negative:**
- Users won't know if operation failed
- Debugging is harder without visible errors
- May confuse users unfamiliar with the extension

## Alternatives Considered

1. **Subtle toast notification** - Rejected per PRD "no acknowledgements, confirmations, or previews"
2. **Button state change** - Rejected per PRD "no visible change" for all states
3. **Console logging** - Acceptable for development but should be removed for production

## Related

- Planning: `.plan/.done/mvp-transcript-control/`
- PRD Section 6: "States: Error: silent failure, Success: silent success"
