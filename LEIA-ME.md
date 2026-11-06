# App Rapport Frigotec — versão celular

Esta pasta é o app de celular inteiro. Ele funciona como site (PWA): publica uma vez no GitHub Pages, abre no celular pelo endereço e instala na tela inicial como um app. Depois de instalado, funciona sem internet.

## Publicar no GitHub Pages (uma vez, ~10 minutos)

1. Crie uma conta grátis em **github.com** (se ainda não tiver).
2. Clique em **New repository** (botão verde ou o **+** no canto de cima).
   - *Repository name*: `rapport` (o nome entra no endereço do app)
   - Marque **Public** (no plano grátis, o GitHub Pages só funciona com repositório público)
   - Clique em **Create repository**.
3. Na página do repositório novo, clique no link **uploading an existing file**.
4. Abra esta pasta (**App Celular**) no Windows, selecione **tudo o que está dentro dela** (arquivos e as pastas `forms` e `icons`) e arraste para a página do GitHub. Use o Chrome ou o Edge, porque eles aceitam arrastar pastas.
   - Não arraste a pasta *App Celular* em si, só o conteúdo. O `index.html` precisa ficar na raiz do repositório.
5. Embaixo, clique em **Commit changes**.
6. Vá em **Settings → Pages**. Em *Build and deployment*:
   - *Source*: **Deploy from a branch**
   - *Branch*: **main** e pasta **/ (root)**
   - Clique em **Save**.
7. Espere 1 a 2 minutos e recarregue a página. Aparece o endereço do app, por exemplo:
   **https://SEU-USUARIO.github.io/rapport/**

## Instalar no celular

- **Android (Chrome ou Samsung Internet):** abra o endereço. Toque no botão **"Install as an app"** da tela inicial do app, ou use o menu **⋮ → Instalar app / Adicionar à tela inicial**.
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar (□↑) → Adicionar à Tela de Início**.

Mande o mesmo endereço para os outros técnicos.

## Atualizar o app depois de uma mudança

1. No repositório do GitHub: **Add file → Upload files** e arraste os arquivos que mudaram (o GitHub substitui os antigos).
2. Em toda versão nova, os números em `sw.js` (`CACHE = 'rapport-v…'`) e em `app.js` (`APP_VERSION`) precisam mudar. O Claude faz isso quando altera o app.
3. Na próxima vez que o técnico abrir o app com internet, aparece **"New version available → Update"**.

## Importante saber

- **O site é público:** quem tiver o endereço vê o app e o formulário em branco. **Os rapports não vão para a internet:** eles ficam só no celular de cada técnico, no armazenamento do navegador.
- **Os rapports do app podem ser perdidos:** isso acontece se o técnico **desinstalar o app ou limpar os dados do Chrome/Safari**. Os PDFs já salvos na pasta Downloads, ou já enviados, continuam lá. Cada PDF também carrega os dados do rapport dentro dele, então dá para reabrir e editar pelo botão **"Open PDF/JSON from the PC…"**, tanto no celular quanto no PC.
- **Compatível com o editor do PC:** um PDF feito no celular abre no *Editor de Rapport Frigotec.html* e vice-versa.
- **Enviar por WhatsApp/Telegram/E-mail:** o app abre a lista de compartilhamento do celular já com o PDF anexado, e o técnico toca no app escolhido. Uma página da web não consegue abrir o WhatsApp direto com o arquivo anexado. Isso só seria possível com um app nativo instalado por APK.
