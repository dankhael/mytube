# Chrome Web Store submission kit

Everything the Developer Dashboard asks for, written out so it can be pasted in.
Keep this in sync when permissions or data handling change — the justifications
below are what a reviewer compares against the actual code.

Privacy policy source: [`docs/PRIVACY.md`](./PRIVACY.md). Public URL:
<https://github.com/dankhael/mytube/blob/master/docs/PRIVACY.md>.

---

## 1. Store listing

**Name:** `MyTube`

**Short description** (132 char max — comes from `_locales/<locale>/messages.json`,
key `appDesc`, so it is already localized; the dashboard field mirrors it):

> Your YouTube home, curated by you. Save videos into categories you control.

**Category:** Productivity
**Language:** English (with Portuguese (Brazil) as an additional listing locale)

### Detailed description

```
Watch Later became a graveyard. MyTube gives you a home page for YouTube that
you actually curate.

Browse YouTube like you always do. When a video is worth keeping, click the
"Save" button MyTube adds to the video card and drop it straight into one of
your own categories — Tutorials, Music, Cooking, whatever you decide. Then open
your MyTube home to see everything you saved, organized the way you organized it.

WHAT YOU GET

• Save from anywhere on YouTube — home feed, search results, the suggested
  sidebar, and whole playlists in one click.
• Your own categories, with your own icons. Rename, reorder, and drag videos
  between them.
• A curated home page — a clean grid of what you saved, with thumbnails,
  channel names, and durations. Nothing recommended, nothing autoplaying.
• Watched tracking — mark videos watched, hide them, and see a badge with how
  many are still waiting.
• Optional reminders — open your home when the browser starts, or show a
  dismissible nudge on the YouTube home page. Both are off until you turn them
  on.
• Search your library, jump to a category, pick your accent color, and switch
  between English and Portuguese.
• Syncs across your signed-in Chrome browsers via Chrome Sync.

WHAT IT DOESN'T DO

• It does NOT take over your new tab page. Open your home from the toolbar icon
  or with Ctrl+Shift+Y (Cmd+Shift+Y on Mac), when you want it.
• It does NOT track your browsing. On youtube.com, MyTube locally inspects
  rendered video-card metadata to place Save controls and identify videos already
  in your library. It stores a card only when you explicitly save or import it.
• It has no server, no account, and no ads. Your library is stored in your own
  browser storage and never reaches the developer.

Privacy policy: https://github.com/dankhael/mytube/blob/master/docs/PRIVACY.md
Open source: https://github.com/dankhael/mytube

MyTube is an independent project. It is not affiliated with, sponsored by, or
endorsed by YouTube or Google LLC. YouTube is a trademark of Google LLC.
```

### Detailed description (pt-BR listing locale)

```
O "Assistir mais tarde" virou um cemitério. O MyTube te dá uma home do YouTube
que você realmente cura.

Navegue pelo YouTube como sempre. Quando um vídeo valer a pena, clique no botão
"Salvar" que o MyTube adiciona ao card e jogue-o direto em uma categoria sua —
Tutoriais, Música, Receitas, o que você quiser. Depois abra sua home do MyTube e
veja tudo o que salvou, organizado do seu jeito.

O QUE VOCÊ GANHA

• Salve de qualquer lugar do YouTube — home, resultados de busca, barra lateral
  de sugestões e playlists inteiras em um clique.
• Suas próprias categorias, com seus próprios ícones. Renomeie, reordene e
  arraste vídeos entre elas.
• Uma home curada — uma grade limpa do que você salvou, com miniaturas, nome do
  canal e duração. Nada de recomendações, nada de autoplay.
• Controle de assistidos — marque, oculte e veja no ícone quantos ainda faltam.
• Lembretes opcionais — abrir sua home ao iniciar o navegador ou mostrar um
  aviso dispensável na home do YouTube. Ambos desligados por padrão.
• Busque na sua biblioteca, escolha a cor de destaque e alterne entre inglês e
  português.
• Sincroniza entre seus navegadores Chrome pelo Chrome Sync.

O QUE ELE NÃO FAZ

• NÃO substitui sua página de nova aba. Abra sua home pelo ícone da barra ou com
  Ctrl+Shift+Y (Cmd+Shift+Y no Mac).
• NÃO rastreia sua navegação. No youtube.com, o MyTube inspeciona localmente os
  metadados dos cards renderizados para posicionar os controles de Salvar e
  identificar vídeos já salvos. Um card só é armazenado quando você o salva ou
  importa explicitamente.
• Não tem servidor, conta nem anúncios. Sua biblioteca fica no armazenamento do
  seu navegador e nunca chega ao desenvolvedor.

Política de privacidade: https://github.com/dankhael/mytube/blob/master/docs/PRIVACY.md
Código aberto: https://github.com/dankhael/mytube

O MyTube é um projeto independente, sem afiliação, patrocínio ou endosso do
YouTube ou da Google LLC. YouTube é uma marca da Google LLC.
```

---

## 2. Single purpose

The dashboard requires one narrow purpose. Paste:

```
MyTube has a single purpose: to let a user save YouTube videos into categories
they define and browse those saved videos on a dedicated page. Every feature —
the Save button injected on YouTube video cards, the category management, and
the curated home page — serves that one purpose.
```

## 3. Permission justifications

Paste each into its matching field.

**`storage`**

```
MyTube stores the user's saved videos, the categories they create, and their
preferences (interface language, accent color, sound effects, reminder toggles)
in chrome.storage.sync. Without this permission the user's library would be lost
on every browser restart, which would defeat the extension's only purpose. No
data is sent anywhere; chrome.storage.sync keeps it in the user's own browser
and, if they have Chrome Sync enabled, in their own Google account.
```

**Host permission `https://www.youtube.com/*`**

```
This is the only site MyTube touches, and it needs access for two things:

1. The content script locally inspects rendered YouTube video-card metadata
   (video ID, title, channel name, duration, and thumbnail URL) to inject the
   "Save" button and show which cards are already saved. It persists a card only
   after the user explicitly clicks Save or starts a playlist import. This data
   is not sent to the developer.

2. The service worker calls YouTube's public oEmbed endpoint
   (https://www.youtube.com/oembed) to recover a video's title and channel name
   when they could not be read from the page, which happens when YouTube changes
   its DOM layout.

MyTube requests no other host and deliberately does not request the "tabs" or
"history" permissions.
```

**Remote code**

Select **No, I am not using remote code.**

```
All JavaScript is bundled in the extension package. There is no eval(), no
new Function(), no importScripts(), and no script loaded from any URL. Web
fonts are bundled locally rather than fetched from a CDN, and the extension_pages
Content Security Policy is restricted to 'self' for script and font sources.
```

## 4. Data usage certification

Check the three certification boxes (no selling, no unrelated use, no
creditworthiness use) and disclose these data types:

- **Website content** — video IDs, titles, channel names, thumbnails, durations,
  and optional channel avatars from cards the extension inspects locally. Only
  explicitly saved/imported cards are persisted.
- **User activity** — the user's explicit save, import, category, and watched
  state needed to maintain their personal library. MyTube does not collect
  general clicks, keystrokes, mouse position, or browsing history.

For both categories, state that the data is used only for the extension's single
purpose, stored in `chrome.storage.sync`, never accessible to the developer, and
not sold, shared for advertising, or used for analytics or creditworthiness.
Local processing and Chrome Sync still count as handling user data under current
Chrome Web Store disclosure rules.

---

## 5. Before you submit — checklist

1. **Privacy policy URL:** use the public rendered policy at
   <https://github.com/dankhael/mytube/blob/master/docs/PRIVACY.md> in the
   dashboard's Privacy policy URL field. Verify it remains publicly reachable
   immediately before submitting.
2. **Screenshots:** upload
   [`store-assets/home-library-1280x800.png`](./store-assets/home-library-1280x800.png)
   as the primary image and
   [`store-assets/home-welcome-1280x800.png`](./store-assets/home-welcome-1280x800.png)
   as the first-run image. Both are generated from the real packaged extension.
3. **Small promo tile:** upload
   [`store-assets/small-promo-440x280.png`](./store-assets/small-promo-440x280.png).
   Regenerate all three with `npm run store:assets` after store-facing UI changes.
4. **Build and package:**
   ```bash
   npm run build
   cd dist && zip -r ../mytube-<version>.zip . && cd ..
   ```
   Zip the **contents** of `dist/`, so `manifest.json` sits at the archive root.
   Do not ship `src/`, `test-results/`, `openspec/`, or the roadmap file.
5. **Confirm the version:** the first public package is `1.0.0`; the manifest
   reads it from `package.json`. Bump it before every later upload because the
   store rejects a version number it has already received.
6. **Verify the loaded build one last time:** `npm run test:e2e` loads the real
   `dist/` in Chromium; also open `chrome://extensions` and confirm the
   description renders in your language and no errors are listed.

## 6. What to expect from review

The `youtube.com` host permission plus a content script routes this into manual
review. First submissions commonly take several days to a couple of weeks. The
most likely questions are the two already answered above: why the host permission
is needed, and whether saved-video data leaves the device.
