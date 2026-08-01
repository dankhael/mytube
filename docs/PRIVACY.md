# MyTube — Privacy Policy

**Last updated: 30 July 2026**

MyTube is a Chrome extension that lets you save YouTube videos into categories
you define and view them on a curated home page.

**MyTube has no backend server.** The developer does not receive, store, or have
any access to your data. There is no account, no login, no analytics, no
telemetry, and no advertising.

---

## What MyTube stores

When you click **Save** on a YouTube video, MyTube stores the following in your
browser's extension storage (`chrome.storage.sync`):

| Data | Example |
| --- | --- |
| YouTube video ID | `dQw4w9WgXcQ` |
| Video title | `Never Gonna Give You Up` |
| Thumbnail URL | `https://i.ytimg.com/vi/<id>/mqdefault.jpg` |
| Channel name | `Rick Astley` |
| Channel avatar URL (optional) | `https://yt3.ggpht.com/...` |
| Duration label (optional) | `3:33` |
| Your category name for it | `Music` |
| Timestamp saved, watched flag, timestamp watched | `1753900000`, `true` |

MyTube also stores the category list you create and your preferences (interface
language, accent color, sound effects on/off, and the two watch-reminder
toggles).

**That is the complete list.** MyTube does not record your browsing history,
does not track which pages you visit, does not read videos you merely watch or
scroll past, and does not capture anything from any site other than the video
cards you explicitly choose to save on `www.youtube.com`.

## Where that data lives

It is written to `chrome.storage.sync`, which Chrome keeps on your device. If
you have Chrome Sync enabled, Chrome also replicates it across your own signed-in
Chrome browsers through **your own Google account**, under Google's privacy
policy. It is never sent to the developer or to any third-party server.

## Network requests

MyTube makes exactly one kind of network request, and only to YouTube:

- **`https://www.youtube.com/oembed?...`** — When a video's title or channel name
  could not be read from the page (YouTube changes its layout often), MyTube asks
  YouTube's public oEmbed endpoint for that video's title and channel name, by
  video ID. This request carries no API key and no identifier for you beyond what
  your browser normally sends to youtube.com.

Thumbnails and channel avatars are loaded as ordinary images directly from
Google/YouTube image hosts (`i.ytimg.com`, `yt3.ggpht.com`,
`yt3.googleusercontent.com`, `lh3.googleusercontent.com`).

MyTube does not execute remote code. All code is contained in the published
extension package, and fonts are bundled locally rather than fetched from a CDN.

## The donation link

The settings screen contains a "Buy me a coffee" card linking to
`https://ko-fi.com/dankhael`. Nothing is sent to Ko-fi unless you click it, at
which point Ko-fi's own privacy policy applies.

## Permissions and why they are needed

- **`storage`** — to save your videos, categories, and preferences so they
  survive a browser restart.
- **Access to `https://www.youtube.com/*`** — to add the Save button to video
  cards on YouTube, read the title/channel/duration/thumbnail of a card you
  choose to save, and call the oEmbed endpoint above. MyTube requests access to
  no other website.

MyTube deliberately does **not** request the `tabs` or `history` permissions, and
does not override your new-tab page.

## Deleting your data

- Remove individual videos or categories from within the MyTube home page.
- Uninstalling the extension removes its stored data from that browser. If Chrome
  Sync is enabled, clearing synced extension data is done through your Google
  account's Chrome Sync settings.

## Children

MyTube is not directed at children under 13 and collects no personal information
from anyone.

## Changes

Any change to this policy will be published at this URL with an updated date.

## Contact

Questions: **danilokhael@gmail.com** — or open an issue at
<https://github.com/dankhael/mytube/issues>.

---

# MyTube — Política de Privacidade

**Última atualização: 30 de julho de 2026**

O MyTube é uma extensão do Chrome que permite salvar vídeos do YouTube em
categorias definidas por você e vê-los em uma home curada.

**O MyTube não possui servidor.** O desenvolvedor não recebe, não armazena e não
tem qualquer acesso aos seus dados. Não há conta, login, analytics, telemetria
nem publicidade.

## O que o MyTube armazena

Ao clicar em **Salvar** em um vídeo, o MyTube guarda no armazenamento da extensão
(`chrome.storage.sync`): o ID do vídeo, o título, a URL da miniatura, o nome do
canal, a URL do avatar do canal (opcional), a duração (opcional), a categoria
escolhida por você, a data em que foi salvo e o estado de "assistido".

O MyTube também guarda a lista de categorias que você cria e suas preferências
(idioma da interface, cor de destaque, efeitos sonoros e os dois lembretes
opcionais).

**Essa é a lista completa.** O MyTube não registra seu histórico de navegação,
não rastreia as páginas que você visita e não captura nada de nenhum site além
dos cards de vídeo que você escolhe salvar em `www.youtube.com`.

## Onde esses dados ficam

Em `chrome.storage.sync`, no seu dispositivo. Se o Chrome Sync estiver ativo, o
próprio Chrome replica os dados entre os seus navegadores por meio da **sua conta
Google**, sob a política de privacidade do Google. Nada é enviado ao
desenvolvedor nem a servidores de terceiros.

## Requisições de rede

Apenas uma, e somente para o YouTube: `https://www.youtube.com/oembed?...`,
usada para recuperar o título e o nome do canal de um vídeo quando não foi
possível lê-los da página. Sem chave de API e sem identificadores seus. Miniaturas
e avatares são carregados como imagens diretamente dos servidores do
Google/YouTube. O MyTube não executa código remoto.

## Permissões

- **`storage`** — salvar seus vídeos, categorias e preferências.
- **Acesso a `https://www.youtube.com/*`** — inserir o botão Salvar nos cards,
  ler os dados do card que você escolhe salvar e consultar o oEmbed. Nenhum outro
  site é acessado.

O MyTube não solicita as permissões `tabs` ou `history` e não substitui sua página
de nova aba.

## Exclusão dos dados

Remova vídeos e categorias pela própria home do MyTube, ou desinstale a extensão.

## Contato

**danilokhael@gmail.com** — ou <https://github.com/dankhael/mytube/issues>.
