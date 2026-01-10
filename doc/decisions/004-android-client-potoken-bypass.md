# 004. Android Client Context for PoToken Bypass

Date: 2026-01-10

## Status

Accepted

## Context

YouTube updated their caption/transcript endpoints to require PoToken authentication for web client requests. URLs from `ytInitialPlayerResponse` now include an `exp=xpe` parameter, and fetching these URLs returns empty content (HTTP 200, content-length 0) without proper authentication.

The PoToken (Proof of Origin Token) is a complex authentication mechanism that:
- Requires bot detection challenges to generate
- Changes frequently and is tied to browser sessions
- Is difficult to replicate in extension contexts

## Decision

Use the YouTube Innertube API with Android client context instead of web client context. The Android client does not require PoToken authentication.

```javascript
const ANDROID_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '19.09.37',
    androidSdkVersion: 30,
    hl: 'en',
    gl: 'US'
  }
};

// POST to /youtubei/v1/player?key={INNERTUBE_API_KEY}
fetch(`/youtubei/v1/player?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    context: ANDROID_CONTEXT,
    videoId
  }),
  credentials: 'include'
});
```

The API key is obtained from YouTube's page configuration: `window.ytcfg.data_.INNERTUBE_API_KEY`.

## Consequences

### Positive

- Reliably retrieves transcript data without authentication complexity
- No dependency on bot detection or session management
- Works consistently across all videos with available captions
- Future-proof against web client authentication changes

### Negative

- Depends on YouTube continuing to support Android client without PoToken
- Client version may need updates if YouTube deprecates older versions
- Relies on undocumented internal API behavior

## Alternatives Considered

### 1. Implement PoToken generation
Rejected: Too complex, requires solving bot detection challenges, and would be fragile.

### 2. Use ytInitialPlayerResponse directly
Rejected: URLs include `exp=xpe` parameter requiring PoToken; returns empty content.

### 3. Use YouTube's public Transcript API
Rejected: No official public API exists for transcript extraction.

### 4. Parse transcript from DOM (UI scraping)
Rejected: Fragile, requires opening transcript panel, slower, and inconsistent.

## Related

- Planning: `.plan/.done/feature-fix-transcript-extraction/`
- ADR-001: Content Script with Page Script Injection
- Source: [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api)
