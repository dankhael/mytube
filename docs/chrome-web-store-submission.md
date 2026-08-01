# Chrome Web Store submission kit

Everything the Developer Dashboard asks for, written out so it can be pasted in.
Keep this in sync when permissions or data handling change — the justifications
below are what a reviewer compares against the actual code.

Privacy policy source: [`docs/PRIVACY.md`](./PRIVACY.md). It must be reachable at
a **public URL** before submitting (see "Before you submit", step 1).

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
• It does NOT track your browsing. MyTube only reads the video cards you
  explicitly choose to save, and only on youtube.com.
• It has no server, no account, and no ads. Your library is stored in your own
  browser storage and never reaches the developer.

Privacy policy: <PRIVACY_POLICY_URL>
Open source: https://github.com/dankhael/mytube

MyTube is an independent project. It is not affiliated with, sponsored by, or
endorsed by YouTube or Google LLC. YouTube is a trademark of Google LLC.
```

> Replace `<PRIVACY_POLICY_URL>` with the hosted URL from step 1 before pasting.

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
• NÃO rastreia sua navegação. O MyTube só lê os cards que você escolhe salvar, e
  apenas no youtube.com.
• Não tem servidor, conta nem anúncios. Sua biblioteca fica no armazenamento do
  seu navegador e nunca chega ao desenvolvedor.

Política de privacidade: <PRIVACY_POLICY_URL>
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

1. The content script injects the "Save" button into YouTube video cards (home
   feed, search results, suggested sidebar, playlist pages) and reads that
   specific card's video ID, title, channel name, duration, and thumbnail URL
   when the user clicks Save. Nothing is read unless the user clicks.

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
creditworthiness use) and **do not tick any data-type category**.

Rationale, in case a reviewer asks: the Chrome Web Store defines "collect" as
transmitting data off the user's device to the developer or a third party.
MyTube has no server and transmits nothing. The saved-video list stays in
`chrome.storage.sync`; where Chrome Sync replicates it, that is Chrome moving the
user's data within the user's own Google account, not collection by this
developer.

If a reviewer pushes back and insists the saved list counts as "user activity" or
"website content," the honest amendment is to tick **Website content** and note in
the privacy-policy field that it is stored locally and never transmitted to the
developer — do not weaken the accurate privacy policy to match a checkbox.

---

## 5. Before you submit — checklist

1. **Host the privacy policy.** Enable GitHub Pages on `dankhael/mytube` (or
   commit `docs/PRIVACY.md` and use the rendered GitHub URL). Then substitute the
   real URL into both detailed descriptions above and paste it into the
   dashboard's Privacy policy URL field. A host permission without a reachable
   privacy policy URL is a routine rejection.
2. **Screenshots** — at least one, 1280×800 or 640×400 PNG/JPEG. Suggested set:
   (a) the curated home with several populated categories, (b) the Save dropdown
   open on a YouTube card, (c) the settings modal, (d) the popup. Avoid showing
   YouTube's logo as the visual focus of the first screenshot.
3. **Optional but recommended:** 440×280 small promo tile.
4. **Build and package:**
   ```bash
   npm run build
   cd dist && zip -r ../mytube-<version>.zip . && cd ..
   ```
   Zip the **contents** of `dist/`, so `manifest.json` sits at the archive root.
   Do not ship `src/`, `test-results/`, `openspec/`, or the roadmap file.
5. **Bump `version` in `package.json`** — the manifest version is read from it,
   and the store rejects re-uploads of an existing version number. Consider
   `1.0.0` for the first public release.
6. **Verify the loaded build one last time:** `npm run test:e2e` loads the real
   `dist/` in Chromium; also open `chrome://extensions` and confirm the
   description renders in your language and no errors are listed.

## 6. What to expect from review

The `youtube.com` host permission plus a content script routes this into manual
review. First submissions commonly take several days to a couple of weeks. The
most likely questions are the two already answered above: why the host permission
is needed, and whether saved-video data leaves the device.
