# Port do MyTube para Firefox desktop

Análise e plano de adaptação — 13 de outubro de 2026.

## Situação e recomendação

O port é viável mantendo uma única base TypeScript/React e dois artefatos de
distribuição. Esta branch prepara a arquitetura do Chrome; **não implementa nem
certifica suporte a Firefox**. Firefox Android fica fora deste plano.

O maior reaproveitamento está no reducer, validação, extração de vídeos do DOM,
componentes React, temas e internacionalização. As diferenças se concentram no
manifest, background, integração nativa, atalhos e testes de instalação.

## Base preparada nesta branch

| Módulo | Responsabilidade |
|---|---|
| `src/browser-platform.ts` | Único ponto de acesso aos namespaces nativos; resolução lazy; adapter Chrome atual |
| `src/messages.ts` | Transporte compartilhado para popup, home e content script; normalização de falhas e envelopes inválidos |
| `src/storage-backend.ts` | Layout de sync independente do navegador sobre `SyncArea`; nomes neutros `SyncStorageBackend` e `BrowserSyncArea` |
| `src/sync-integrity.ts` | SHA-256 dos blocos e pré-validação de quota por item, total e quantidade de chaves |
| `src/background-task.ts` | Observação de erros em manutenção disparada por eventos |
| `src/home-page.ts` | Navegação e links, com URL de atalhos obtida da integração nativa |
| `newtab/api.ts` | Operações da home e uso de armazenamento medido em todas as chaves |

Os nomes antigos `ChromeSyncBackend`/`ChromeSyncArea` foram removidos; código e
testes usam `SyncStorageBackend`/`BrowserSyncArea`. Os limites nativos de quota
ficam em `src/storage-limits.ts`, compartilhados pelo backend, validação e fake.
O contrato `StorageData` e as mensagens
de aplicação não mudaram. Os tipos nativos de Chromium ainda estão no adapter;
o port deverá estreitá-los/normalizá-los onde a implementação Firefox divergir.

O popup oferece “Recarregar” (reload da página, sem repetir a gravação) e
restaura preferências reconhecidas pelo background quando uma gravação
falha. A home preserva os últimos dados exibidos e permite tentar novamente uma
leitura que falhou, sem representar dados incompletos como biblioteca vazia.
Uma falha de atualização do badge não transforma um save já persistido em erro.

## Semântica de armazenamento e limites

Formato mantido:

```text
mytube:meta       { generation, chunkCount, chunkHashes?, categories, settings }
mytube:videos:0   { videos: [...] }
mytube:videos:1   { videos: [...] }
...
```

`chunkHashes[i]` é SHA-256 do JSON canônico de `{ videos }` correspondente
(propriedades de objetos ordenadas recursivamente; ordem dos arrays preservada).
Isso evita falsos conflitos quando o storage nativo reordena propriedades. A leitura rejeita
um bloco ausente, malformado ou incompatível com a assinatura. Uma nova leitura
funciona quando os blocos correspondentes chegam. Uma mutação também verifica o
snapshot atual antes de escrever; nunca salva deliberadamente uma leitura parcial.

Bibliotecas antigas de uma chave continuam migrando depois de uma gravação
bem-sucedida. Shards antigos sem hashes continuam legíveis e ganham hashes na
próxima gravação. Blocos idênticos não são regravados. O limite de 8.192 bytes
continua valendo por item, inclusive para categorias/configurações em `meta`;
o indicador da home agora acompanha o total de 102.400 bytes.

**Limites que permanecem:**

- Sync não fornece transação/CAS entre dispositivos. Dois snapshots completos
  concorrentes ainda podem sobrescrever alterações; não existe merge automático.
- Hashes detectam mistura/incompletude; não são backup nem autenticação. A fila
  do reducer continua protegendo somente operações da mesma instância.
- Se o serviço convergir permanentemente para uma combinação inconsistente,
  a biblioteca ficará bloqueada para edição até recuperação de um snapshot
  coerente. Repetir a leitura não recria dados perdidos. Não limpar o storage
  automaticamente; backup local/exportação e recuperação assistida são próximos
  trabalhos possíveis.
- Clientes antigos podem escrever metadados sem hashes; sua leitura segue o
  caminho legado e não oferece detecção de conteúdo misturado. Atualizar os
  dispositivos antes de avaliar as novas garantias.
- Pré-validação de quota é conservadora e inclui as chaves antigas ainda não
  removidas. Não elimina corridas externas entre verificação e gravação.
- Firefox Sync e Chrome Sync são serviços separados. O port não transfere a
  biblioteca entre navegadores; exportação/importação requer trabalho próprio.

## Obstáculos e adaptações

### 1. Manifest e background — obrigatório

O manifest atual usa `background.service_worker`. O Firefox usa scripts/páginas
de background para extensões; manter Manifest V3 e emitir `background.scripts`.
O mesmo código de negócio pode executar nos dois contextos. Listeners devem
continuar sendo registrados sincronamente no nível superior.

Referência: [MDN — background](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background).

Manifest Firefox deverá definir:

- `browser_specific_settings.gecko.id`: ID estável, escolhido para distribuição;
- `strict_min_version`: versão mínima derivada das APIs utilizadas e testadas;
- declaração `data_collection_permissions` adequada às práticas do produto;
- background em módulo conforme o artefato gerado.

Evitar copiar um ID fictício para produção. O ID é necessário para `storage.sync`
no Firefox. Os limites documentados são 102.400 bytes totais, 8.192 por item e
512 itens. A sincronização ocorre periodicamente e resolve conflitos por chave.
[MDN — storage.sync](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync).

### 2. Vite/CRXJS — adaptar a configuração existente primeiro

O lockfile desta base resolve `@crxjs/vite-plugin` **2.5.0**. A inspeção do pacote
instalado confirma `CrxOptions.browser?: 'firefox' | 'chrome'` em
`dist/index.d.ts`; o plugin de background em `dist/index.mjs` gera
`background.scripts` com `type: 'module'` para Firefox. Portanto há um caminho
concreto sem trocar de framework.

Plano de configuração, ainda não implementado:

```ts
// Esboço: browser e manifest devem ser escolhidos pela configuração do build.
crx({ manifest, browser: 'firefox' })
```

1. Extrair propriedades compartilhadas do manifest e compor variantes por alvo.
2. Gerar `dist/chrome` e `dist/firefox` com comandos explícitos.
3. Preservar a entrada HTML adicional de `newtab/index.html` em `vite.config.ts`:
   ela não é referenciada como override de nova aba no manifest.
4. Conferir loaders, imports dinâmicos e `web_accessible_resources` do content
   script na saída Firefox. Não copiar loaders do build Chrome manualmente.
5. Validar o pacote de produção primeiro; tratar HMR/dev como outra etapa.
6. Atualizar scripts de sandbox, capturas e release que assumem `dist/`.

A opção do plugin comprova intenção de suporte, não funcionamento de todos os
fluxos do MyTube. Só um teste no navegador e `web-ext lint` fecham essa etapa.

### 3. APIs assíncronas — adaptar a fronteira, preservar o contrato

O adapter atual é Chrome e mantém callbacks no transporte de mensagens e
Promises no storage. Firefox oferece `browser.*` e compatibilidade com `chrome.*`;
validar a semântica de cada chamada nas versões mínimas escolhidas. Não fazer
uma substituição textual global de namespaces.

Implementar no adapter as diferenças de runtime, sync, tabs, commands, action e
eventos de storage. Caso se adote `webextension-polyfill`, encapsulá-lo nessa
fronteira e adaptar o transporte para sua interface Promise. Os consumidores
devem continuar recebendo `Promise<MessageResponse>`.

Preservar:

- leitura de `lastError` dentro do callback no adapter baseado em callbacks;
- resposta assíncrona do background (`return true` + `sendResponse`, ou equivalente);
- distinção entre falha transitória e invalidação do contexto do content script;
- ausência de retry automático de mutações com resposta perdida;
- URLs de páginas empacotadas obtidas por `runtime.getURL()`;
- verificação/sanitização de mensagens recebidas no background.

[MDN — extensões entre navegadores](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension).

### 4. Configuração de atalhos — adaptar a experiência

`chrome://extensions/shortcuts` está agora isolado no adapter. Firefox não aceita
simplesmente abrir `about:addons` com `tabs.create`, por ser uma página
privilegiada. O port deverá representar a ação como capacidade, não só uma URL:
mostrar instruções localizadas para o gerenciamento de atalhos, ou implementar
uma configuração própria com as APIs suportadas.

Manter o comando `open_home`, testar conflitos do atalho sugerido e o caso sem
atalho atribuído. A home continua sendo uma página normal aberta sob demanda.
[MDN — tabs.create](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create).

### 5. Permissões, CSP e YouTube — validar em runtime

Manter inicialmente `storage` e acesso somente a `https://www.youtube.com/*`.
Testar instalação com acesso concedido e revogado, injeção após mudança de
permissões, navegação SPA e lookup oEmbed no background. Nas versões modernas
do Firefox, hosts são exibidos na instalação; não se basear em instruções
antigas que afirmam ausência desse aviso em todo MV3.
[MDN — host_permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions).

Revisar CSP sobre o pacote final: módulos locais, thumbnails, avatares e fontes.
Não ampliar permissões ou liberar código remoto para acomodar o build.

O content script usa DOM/MutationObserver e não depende dos objetos JavaScript
internos do YouTube. Mesmo assim, testar feed, busca, canal, watch e playlists
no Firefox real, incluindo scroll, reaproveitamento de cards e reinjeção.

### 6. Ícone e interfaces — validar diferenças visuais

`rasterizeIcon` ainda usa SVG → `createImageBitmap` → `OffscreenCanvas`. Verificar
a rasterização no background Firefox; a falha mantém o PNG padrão e é silenciosa.
Se necessário, fornecer rasterizador alternativo para o contexto de página.

Verificar popup, drag-and-drop, sons, atalhos, foco de diálogos, fontes, imagens
e temas. Não há indicação estática de necessidade de reescrever React/dnd-kit.

### 7. Testes e publicação — fluxo separado

O E2E atual carrega a extensão em Chromium, obtém ID pelo service worker e abre
`chrome-extension://`. O teste de persistência passa pela mensageria real e pela
interface de marcar assistido. Não é um teste de Firefox nem de scraping real.
Playwright documenta o carregamento de extensões nesse fluxo apenas em Chromium;
trocar a variável do navegador não porta esse harness.
[Playwright — extensões](https://playwright.dev/docs/chrome-extensions).

Adicionar `web-ext` e comandos futuros (exemplos; ainda não disponíveis no npm):

```sh
web-ext lint --source-dir dist/firefox
web-ext run --source-dir dist/firefox
web-ext build --source-dir dist/firefox
```

Começar com aceitação manual no Firefox e escolher automação própria para
instalação/execução da extensão. Testes de UI sem extensão não substituem isso.

Para distribuição, preparar assinatura Mozilla/AMO, descrição, política de
privacidade e fontes com lockfile/instruções de build reproduzível. O ZIP local
não equivale a uma extensão assinada instalável em produção.
[web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/),
[fontes para revisão](https://extensionworkshop.com/documentation/publish/source-code-submission/).

Novas extensões precisam declarar coleta/transmissão de dados pelo mecanismo
Firefox. Classificar o comportamento efetivo, incluindo lookup oEmbed,
thumbnails/avatares e sync; ausência de analytics não basta para escolher
automaticamente `none`. Definir consentimento e versão mínima conforme essa
avaliação antes da submissão.
[Consentimento Firefox](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).

## Sequência de implementação recomendada

1. Criar variante Firefox do manifest e build CRXJS; validar o pacote com lint.
2. Carregar no Firefox e provar background → mensagem → storage → home.
3. Adaptar o adapter e a experiência de atalhos; validar ícone e permissões.
4. Executar regressão de todas as superfícies e sincronização em dois perfis.
5. Integrar build/lint Firefox no CI e documentar desenvolvimento/release.
6. Preparar e revisar materiais de distribuição; publicar em ação separada.

## Verificação da base Chrome nesta branch

Baseline do commit `40282ac`, executado em 13/10/2026 com Node 24.21.0:

- `npm test`: 321 testes em 54 arquivos passaram.
- `npm run build`: TypeScript e build de produção passaram. CRXJS/Vite emite um
  aviso sobre `rollupOptions`/`rolldownOptions`; a entrada da home foi emitida e
  exercitada no smoke. Reavaliar esse aviso ao separar os builds.
- `MYTUBE_HEADLESS=1 npx playwright test`, sobre o build acima: 2 testes passaram
  no Chromium 148 do Playwright, incluindo save/reload/marcar assistido/delete.

Não foram executados nesta tarefa: Firefox, sincronização entre contas/perfis
reais, scraping no YouTube real, reinício completo do navegador e publicação.
Os checklists abaixo permanecem requisitos do futuro port.

Após a revisão de 14/10/2026: 323 testes em 55 arquivos, build de produção e
os 2 E2E passaram novamente. Cada E2E agora usa um perfil temporário independente.
A spec [browser-foundation](../specs/browser-foundation.spec.md) foi aprovada
pelo proprietário em 20/10/2026, incluindo os critérios ARCH-1..8 e a decisão de
bloquear snapshots inconsistentes para preservar os dados. Uma ação de recuperação
ainda não foi implementada e exige uma spec própria.

## Critérios para considerar o port pronto

- [ ] Instalação e atualização no Firefox mínimo e atual sem erros de manifest.
- [ ] Save por card/watch/playlist, categoria, mover, excluir e marcar assistido.
- [ ] Persistência após recarregar a página e reiniciar o navegador/background.
- [ ] Popup, home, badge e estados do YouTube refletem alterações.
- [ ] Snapshots legados migrados, quota cheia e sync incompleto tratados sem limpeza automática.
- [ ] Sincronização real entre dois perfis testada com as limitações registradas.
- [ ] Atalhos configurados/não configurados, imagens, temas, som e drag-and-drop.
- [ ] Acesso ao YouTube concedido/revogado e atualização da extensão com aba aberta.
- [ ] Build de produção sem dependência do servidor Vite/HMR.
- [ ] Regressão Chrome verde e pacote Firefox validado/assinado para distribuição.
