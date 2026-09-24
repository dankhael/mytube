# MyTube promo — narration script

Voice-over lines for the promo cuts (both ~64 s, silent, same timeline):
`build/promo-video/mytube-promo-1080p.mp4` (1920×1080, YouTube / store listing)
and `build/promo-video/mytube-promo-vertical.mp4` (1080×1920, Shorts / Reels /
TikTok). One narration and music mix fits both.

Generate the cut with `npm run promo:video`; `build/promo-video/timeline.txt`
lists where each scene starts. If a retake shifts the timings, re-read it and
nudge the lines to match.

Each line fits its scene at a relaxed pace (~2.3 words/s in EN, a little less
in PT-BR). Start each line ~0.3 s after the scene begins so it lands with the
caption rather than on the cross-fade.

| Time | Scene | On-screen caption | EN narration | PT-BR narration |
|---|---|---|---|---|
| 0:00 | intro | MyTube — Your YouTube home, curated by you. | "Meet MyTube: your YouTube home, curated by you." | "Conheça o MyTube: a sua home do YouTube, do seu jeito." |
| 0:03 | yt-save | Save any YouTube video in one click | "Found something worth watching? Hit Save and pick a category — done." | "Achou um vídeo bom? Clique em Salvar, escolha a categoria, pronto." |
| 0:09 | home-library | Your new tab becomes your own YouTube home | "Every new tab opens your library — no algorithm, just what you chose to keep." | "Cada nova aba abre a sua biblioteca — sem algoritmo, só o que você escolheu guardar." |
| 0:16 | home-search | Find anything instantly | "Looking for something? Just type." | "Procurando algo? É só digitar." |
| 0:21 | home-category | Organize with your own categories | "Create categories that fit the way you watch, with an icon for each." | "Crie categorias do seu jeito, cada uma com o seu ícone." |
| 0:29 | home-move | Move videos where they belong | "Changed your mind? Move any video in two clicks." | "Mudou de ideia? Mova qualquer vídeo em dois cliques." |
| 0:37 | popup | Your library, one click from the toolbar | "Your whole library is also one click away, right from the toolbar." | "E a biblioteca inteira fica a um clique, direto na barra do navegador." |
| 0:45 | yt-reminder | Gentle reminders for what you saved | "And if you want, MyTube gently reminds you of what's waiting." | "Se quiser, o MyTube te lembra, sem insistir, do que está esperando por você." |
| 0:51 | home-theme | Make it yours: accent colors and a retro CRT skin | "Make it yours — pick an accent color, or go full retro with the CRT skin." | "Deixe com a sua cara: escolha uma cor, ou vá de retrô com o tema CRT." |
| 1:00 | outro | MyTube — Free on the Chrome Web Store | "MyTube. Free on the Chrome Web Store." | "MyTube. Grátis na Chrome Web Store." |

## Shorter variant (captions carry the detail)

Some promos are music-first, with the voice kept to the bookends. For that cut,
use only:

- **0:00 (EN)** "Your YouTube, organized your way." / **(PT-BR)** "Seu YouTube, organizado do seu jeito."
- **1:00 (EN)** "MyTube. Free on the Chrome Web Store." / **(PT-BR)** "MyTube. Grátis na Chrome Web Store."

## Mixing notes

- **Music under voice:** duck the track to about −18 dB under the narration
  (sidechain or manual keyframes), and back up to about −10 dB in the gaps and
  over the outro.
- **Loudness:** export at around −14 LUFS integrated (YouTube's normalization
  target), true peak ≤ −1 dBTP.
- **Endings:** start the music on the first frame, and fade it out over the
  last ~1.5 s of the outro card.
- **Music licensing:** use CC0 tracks, or tracks from the YouTube Audio
  Library, to avoid Content ID claims. For CC BY tracks (e.g. Kevin MacLeod /
  incompetech), put the credit line in the video description.
- **Mux without re-encoding the picture:**
  `ffmpeg -i mytube-promo-1080p.mp4 -i mix.wav -c:v copy -c:a aac -b:a 192k -shortest mytube-promo-final.mp4`
