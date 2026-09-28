// Every word printed on the store boards, per listing language — the boards
// themselves hold only layout. Keep HTML tags when translating: <b> = bold,
// <span class="am"> = the accent part of a headline, <code> = key chip.
// Claims must match the listing text for that language in
// docs/chrome-web-store-submission.md (e.g. the home opens from the toolbar;
// MyTube does not take over the new tab).

export const COPY = {
  en: {
    tagline: 'your youtube, curated',
    homeUrl: 'MyTube — Home',
    hero: {
      headline: 'Your YouTube, <span class="am">curated by you.</span>',
      lede: "Save videos from anywhere on YouTube into <b>your own categories</b> — and come back to a home page that's all yours.",
    },
    save: {
      kicker: 'save from anywhere',
      headline: 'One click. <span class="am">It\'s saved.</span>',
      lede: "Every video card on YouTube gets a <b>Save</b> button. Pick a category and it's in your library — no playlist juggling, no Watch Later pile.",
      points: [
        '<b>Search, home feed, sidebar</b> and the watch page',
        '<b>Whole playlists</b> in one click',
        'Make a <b>new category</b> right from the menu',
      ],
    },
    organize: {
      kicker: 'your categories',
      headline: 'Organize it <span class="am">your way.</span>',
      lede: 'Your own categories with your own icons. Create one in seconds, and <b>move any video</b> between them in two clicks.',
    },
    home: {
      kicker: 'no algorithm',
      headline: 'A home page with <span class="am">nothing recommended.</span>',
      lede: 'Open it from the toolbar or with <code>Ctrl+Shift+Y</code>. Just what you saved — search it, filter it, watch it.',
      points: [
        '<b>Watched tracking</b> and an unwatched badge',
        'Opt-in <b>reminders</b> — off until you turn them on',
        '<b>Syncs</b> across your signed-in Chrome browsers',
      ],
    },
    yours: {
      kicker: 'make it yours',
      headline: 'Your colors. <span class="am">Your library.</span>',
      lede: 'Pick an accent, go retro with the <b>CRT skin</b>, switch between English and Portuguese. Your library lives in <b>your own browser storage</b>.',
      looks: ['mint', 'amber', 'pink', 'crt skin'],
      trust: ['no account', 'no server', 'no ads', 'open source'],
    },
    tile: { line: 'Your YouTube home,<br>curated by you.', small: 'save · organize · watch' },
    banner: {
      headline: 'Your YouTube home, <span>curated by you.</span>',
      lede: 'Save videos into your own categories. Come back to a home page with nothing recommended.',
      chips: ['chrome extension', 'no account', 'no ads'],
    },
    cover: {
      chip: 'chrome extension',
      headline: 'Watch Later became a <span>graveyard.</span>',
      foot: 'Free on the Chrome Web Store',
    },
    marquee: {
      headline: 'Your YouTube, <span class="am">curated by you.</span>',
      lede: 'Save videos into <b>your own categories</b>. Come back to a home page with nothing recommended.',
    },
  },
  'pt-BR': {
    tagline: 'seu youtube, do seu jeito',
    homeUrl: 'MyTube — Início',
    hero: {
      headline: 'Seu YouTube, <span class="am">curado por você.</span>',
      lede: 'Salve vídeos de qualquer lugar do YouTube em <b>categorias suas</b> — e volte para uma home que é só sua.',
    },
    save: {
      kicker: 'salve de qualquer lugar',
      headline: 'Um clique. <span class="am">Salvo.</span>',
      lede: 'Todo card de vídeo no YouTube ganha um botão <b>Salvar</b>. Escolha a categoria e pronto — sem malabarismo com playlists, sem pilha no Assistir mais tarde.',
      points: [
        '<b>Busca, feed, barra lateral</b> e a página do vídeo',
        '<b>Playlists inteiras</b> com um clique',
        'Crie uma <b>nova categoria</b> direto no menu',
      ],
    },
    organize: {
      kicker: 'suas categorias',
      headline: 'Organize <span class="am">do seu jeito.</span>',
      lede: 'Categorias suas, com ícones seus. Crie uma em segundos e <b>mova qualquer vídeo</b> entre elas em dois cliques.',
    },
    home: {
      kicker: 'sem algoritmo',
      headline: 'Uma home <span class="am">sem recomendações.</span>',
      lede: 'Abra pela barra do navegador ou com <code>Ctrl+Shift+Y</code>. Só o que você salvou — busque, filtre, assista.',
      points: [
        '<b>Marque como assistido</b> e veja no ícone quantos faltam',
        '<b>Lembretes</b> opcionais — desligados até você ativar',
        '<b>Sincroniza</b> entre seus navegadores Chrome conectados',
      ],
    },
    yours: {
      kicker: 'deixe com a sua cara',
      headline: 'Suas cores. <span class="am">Sua biblioteca.</span>',
      lede: 'Escolha uma cor, vá de retrô com o <b>tema CRT</b>, alterne entre português e inglês. Sua biblioteca fica no <b>armazenamento do seu navegador</b>.',
      looks: ['menta', 'âmbar', 'rosa', 'tema crt'],
      trust: ['sem conta', 'sem servidor', 'sem anúncios', 'código aberto'],
    },
    tile: { line: 'Sua home do YouTube,<br>curada por você.', small: 'salve · organize · assista' },
    banner: {
      headline: 'Sua home do YouTube, <span>curada por você.</span>',
      lede: 'Salve vídeos em categorias suas. Volte para uma home sem nenhuma recomendação.',
      chips: ['extensão do chrome', 'sem conta', 'sem anúncios'],
    },
    cover: {
      chip: 'extensão do chrome',
      headline: 'O Assistir mais tarde virou um <span>cemitério.</span>',
      foot: 'Grátis na Chrome Web Store',
    },
    marquee: {
      headline: 'Seu YouTube, <span class="am">curado por você.</span>',
      lede: 'Salve vídeos em <b>categorias suas</b>. Volte para uma home sem nenhuma recomendação.',
    },
  },
}
