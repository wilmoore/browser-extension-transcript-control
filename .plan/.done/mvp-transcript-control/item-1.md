# Item #1: Transcript Extraction Core

## Epic
E-001: Core functionality to extract full transcript from YouTube video.

## Requirements
- Transcript is extracted in full, preserving fidelity of the user-selected source
- Transcript text is copied directly to the clipboard
- No local storage
- No restrictions are imposed on transcript provenance by the product

## Implementation Approach
1. Create Chrome extension manifest (Manifest V3)
2. Content script to inject into YouTube pages
3. Fetch transcript from YouTube's internal API (timedtext endpoint)
4. Parse and extract text from transcript response
5. Handle various transcript formats (auto-generated, manual, multi-language)

## Files
- manifest.json - Extension configuration
- src/content.js - Main content script
- src/transcript.js - Transcript extraction logic
