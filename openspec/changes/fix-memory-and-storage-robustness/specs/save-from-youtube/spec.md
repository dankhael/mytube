## ADDED Requirements

### Requirement: Scanning pauses on hidden tabs

The content script's DOM scan scheduling SHALL be gated on page visibility:
while `document.hidden` is true, mutation bursts MUST NOT schedule scan work.
On the tab becoming visible again, one catch-up scan MUST run so injected
buttons reflect whatever changed while hidden — visible behavior is identical
to scanning continuously.

#### Scenario: Hidden tab schedules no scans
- **WHEN** YouTube mutates the DOM in a backgrounded (hidden) tab
- **THEN** no scan pass is scheduled and no per-burst allocation work happens

#### Scenario: Catch-up on becoming visible
- **WHEN** a hidden YouTube tab becomes visible again
- **THEN** a scan runs and any cards added while hidden get their save buttons

### Requirement: Click saves the currently-bound video

Clicking an injected save button SHALL act on the video *currently* rendered in
the host card, not a snapshot captured at injection time. YouTube recycles
renderer nodes (continuations, back/forward navigation), so the click handler
MUST re-extract the card's data at click time and use the inject-time data only
as a fallback when re-extraction fails.

#### Scenario: Recycled card saves the new video
- **WHEN** YouTube rebinds an already-injected renderer node to a different video and the user clicks its save button
- **THEN** the video currently shown in the card is saved, not the one the node displayed at injection time

#### Scenario: Fallback when re-extraction fails
- **WHEN** the click-time re-extraction throws or yields nothing
- **THEN** the inject-time data is used, preserving today's behavior for non-recycled cards

### Requirement: Orphaned content script tears itself down

The content script's message wrapper SHALL survive orphaning: when the
extension is reloaded or updated, already-injected content scripts are orphaned
and `chrome.runtime.sendMessage` throws "Extension context
invalidated". The wrapper SHALL catch this, resolve
`{ ok: false, error }` (never an unhandled rejection), and run a teardown that
disconnects the `MutationObserver`, removes all injected UI (buttons, dropdown,
toast), and detaches its document-level listeners. A transient
`runtime.lastError` (service-worker restart) MUST map to `{ ok: false }`
without tearing down.

#### Scenario: Orphaned script stops working quietly
- **WHEN** the extension is reloaded while a YouTube tab with injected buttons is open, and the user interacts with the page
- **THEN** no unhandled promise rejection is thrown, the observer is disconnected, and injected MyTube UI is removed

#### Scenario: Transient worker restart does not tear down
- **WHEN** `sendMessage` completes with `chrome.runtime.lastError` set (worker restarting) rather than a synchronous context-invalidated throw
- **THEN** the call resolves `{ ok: false, error }` and the content script keeps operating normally
