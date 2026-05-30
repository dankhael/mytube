<!--
Copy this file to specs/<feature>.spec.md and fill it in.
The handshake (see CLAUDE.md → "Spec handshake"):
  1. Agent drafts this file with Status: Draft.
  2. Human reviews/edits the criteria and flips Status to Approved.
  3. ONLY THEN may the agent implement (test per criterion → code → green).
Do not implement against a Draft. Do not edit Approved criteria without the human.
-->

# Spec: Nome e ícone na aba da home

- **Status:** Approved  <!-- Draft → Approved (only a human sets Approved) -->
- **Owner:** dankhael
- **Contract:** página estática [newtab/index.html](../newtab/index.html) + ícones em [icons/](../icons/). Não toca no `Message`/`StorageData` de `src/types.ts`.
- **Tests:** [newtab/index.html.test.ts](../newtab/index.html.test.ts) (novo — lê o HTML como texto)

## Why

Quando o usuário abre a home da extensão (nova aba), a aba do navegador mostra um
título genérico e **nenhum favicon** (`newtab/index.html` não tem `<link rel="icon">`).
A aba fica indistinguível das outras. Queremos que ela mostre o nome "MyTube" e o
ícone da extensão, para o usuário reconhecer a aba de relance.

## Acceptance criteria

IDs estáveis (`TAB-N`). Cada linha vira um `it('<ID>: …')`. Os critérios abaixo
são observáveis lendo o conteúdo de `newtab/index.html` (e o asset referenciado),
sem precisar de navegador.

| ID | Given | When | Then |
|---|---|---|---|
| **TAB-1** | `newtab/index.html` | o HTML é lido | a tag `<title>` contém exatamente `MyTube` |
| **TAB-2** | `newtab/index.html` | o HTML é lido | existe um `<link rel="icon">` cujo `href` aponta para um arquivo de ícone que existe no repo (ex.: `/icons/icon48.png`) |
| **TAB-3** | o `href` do favicon de TAB-2 | resolvido contra o repo | o arquivo de ícone referenciado existe em `icons/` (sem href quebrado) |

## Out of scope / non-goals

- Não muda o ícone da extensão na toolbar (`action.default_icon`) nem no
  `manifest.config.ts` — esses já existem e estão corretos.
- Não cria novos arquivos de imagem; reutiliza os `icons/icon{16,48,128}.png` existentes.
- Não torna o título dinâmico (ex.: contar vídeos no título da aba) — isso fica
  para uma spec futura se desejado.
- Não altera o `<title>` do popup.

## Manual acceptance (not unit-tested)

Carregar a extensão (`npm run build` → carregar `dist/` desempacotada) e abrir uma
nova aba:

- [x] A aba do navegador mostra o texto **MyTube** como título.
- [x] A aba do navegador mostra o **ícone da extensão** como favicon (não o ícone
      genérico/branco do Chrome).
- [x] O favicon continua aparecendo após um reload da página (`Ctrl+R`).
