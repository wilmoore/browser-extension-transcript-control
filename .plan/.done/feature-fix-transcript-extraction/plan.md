# Feature: Fix Transcript Extraction

## Branch
`feature/fix-transcript-extraction`

## Problem Statement
The transcript control button clicks but nothing happens. Investigation revealed three issues:

1. **Button injection fails** - DOM error at `content.js:113` when trying to insert button next to CC button
2. **Message passing is broken** - Circular message loop; `transcript.js` never listens for messages
3. **Transcript fetch returns empty** - YouTube's `ytInitialPlayerResponse` caption URLs now include `exp=xpe` requiring PoToken authentication

## Root Cause Analysis

### Issue 1: Button Injection DOM Error
```
NotFoundError: Failed to execute 'insertBefore' on 'Node':
The node before which the new node is to be inserted is not a child of this node.
```
The CC button's `nextSibling` may not be a direct child of the controls container (could be nested).

### Issue 2: Message Passing Architecture
- `handleClick()` sends `GET_TRANSCRIPT` via postMessage
- The content script message handler at line 176 catches this
- It injects an inline script to call `TranscriptControl.getTranscript()`
- But the Promise at line 180-194 never resolves because the inline script result isn't captured

### Issue 3: PoToken Requirement (Critical)
- YouTube now adds `exp=xpe` parameter to caption URLs from web client
- This indicates a PoToken is required for authentication
- The `timedtext` endpoint returns empty content (status 200, content-length 0)
- **Solution**: Use Android client context which doesn't require PoToken

## Verified Solution
Using the Innertube API with Android client context:
```javascript
const androidContext = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '19.09.37',
    androidSdkVersion: 30,
    hl: 'en',
    gl: 'US'
  }
};

// POST to /youtubei/v1/player?key={INNERTUBE_API_KEY}
// Response contains caption tracks without exp=xpe
```

## XML Format Discovery
The transcript XML uses `<p>` tags (not `<text>` as previously assumed):
```xml
<?xml version="1.0"?>
<timedtext>
  <body>
    <p t="1000" d="5000">Caption text here</p>
  </body>
</timedtext>
```
- `t` = start time in milliseconds
- `d` = duration in milliseconds

## Implementation Steps

### Step 1: Fix button injection (content.js)
- Use safer DOM insertion that doesn't assume sibling relationships
- Add null checks and fallback positioning

### Step 2: Simplify architecture - remove message passing
- Have click handler directly invoke injected script
- Remove broken message listener loop

### Step 3: Update transcript.js for Android client
- Use Innertube API with Android client context
- Get API key from `window.ytcfg.data_.INNERTUBE_API_KEY`
- Parse XML format with `<p t="" d="">` structure
- Decode HTML entities in text

### Step 4: Handle Trusted Types
- YouTube has Trusted Types policy
- Use regex parsing instead of DOMParser for XML
- Or use fetch in page context to avoid policy issues

## Test Plan
1. Load extension on YouTube video with captions
2. Verify button appears in player controls
3. Click button and verify clipboard contains transcript
4. Test on videos with:
   - Human captions (English)
   - Auto-generated captions
   - Multiple language tracks
   - Music videos (special character handling)

## References
- ADR-001: Content Script with Page Script Injection
- ADR-002: Silent Operation Design
- Reference project: `/Users/wilmooreiii/Documents/src/clear-transcript`
- [youtube-transcript-api library](https://github.com/jdepoix/youtube-transcript-api)

## Sources
- [YouTube Innertube API Guide 2025](https://medium.com/@aqib-2/extract-youtube-transcripts-using-innertube-api-2025-javascript-guide-dc417b762f49)
- [youtube-transcript-api Python library](https://pypi.org/project/youtube-transcript-api/)

## Related ADRs
- [ADR-004: Android Client Context for PoToken Bypass](../../doc/decisions/004-android-client-potoken-bypass.md)
