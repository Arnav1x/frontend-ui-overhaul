The shared selector engine is already the hardest reusable piece.

  A minimal proof could be:

  1. Add a Start recording / Stop recording toggle in a development console.
  2. Install a fixed product-owned listener in the embedded page for manual clicks.
  3. On a click, capture the actual event target with the same selector strategy and uniqueness checks.
  4. Append/display a step like:

  {
    "action": "click",
    "selector": {
      "kind": "css",
      "value": "#...",
      "strategy": "id"
    }
  }

  The main work is not selector generation—it is safely transporting manual browser events from the embedded page through BrowserSession, and deciding semantics for text input:

  - Clicks: straightforward proof.
  - Fill: record on change/blur rather than every keystroke; mask sensitive fields.
  - Navigation: detect completed navigations without duplicating click steps.
  - Avoid recording TestGen’s own automation actions when recording is not active.

  So I would treat click-only manual recording in a developer console as a small, realistic proof slice. A production manual-recording mode with fills, navigation, editing, review, persistence, and AI handoff
  is a separate milestone.