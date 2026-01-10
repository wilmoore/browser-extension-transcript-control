# PRD — Țranscript Control

---

## 1. Product Thesis

Video is a container.
Text is the asset.
Țranscript Control is a Chrome extension that asserts user ownership by enabling immediate extraction of a full YouTube video transcript with a single action and no visible UI.
**Ownership includes control over transcript provenance; the transcript source is user-defined, not platform-defined.**

The product exists to optimize for exit, not engagement. It deliberately avoids guidance, configuration, persistence, or confirmation. The user either knows why they want the transcript or they should not be using the product.

---

## 2. Core Design Principles

1. One action only.
2. Zero configuration.
3. Zero onboarding.
4. Zero persistent UI.
5. No acknowledgements, confirmations, or previews.
6. Learn once, rely on muscle memory.
7. Invisible to non-users.
8. Optimize for exit velocity over clarity.
9. Never expand scope to serve broader audiences.
10. Transcript provenance is controlled by the user, not YouTube.
11. The control must visually read as a peer to Closed Captions, not playback or settings.

---

## 3. Personas

### P-001 Power Extractor
- Roles: writer, researcher, analyst, operator
- Behavior: routinely extracts text from video to work elsewhere
- Motivation: speed, sovereignty, frictionless workflows
- Tolerance: zero patience for UI, explanations, or choices
- Exclusion: does not need help understanding transcripts

---

## 4. Input Scenarios

- User is watching or has loaded a YouTube video.
- User activates the extension control via click.
- Transcript is retrievable via a user-controlled transcript source.

Out of scope:
- Videos without transcripts.
- Live streams.
- Private or restricted videos.

---

## 5. User Journeys

### J-001 Immediate Transcript Extraction
- User notices the control.
- User clicks once.
- Full transcript is copied to clipboard.
- User exits YouTube.

No alternate paths exist.

---

## 6. UX Surface Inventory

### S-001 YouTube Player Control
- Type: Chrome extension injected control
- Location: right-side player control cluster, positioned as close as possible to the Closed Captions control
- Visibility: icon only, no label
- Interaction: single click
- Feedback: none

States:
- Default: idle
- Error: silent failure
- Success: silent success

---

## 7. Behavior and Editing Model

- Transcript is extracted in full, preserving fidelity of the user-selected source.
- Transcript text is copied directly to the clipboard.
- No local storage.
- No restrictions are imposed on transcript provenance by the product.
- No user-modifiable behavior.
- No retries, confirmations, or fallbacks.

---

## 8. Constraints and Anti-Features

### Constraints
- Chrome browser only.
- YouTube only.
- Minimal permissions.
- Lean MVP build within 2 to 4 weeks.

### Anti-Features
- No settings.
- No UI panels.
- No transcript viewer.
- No accessibility tooling.
- No analytics dashboard.
- No monetization flows.
- No onboarding or education.
- No hard-coded transcript source.

---

## 9. Success and Failure Criteria

### Success
- User installs extension.
- Uses it several times.
- Later experiences irritation when it is not available.

### Failure
- Any added option.
- Any added UI.
- Any explanation or guidance.
- Any attempt to serve non-users.
- Any acknowledgement of user uncertainty.

---

## 10. North Star

User-perceived friction when the extension is absent.

This is not measurable via conventional engagement metrics and should not be reframed as such.

---

## 11. Epics

- E-001 [MUST] Transcript Extraction Core
- E-002 [MUST] Minimal Control Injection
- E-003 [MUST] Clipboard Handling
- E-004 [WONT] Configuration and Settings
- E-005 [WONT] UI Feedback and Messaging

---

## 12. User Stories with Acceptance Criteria

### US-001 [MUST]
As a power user, I can click a control and have the full transcript copied to my clipboard.

**Acceptance Criteria**
- Given a YouTube video with a retrievable transcript,
- When I click the control,
- Then the full transcript text is placed on my clipboard.
- And no UI element appears.
- And no confirmation is shown.

---

### US-002 [MUST]
As a power user, I am not interrupted or guided during use.

**Acceptance Criteria**
- Given any state of the extension,
- When the core action is performed,
- Then no prompts, dialogs, or explanations are rendered.

---

### US-003 [MUST]
As a power user, I can rely on the control being always available.

**Acceptance Criteria**
- Given a standard YouTube video page,
- When the player loads,
- Then the control is present without user configuration.

---

## 13. Traceability Map

| Story | Epic | Journey | Screen | Priority |
|------|------|---------|--------|----------|
| US-001 | E-001 | J-001 | S-001 | MUST |
| US-002 | E-002 | J-001 | S-001 | MUST |
| US-003 | E-003 | J-001 | S-001 | MUST |

---

## 14. Lo-fi UI Mockups (ASCII)

### S-001 YouTube Player Control

Purpose: Single-action transcript extraction.

Primary action: Click icon.

```

[ ▶︎ ][ 🔊 ] … [ CC ][ Ț ][ ⚙︎ ][ ⛶ ]

```

States:
- Empty: icon present, inactive until video load
- Loading: no visible change
- Error: no visible change
- Success: no visible change

---

## 15. Decision Log

### D-001
- Question: Should there be user feedback after copy?
- Options: Silent, Toast, Modal
- Evidence: Explicitly disallowed in brief
- Winner: Silent
- Confidence: 0.95

### D-002
- Question: Should timestamps be included?
- Options: Include raw transcript, Strip timestamps
- Evidence: Fidelity optimized for downstream work
- Winner: Include raw transcript
- Confidence: 0.78, Review Suggested

### D-003
- Question: Should there be fallback UI if transcript unavailable?
- Options: Silent failure, Message
- Evidence: Zero acknowledgement principle
- Winner: Silent failure
- Confidence: 0.92

### D-004
- Question: Should transcript source be fixed to YouTube's native transcripts?
- Options: Platform-defined, User-defined
- Evidence: Product thesis prioritizes sovereignty over convenience
- Winner: User-defined
- Confidence: 0.97

---

## 16. Assumptions

- Transcript availability depends on the user-selected transcript source.
- Clipboard access is permitted by Chrome extension APIs.
- Users understand clipboard behavior.
- MVP excludes localization, analytics, monetization, and cross-browser support.

---

> **This PRD is complete.**
> Copy this Markdown into Word, Google Docs, Notion, or directly into a coding model.
