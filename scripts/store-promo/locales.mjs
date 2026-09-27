// Per-language capture settings for the store stills: browser/YouTube
// language, the extension's UI strings the capture has to find on screen, and
// the library's category names. The seed (store-assets/seed.mjs) is English;
// a non-English locale renames the categories afterwards with UPDATE_CATEGORY —
// something any user can do — because the default categories ship with fixed
// English names (src/types.ts DEFAULT_DATA) whatever the interface language.

const SEARCH_QUERY = 'blender+open+movie'

export const CAPTURE_LOCALES = {
  en: {
    browserLocale: 'en-US',
    youtubeHl: 'en',
    searchUrl: `https://www.youtube.com/results?search_query=${SEARCH_QUERY}&hl=en&gl=US`,
    homeUrl: 'https://www.youtube.com/?hl=en&gl=US',
    ui: {
      welcome: 'Welcome back.',
      categoryButton: /^Category$/,
      create: 'Create',
      search: /search your library/i,
      namePlaceholder: /react tutorials/i,
      moveHeading: /move video to/i,
    },
    language: 'en',
    renames: {},
    newCategory: 'Blender Films',
    saveInto: 'Design',
    popupOpen: ['Design', 'Music'],
  },
  'pt-BR': {
    browserLocale: 'pt-BR',
    youtubeHl: 'pt-BR',
    searchUrl: `https://www.youtube.com/results?search_query=${SEARCH_QUERY}&hl=pt-BR&gl=BR`,
    homeUrl: 'https://www.youtube.com/?hl=pt-BR&gl=BR',
    ui: {
      welcome: 'Bem-vindo de volta.',
      categoryButton: /^Categoria$/,
      create: 'Criar',
      search: /buscar na biblioteca/i,
      namePlaceholder: /tutoriais de react/i,
      moveHeading: /mover vídeo para/i,
    },
    language: 'pt-BR',
    renames: {
      Tutorials: { name: 'Tutoriais', emoji: '🎓', icon: 'book' },
      Entertainment: { name: 'Entretenimento', emoji: '🎭', icon: 'grid' },
      Uncategorized: { name: 'Sem categoria', emoji: '📁', icon: 'inbox' },
      Music: { name: 'Música', emoji: '🎵', icon: 'music' },
    },
    newCategory: 'Filmes Blender',
    saveInto: 'Design',
    popupOpen: ['Design', 'Música'],
  },
}
