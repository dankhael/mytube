# Release readiness

Last verified: **16 August 2026**

## Release candidate

- Version: `1.0.0`
- Manifest: V3
- Required permissions: `storage`, `https://www.youtube.com/*`
- Production and development dependency audit: 0 known vulnerabilities
- Unit/component tests: 225 passed across 32 files
- Production build: TypeScript and Vite passed
- Packaged-extension smoke: passed in real Chromium
- Live YouTube smoke: search-card Save control, category picker, save toast,
  saved item on the curated home, and `/watch` action-bar control all passed
- Store artwork: two 1280×800 screenshots and one 440×280 promo tile generated
- Upload archive: `release/mytube-1.0.0.zip` validated with `manifest.json` at
  the archive root

## Before clicking Submit for Review

These require the Chrome Web Store account or a final human visual pass:

- Commit and publish the updated privacy policy before using its `master` URL.
- Upload the ZIP and the three files under `docs/store-assets/`.
- Paste the listing, single-purpose, permission, remote-code, and data-use answers
  from `docs/chrome-web-store-submission.md` into the Developer Dashboard.
- Confirm **Website content** and **User activity** are disclosed in the Privacy
  tab and complete the Limited Use certifications.
- Load the exact release ZIP once in regular Chrome, check `chrome://extensions`
  for errors, and visually sample playlist import, settings persistence, and
  English/Portuguese switching.
- Choose distribution regions and submit with deferred publishing if you want a
  final approval-to-publish checkpoint after review.

The product name `MyTube` remains a publisher decision. The listing already says
the extension is independent and not endorsed by YouTube; consider a more
distinctive name if you want to minimize trademark or store-discoverability risk.
