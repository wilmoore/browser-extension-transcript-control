# 003. YouTube Player Control Positioning

Date: 2026-01-10

## Status

Accepted

## Context

The PRD specifies the control must be "positioned as close as possible to the Closed Captions control" and "visually read as a peer to Closed Captions, not playback or settings."

YouTube's player control structure uses `.ytp-right-controls` container which includes CC button, settings, miniplayer, and fullscreen controls.

## Decision

1. **Position**: Insert button immediately after CC button (`.ytp-subtitles-button`) in the right controls container
2. **Visual style**: Match CC button aesthetic with bordered rectangle containing "Ț" character
3. **Fallback**: If CC button not found or not direct child, insert at start of right controls

Key implementation detail: Check `parentElement === container` before using `insertBefore` to avoid DOM errors when CC button is in nested structure.

## Consequences

**Positive:**
- Button appears adjacent to CC as intended
- Visual consistency with YouTube's native controls
- Graceful fallback for edge cases

**Negative:**
- YouTube DOM structure changes could break positioning
- Must handle SPA navigation re-injection
- Icon centering required manual adjustment for Ț cedilla

## Alternatives Considered

1. **Insert before settings gear** - Rejected as too far from CC
2. **Append to end of controls** - Rejected as not "peer to CC"
3. **Create floating overlay** - Rejected as not native look

## Related

- Planning: `.plan/.done/mvp-transcript-control/`
- PRD Section 6: "Location: right-side player control cluster, positioned as close as possible to the Closed Captions control"
