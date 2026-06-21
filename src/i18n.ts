// Interface language catalog (spec I18N). MyTube's own chrome (popup, new-tab,
// content-script pills) reads its copy from here keyed by the persisted
// Settings.language, so the user can switch language without changing the
// browser locale. English is the default; Portuguese (Brazil) is opt-in.
//
// Design (spec Decisions §4): one flat, dot-namespaced catalog per locale, every
// value a string. Parameterized copy uses {name}/{count} placeholders filled by
// `t(key, lang, vars)`. Keeping values as plain strings makes the "both locales
// define the same keys" guard (I18N-4) a simple Object.keys comparison.

export type Language = 'en' | 'pt-BR'

// Default preserves an English-first install (I18N-1). Unknown/garbage values
// fall back here on read (I18N-2) and in `t` (I18N-5).
export const DEFAULT_LANGUAGE: Language = 'en'

// Picker order in the Settings modal (English first — it's the default).
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
]

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'pt-BR'
}

// Maps a BCP-47-ish browser locale (navigator.language) to a supported language.
// Anything not Brazilian/Portuguese falls back to the English default (Decisions
// §1) — we only ship two locales, so this is a coarse "pt* → pt-BR, else en".
export function detectLanguage(locale: string | undefined): Language {
  return typeof locale === 'string' && locale.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

// The English catalog doubles as the key set of record: every other locale must
// define exactly these keys (I18N-4) and `t` falls back to the English string
// for a key missing from another locale (I18N-5).
const EN = {
  'common.video': 'video',
  'common.videos': 'videos',
  'common.showLess': 'Show less',
  'common.seeAll': 'See all ({count})',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.create': 'Create',
  'common.close': 'Close',

  'popup.emptyTitle': 'No videos saved yet.',
  'popup.emptyHint': 'Click “+ Save” on YouTube videos.',
  'popup.categoryEmpty': 'No videos here.',
  'popup.seeAllInHome': 'See all in home ({count})',
  'popup.unwatchedWord': 'unwatched',

  'config.title': 'Settings',
  'config.sound.label': 'Sound effects',
  'config.sound.sub': 'Little chimes as you browse',
  'config.theme.label': 'Theme color',
  'config.theme.sub': 'Accent across the whole extension',
  'config.language.label': 'Language',
  'config.language.sub': 'Interface language',
  'config.donate.title': 'Buy me a coffee',
  'config.donate.sub': 'Support the developer',
  'config.donate.soon': 'SOON',

  'home.loading': 'Loading…',
  'home.quotaWarning':
    'Storage almost full ({percent}% of the sync limit). Remove some videos to keep syncing.',
  'home.welcomeBack': 'Welcome back.',
  'home.greetingPre': 'You have',
  'home.greetingPost': 'waiting in your library.',
  'home.searchPlaceholder': 'Search your library…',
  'home.hideWatched': 'Hide watched',
  'home.showWatched': 'Show watched',
  'home.watched': 'Watched',
  'home.hidden': 'Hidden',
  'home.category': 'Category',
  'home.recentlyAdded': 'Recently added',
  'home.gatheringDust': 'Gathering dust',

  'welcome.title': 'Your YouTube home, curated by you.',
  'welcome.bodyPre': 'Browse YouTube and click the',
  'welcome.bodyPost':
    'button on videos to organize them here into categories. No more Watch Later graveyard.',
  'welcome.savePill': '+ Save',
  'welcome.openYoutube': 'Open YouTube',

  'cat.drag': 'Drag category',
  'cat.options': 'Category options',
  'cat.rename': 'Rename / icon',
  'cat.delete': 'Delete category',
  'cat.emptyTitle': 'Nothing here yet',
  'cat.emptyHint': 'Click “+ Save” on any video to drop it into {name}.',
  'cat.confirmDelete': 'Delete the category "{name}"?',
  'cat.confirmDeleteWithVideos':
    'Delete "{name}"?\n\nOK = delete the category AND its {count} videos.\nCancel = keep the videos (move them to "{uncategorized}").',

  'card.watched': 'Watched',
  'card.notWatched': 'Not watched yet',
  'card.markUnwatched': 'Mark unwatched',
  'card.markWatched': 'Mark as watched',
  'card.move': 'Move…',
  'card.moveTo': 'Move to…',
  'card.more': 'More',
  'card.remove': 'Remove',

  'modal.newCategory': 'New category',
  'modal.editCategory': 'Edit category',
  'modal.name': 'Name',
  'modal.namePlaceholder': 'e.g. React tutorials',
  'modal.icon': 'Icon',
  'modal.moveVideoTo': 'Move video to…',
  'modal.current': 'current',

  'toast.notSaved': 'The action was not saved —',
  'toast.dismiss': 'Dismiss notice',

  'content.saved': 'Saved',
  'content.save': 'Save',
  'content.savedIn': 'Saved in: {category}',
  'content.saveToMyTube': 'Save to MyTube',
  'content.saveTo': 'Save to…',
  'content.savedToast': 'Saved in {category} ✨',
  'content.newCategory': '+ New category',
  'content.categoryNamePlaceholder': 'Category name…',
} as const

export type MessageKey = keyof typeof EN

const PT_BR: Record<MessageKey, string> = {
  'common.video': 'vídeo',
  'common.videos': 'vídeos',
  'common.showLess': 'Mostrar menos',
  'common.seeAll': 'Ver todos ({count})',
  'common.cancel': 'Cancelar',
  'common.save': 'Salvar',
  'common.create': 'Criar',
  'common.close': 'Fechar',

  'popup.emptyTitle': 'Nenhum vídeo salvo ainda.',
  'popup.emptyHint': 'Clique em “+ Salvar” nos vídeos do YouTube.',
  'popup.categoryEmpty': 'Nenhum vídeo aqui.',
  'popup.seeAllInHome': 'Ver todos na home ({count})',
  'popup.unwatchedWord': 'não assistidos',

  'config.title': 'Configurações',
  'config.sound.label': 'Efeitos sonoros',
  'config.sound.sub': 'Pequenos sons enquanto você navega',
  'config.theme.label': 'Cor do tema',
  'config.theme.sub': 'Destaque em toda a extensão',
  'config.language.label': 'Idioma',
  'config.language.sub': 'Idioma da interface',
  'config.donate.title': 'Pague um café',
  'config.donate.sub': 'Apoie o dev',
  'config.donate.soon': 'BREVE',

  'home.loading': 'Carregando…',
  'home.quotaWarning':
    'Armazenamento quase cheio ({percent}% do limite de sincronização). Remova alguns vídeos para continuar sincronizando.',
  'home.welcomeBack': 'Bem-vindo de volta.',
  'home.greetingPre': 'Você tem',
  'home.greetingPost': 'esperando na sua biblioteca.',
  'home.searchPlaceholder': 'Buscar na biblioteca…',
  'home.hideWatched': 'Ocultar assistidos',
  'home.showWatched': 'Mostrar assistidos',
  'home.watched': 'Assistidos',
  'home.hidden': 'Ocultos',
  'home.category': 'Categoria',
  'home.recentlyAdded': 'Recentemente adicionados',
  'home.gatheringDust': 'Pegando poeira',

  'welcome.title': 'Sua home do YouTube, curada por você.',
  'welcome.bodyPre': 'Navegue pelo YouTube e clique no botão',
  'welcome.bodyPost':
    'nos vídeos para organizá-los aqui em categorias. Chega de “Watch Later” virar cemitério.',
  'welcome.savePill': '+ Salvar',
  'welcome.openYoutube': 'Abrir o YouTube',

  'cat.drag': 'Arrastar categoria',
  'cat.options': 'Opções da categoria',
  'cat.rename': 'Renomear / ícone',
  'cat.delete': 'Deletar categoria',
  'cat.emptyTitle': 'Nada aqui ainda',
  'cat.emptyHint': 'Clique em “+ Salvar” em qualquer vídeo para jogá-lo em {name}.',
  'cat.confirmDelete': 'Deletar a categoria "{name}"?',
  'cat.confirmDeleteWithVideos':
    'Deletar "{name}"?\n\nOK = apagar a categoria E seus {count} vídeos.\nCancelar = manter os vídeos (movê-los para "{uncategorized}").',

  'card.watched': 'Assistido',
  'card.notWatched': 'Ainda não assistido',
  'card.markUnwatched': 'Marcar não assistido',
  'card.markWatched': 'Marcar como assistido',
  'card.move': 'Mover…',
  'card.moveTo': 'Mover para…',
  'card.more': 'Mais',
  'card.remove': 'Remover',

  'modal.newCategory': 'Nova categoria',
  'modal.editCategory': 'Editar categoria',
  'modal.name': 'Nome',
  'modal.namePlaceholder': 'Ex.: Tutoriais de React',
  'modal.icon': 'Ícone',
  'modal.moveVideoTo': 'Mover vídeo para…',
  'modal.current': 'atual',

  'toast.notSaved': 'A ação não foi salva —',
  'toast.dismiss': 'Fechar aviso',

  'content.saved': 'Salvo',
  'content.save': 'Salvar',
  'content.savedIn': 'Salvo em: {category}',
  'content.saveToMyTube': 'Salvar no MyTube',
  'content.saveTo': 'Salvar em…',
  'content.savedToast': 'Salvo em {category} ✨',
  'content.newCategory': '+ Nova categoria',
  'content.categoryNamePlaceholder': 'Nome da categoria…',
}

const CATALOG: Record<Language, Record<MessageKey, string>> = { en: EN, 'pt-BR': PT_BR }

// Exposed so a test can assert both locales define exactly the same keys (I18N-4)
// without reaching into the module internals.
export function messageKeys(lang: Language): string[] {
  return Object.keys(CATALOG[lang])
}

function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole,
  )
}

// Looks up a localized string. An unknown `lang` falls back to English (I18N-3);
// an unknown `key` returns the English string if present, else the key itself —
// always a string, never undefined, never throws (I18N-5).
export function t(key: MessageKey, lang: unknown, vars?: Record<string, string | number>): string {
  const locale = isLanguage(lang) ? lang : DEFAULT_LANGUAGE
  const template = CATALOG[locale][key] ?? CATALOG[DEFAULT_LANGUAGE][key] ?? key
  return fill(template, vars)
}
