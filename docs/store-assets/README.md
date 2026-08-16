# Chrome Web Store assets

Generated from the packaged extension with:

```bash
npm run store:assets
```

- `home-library-1280x800.png` — primary listing screenshot showing the real populated home UI.
- `home-welcome-1280x800.png` — secondary listing screenshot showing first-run empty state.
- `small-promo-440x280.png` — branded small promotional tile.

Regenerate these after any material store-facing UI or branding change. Review the
images before upload; the generator uses public YouTube thumbnail URLs only as
sample visual content and writes its seed data into a temporary browser profile.
