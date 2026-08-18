# Dicionário de Notas Musicais 🎹

Bem-vindo ao repositório do **Dicionário de Notas Musicais**! 
Este é um aplicativo web (PWA) focado em tecladistas, pianistas e músicos de sintetizadores. Ele foi desenhado para resolver o problema de visualização rápida de acordes, estudos de inversões, otimização de voice-leading em repertórios e transposição de tons.

## 🚀 Acesse Online
O aplicativo está publicado e operando através do Firebase Hosting:
🔗 **[https://dicionarionotas.web.app](https://dicionarionotas.web.app)**

---

## 🛠️ Funcionalidades Principais

### 1. Dicionário de Acordes (Busca Inteligente)
- Algoritmo próprio de teoria musical que reconhece cifras complexas (ex: `Cmaj7`, `F#m11`, `D#m9`).
- Exibe de forma visual um mini-teclado indicando as teclas a serem tocadas.
- Identifica acordes de 3 notas, 4 notas ou mais (tétrades, extensões).

### 2. Controle de Inversões
- Permite alternar entre a posição fundamental e as 1ª, 2ª e 3ª inversões com apenas um clique.
- O teclado se reajusta automaticamente e centraliza o foco para evitar que o usuário precise rolar a tela horizontalmente para ver os acordes.

### 3. Voice-Leading Inteligente e Síntese de Áudio (Web Audio API)
- **Voice-Leading Visual:** O aplicativo possui um algoritmo baseado no "centro de gravidade MIDI". Ao analisar o repertório, sugere a inversão que exige o *menor deslocamento da mão*.
- **Áudio Integrado:** Execução sonora dos acordes, arpejos e levadas com sistema de play/stop inteligente. Os osciladores têm envelopes de corte suave, eliminando cliques de áudio, com estado de reprodução totalmente sincronizado pela interface (toggles visuais).

### 4. Repertório (Setlists) e Transposição
- Criação ilimitada de Músicas/Setlists.
- Permite ir no Dicionário e "Adicionar à Música", construindo passo a passo a harmonia das canções.
- O modo "Tocador" rola a música mostrando os mini-teclados para execução rápida ao vivo.
- Sistema de Transposição de Tom (Accordion dinâmico) diretamente na tela da música. Permite subir ou descer o tom em semitons (+½, −½) e salvar o novo tom definitivamente.

### 5. Biblioteca Pessoal (Favoritos)
- Adição de acordes "coringas" aos favoritos clicando no botão `⭐ Favoritar`.
- O app salva a cifra exata E a inversão exata selecionada.
- Integração "One-Click Restore": Clicar num acorde favorito redireciona para o Dicionário, recriando a visualização exata.

### 6. Design System Premium (Glassmorphism)
- Interface de usuário (UI) construída com a estética contemporânea **Glassmorphism**.
- Suporte a temas dinâmicos: **Aurora Violeta** (Modo Escuro) e **Café Âmbar** (Modo Claro).
- Tipografia moderna otimizada para alta legibilidade (Outfit).
- Micro-interações e animações (Accordion de transposição, botões de pill fluídos, estado de tocando/parar dinâmico).

### 7. PWA, Modo Offline e Controle de Cache
- Configurado como **Progressive Web App (PWA)** no `manifest.json`, com ícones otimizados (maskable).
- Instalável na tela inicial do Android e iOS como um aplicativo nativo.
- Possui um `sw.js` (Service Worker) otimizado que garante funcionamento **100% offline**.
- O Firebase Hosting aplica Cache-Control imutável de 1 ano. A limpeza do cache dos clientes é garantida pela automação de CI/CD que carimba queries dinâmicas (`?v=...`) durante o deploy.

---

## 💻 Arquitetura Técnica e Deploy (CI/CD)

O projeto é mantido da forma mais leve e escalável possível, sem depender de frameworks pesados de frontend (como React ou Vue), garantindo máxima performance:

- **Frontend**: HTML5, Vanilla JavaScript (`app.js`) e CSS Customizado (`styles.css`).
- **Design/Estilização**: Arquitetura orientada a Design Tokens e variáveis CSS.
- **Backend / Autenticação**: Integrado ao Firebase (Auth e Firestore) para controle de acesso (Login via Google e Gatekeepers) e sincronização de dados.
- **Integração Contínua (CI/CD)**: Deploys são 100% automatizados via **GitHub Actions** (`.github/workflows/`). 
  - Toda vez que a branch `main` recebe um push, o código é validado estruturalmente (`node --check`).
  - O script `scripts/stamp-versao.mjs` é executado no runner para injetar a nova versão de cache baseada no número de execução da Action, blindando o projeto contra deploys desalinhados.
  - A hospedagem no Firebase Hosting atende o target `dicionarionotas`.

## 📁 Estrutura de Arquivos Relevantes
- `public/index.html` — O SPA (Single Page Application) que contém as telas e lógicas de roteamento ocultas.
- `public/styles.css` — Estilizações com Design Tokens de Glassmorphism, temas claro/escuro e breakpoints responsivos.
- `public/app.js` — Core da aplicação (Event Listeners, Motor de Teoria Musical, Algoritmo MIDI, Manipulação do DOM e Web Audio API).
- `public/data.js` — Base de dados teórica contendo intervalos musicais e construtores primários.
- `scripts/stamp-versao.mjs` — Script Node.js essencial do CI/CD, responsável por realizar o "bump" da versão de cache dos assets vitais durante o GitHub Actions.
- `firebase.json` e `.firebaserc` — Configuração oficial de deploy, cache-control avançado e regras de hosting.

## 🤝 Próximos Passos (Backlog)
- [ ] Implementar a "Camada 2": Busca automática de estilo (levada e bpm) a partir do nome da música usando Cloud Functions e integrações externas.
- [ ] Implementar módulo completo de Edição de Músicas (reordenar e excluir acordes individualmente).
- [ ] Sugestão de Auto-Completar no campo de busca (ex: ao digitar "C", listar C, C#, Cmaj7, etc).
