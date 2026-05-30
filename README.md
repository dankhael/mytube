# MyTube

Uma **Chrome Extension (Manifest V3)** que transforma a nova aba do Chrome numa **home do YouTube curada por você**. Em vez de jogar tudo no "Watch Later" (que vira um cemitério), você salva vídeos direto dos cards do YouTube em **categorias** que você mesmo define.

## Stack

- Vite + [CRXJS](https://crxjs.dev/) (`@crxjs/vite-plugin`) — hot reload de extensão
- React 18 + TypeScript
- Tailwind CSS
- `chrome.storage.sync` (sincroniza entre dispositivos)
- Lucide React (ícones) + `@dnd-kit` (drag & drop)

## Funcionalidades

- **Content script:** injeta um botão **“+ Salvar”** nos cards da home (`ytd-rich-item-renderer`), busca (`ytd-video-renderer`) e sugeridos (`ytd-compact-video-renderer`). Usa `MutationObserver` (YouTube é SPA) e um dropdown inline para escolher/criar categoria. Mostra **“✓ Salvo”** com a categoria no tooltip.
- **Service worker:** dono do storage. Trata `SAVE_VIDEO`, `GET_ALL`, `DELETE_VIDEO`, `MOVE_VIDEO`, `MARK_WATCHED`, `ADD_CATEGORY`, `UPDATE_CATEGORY`, `DELETE_CATEGORY`, `REORDER_CATEGORIES`, `REORDER_VIDEOS`. Atualiza o **badge** com a contagem de não assistidos.
- **New tab (home curada):** grid de cards por categoria (até 4, com “+N” expansível), hover com play, abrir em nova aba, menu de contexto (Mover / Marcar assistido / Remover), drag & drop de vídeos e de categorias, toggle de assistidos, tema escuro estilo YouTube. Estados vazios e aviso de quota (limite de 100KB do `storage.sync`).
- **Popup:** resumo de vídeos por categoria + atalho para a home.

## Desenvolvimento

```bash
npm install
npm run dev      # Vite com HMR; carregue a pasta dist/ no Chrome
```

## Build de produção

```bash
npm run build    # gera dist/
```

## Carregar no Chrome

1. `npm run build` (ou `npm run dev`)
2. Abra `chrome://extensions`
3. Ative o **Modo do desenvolvedor**
4. **Carregar sem compactação** → selecione a pasta **`dist/`**
5. Abra uma nova aba para ver a home; navegue no YouTube e clique em **“+ Salvar”** nos vídeos.

> Os ícones são gerados por `node scripts/gen-icons.mjs` (já incluídos em `icons/`).

## Roadmap (não implementado)

- Integração com a YouTube Data API
- Autenticação / backend
- Importar/exportar lista de vídeos
