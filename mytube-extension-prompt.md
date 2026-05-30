# Claude Code Prompt — MyTube Extension

## Contexto

Crie uma **Chrome Extension (Manifest V3)** chamada **MyTube** — uma home curada para o YouTube. O problema que resolve: o "Watch Later" nativo do YouTube é um cemitério de vídeos que nunca são assistidos. O usuário quer uma experiência de "home do YouTube, mas curada por ele mesmo", com vídeos separados em categorias que ele define.

---

## O que construir

### Estrutura do projeto

```
mytube-extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   └── content.js          # injeta botão nos cards do YouTube
├── newtab/
│   ├── index.html
│   ├── App.tsx             # home curada (React + Vite)
│   └── components/
│       ├── CategorySection.tsx
│       ├── VideoCard.tsx
│       ├── AddCategoryModal.tsx
│       └── SaveToModal.tsx
├── popup/
│   └── popup.html          # badge com contagem de vídeos salvos
├── package.json
└── vite.config.ts
```

### Tech stack

- **Build:** Vite + CRXJS (`@crxjs/vite-plugin`) — hot reload nativo para extensões
- **UI:** React 18 + TypeScript
- **Estilo:** Tailwind CSS
- **Storage:** `chrome.storage.sync` (sincroniza entre dispositivos)
- **Ícones:** Lucide React
- **Comunicação:** `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`

---

## Funcionalidades

### 1. Content Script (`content/content.js`)

Injeta um botão **"+ Salvar"** em cada card de vídeo na home do YouTube (`ytd-rich-item-renderer`), na página de resultados de busca (`ytd-video-renderer`) e na sidebar de vídeos sugeridos (`ytd-compact-video-renderer`).

- Usa `MutationObserver` para detectar novos cards carregados dinamicamente (YouTube é SPA)
- Extrai do DOM: `videoId` (da URL do `<a>`), `title`, `thumbnail` (`<img>`), `channelName`
- Ao clicar no botão, abre um **dropdown inline** com as categorias existentes + opção "Nova categoria"
- Ao selecionar categoria, envia mensagem pro service worker: `{ action: 'SAVE_VIDEO', video, category }`
- Feedback visual no botão: muda para "✓ Salvo" por 2 segundos

**Seletor dos cards no YouTube (referência):**
```js
// Cards na home
document.querySelectorAll('ytd-rich-item-renderer')
// Thumbnail link
card.querySelector('a#thumbnail')
// Título
card.querySelector('#video-title')
// Canal
card.querySelector('#channel-name a')
// Thumbnail src
card.querySelector('img.yt-core-image')
```

### 2. Background Service Worker (`background/service-worker.js`)

Gerencia o storage. Responde às mensagens:

- `SAVE_VIDEO` → adiciona vídeo ao storage na categoria certa
- `GET_ALL` → retorna todos os vídeos e categorias
- `DELETE_VIDEO` → remove vídeo por id
- `MOVE_VIDEO` → muda categoria de um vídeo
- `MARK_WATCHED` → marca `watched: true`
- `ADD_CATEGORY` → cria nova categoria
- `DELETE_CATEGORY` → remove categoria (e move seus vídeos para "Sem categoria" ou deleta junto — configurável)
- `REORDER_CATEGORIES` → salva nova ordem das categorias

**Schema do storage:**
```ts
interface StorageData {
  categories: string[]           // ordem das categorias
  videos: Video[]
}

interface Video {
  id: string                     // videoId do YouTube
  title: string
  thumbnail: string              // URL da thumbnail (mqdefault.jpg)
  channelName: string
  category: string
  addedAt: number                // timestamp
  watched: boolean
  watchedAt?: number
}
```

Atualiza o badge do ícone com a contagem de vídeos não assistidos:
```js
chrome.action.setBadgeText({ text: String(unwatchedCount) })
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' })
```

### 3. New Tab Page — Home Curada

Esta é a peça principal. A new tab page substitui a aba nova do Chrome pela home curada do usuário.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  MyTube                               [+ Categoria] [⚙]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🎓 Tutoriais  (3 vídeos)                    [···]       │
│  ┌────────┐  ┌────────┐  ┌────────┐                      │
│  │ thumb  │  │ thumb  │  │ thumb  │                      │
│  │        │  │        │  │        │                      │
│  │ título │  │ título │  │ título │                      │
│  │ canal  │  │ canal  │  │ canal  │                      │
│  └────────┘  └────────┘  └────────┘                      │
│                                                          │
│  🎭 Entretenimento  (5 vídeos)               [···]       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │ thumb  │  │ thumb  │  │ thumb  │  │ +2     │          │
│  └────────┘  └────────┘  └────────┘  └────────┘          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Comportamentos:**

- Grid de cards com thumbnail, título (truncado em 2 linhas), canal
- Cada categoria mostra até 4 vídeos; se tiver mais, o último card é um "+N" clicável que expande
- Hover no card: thumbnail escurece levemente, aparece botão play centralizado
- Clique no card: abre `https://www.youtube.com/watch?v={id}` em nova aba
- Clique direito no card (ou menu `⋯`): opções — Mover para..., Marcar como assistido, Remover
- Vídeos marcados como assistidos ficam com overlay semi-transparente e ✓ — podem ser ocultados por toggle
- Drag and drop para reordenar vídeos dentro de uma categoria (use `@dnd-kit/core`)
- Drag and drop para reordenar as próprias categorias
- Botão `[···]` na categoria: renomear, mudar emoji/ícone, deletar categoria
- Tema escuro por padrão (compatível com o visual escuro do YouTube)

**Estilo visual:**

- Fundo: `#0f0f0f` (igual ao YouTube dark)
- Cards: `#1a1a1a` com border `#272727`
- Hover: `#272727`
- Accent: vermelho YouTube `#ff0000` para detalhe no badge e botão primário
- Fonte: `YouTube Sans` (disponível via CDN) ou fallback `Roboto`
- Thumbnails com aspect ratio 16:9 e `border-radius: 8px`
- Layout responsivo: 2 cols mobile, 3 cols tablet, 4 cols desktop

### 4. Popup (`popup/popup.html`)

Simples: mostra contagem de vídeos por categoria e um link para abrir a new tab page.

---

## manifest.json (referência)

```json
{
  "manifest_version": 3,
  "name": "MyTube",
  "version": "1.0.0",
  "description": "Sua home do YouTube curada por você",
  "permissions": ["storage", "tabs", "activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/icon48.png"
  },
  "chrome_url_overrides": {
    "newtab": "newtab/index.html"
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  }
}
```

---

## Ordem de implementação sugerida

1. Setup do projeto: `npm create vite@latest` + CRXJS + Tailwind
2. `manifest.json` com estrutura completa
3. Service worker com todas as mensagens e storage
4. Content script com MutationObserver e botão de salvar
5. New Tab Page — estrutura de categorias + grid de cards
6. Drag and drop (dnd-kit)
7. Menus de contexto (mover, marcar, deletar)
8. Popup com resumo
9. Polimento visual (animações, transições, estados vazios)

---

## Estados importantes a tratar

- **Home vazia:** tela de boas-vindas explicando como usar ("Navegue pelo YouTube e clique em + nos vídeos para salvá-los aqui")
- **Categoria vazia após remover vídeos:** placeholder sutil
- **Vídeo já salvo:** botão no content script mostra "✓ Salvo" em vez de "+ Salvar", com tooltip indicando a categoria
- **Storage cheio:** `chrome.storage.sync` tem limite de 100KB — implementar aviso quando chegar perto (monitore `chrome.storage.sync.getBytesInUse`)
- **YouTube muda o DOM:** o MutationObserver deve ser robusto a seletor não encontrado (try/catch por card)

---

## Não precisa implementar agora

- Integração com YouTube Data API (thumbnails e títulos já vêm do DOM)
- Autenticação / backend
- Sincronização cross-browser (Firefox etc.)
- Importar/exportar lista de vídeos (deixar como roadmap)
