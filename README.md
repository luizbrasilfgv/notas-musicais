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

### 3. Voice-Leading Inteligente (Condução de Vozes)
- O aplicativo contém um algoritmo de **Voice-Leading** baseado no "centro de gravidade MIDI" das notas.
- Ao salvar um acorde num repertório, ele analisa a distância das mãos em relação ao acorde anterior.
- Sugere (e toca) automaticamente a inversão que exige o *menor deslocamento da mão* (Voice-Leading perfeito).

### 4. Repertório (Setlists) e Transposição
- Criação ilimitada de Músicas/Setlists.
- Permite ir no Dicionário e "Adicionar à Música", construindo passo a passo a harmonia das canções.
- O modo "Tocador" rola a música mostrando os mini-teclados para execução rápida ao vivo.
- **NOVO:** Sistema de Transposição de Tom (Accordion dinâmico) diretamente na tela da música. Permite subir ou descer o tom em semitons (+½, −½) e salvar o novo tom definitivamente.

### 5. Biblioteca Pessoal (Favoritos)
- Adição de acordes "coringas" aos favoritos clicando no botão `⭐ Favoritar`.
- O app salva a cifra exata E a inversão exata selecionada.
- Integração "One-Click Restore": Clicar num acorde favorito redireciona para o Dicionário, recriando a visualização exata.

### 6. Design System Premium (Glassmorphism)
- Interface de usuário (UI) construída com a estética contemporânea **Glassmorphism**.
- Suporte a temas dinâmicos: **Aurora Violeta** (Modo Escuro) e **Café Âmbar** (Modo Claro).
- Tipografia moderna otimizada para alta legibilidade (Outfit).
- Micro-interações e animações (Accordion de transposição, botões de pill fluídos).

### 7. PWA e Modo Offline
- Configurado como **Progressive Web App (PWA)** no `manifest.json`, com ícones otimizados (maskable).
- Instalável na tela inicial do Android e iOS como um aplicativo nativo.
- Possui um `sw.js` (Service Worker) otimizado com cache busters agresivos para atualizações imediatas (Stale-while-revalidate modificado). Funciona **100% offline**.

---

## 💻 Arquitetura Técnica

O projeto é mantido da forma mais leve e escalável possível, sem depender de frameworks pesados de frontend (como React ou Vue), garantindo máxima performance:

- **Frontend**: HTML5, Vanilla JavaScript (`app.js`) e CSS Customizado (`styles.css`).
- **Design/Estilização**: Arquitetura orientada a Design Tokens e variáveis CSS.
- **Teoria Musical**: `data.js` alimenta dicionários de intervalos, enquanto as lógicas de Parse de notas, cálculo de acordes, transposição e formatação MIDI rodam em tempo real no `app.js`.
- **Backend / Autenticação**: Integrado ao Firebase (Auth e Firestore) para controle de acesso (Login via Google e Gatekeepers) e sincronização de dados.
- **Hospedagem**: Infraestrutura Firebase Hosting configurada com multi-sites (Target: `dicionarionotas`).

## 📁 Estrutura de Arquivos Relevantes
- `public/index.html` — O SPA (Single Page Application) que contém as telas e lógicas de roteamento ocultas.
- `public/styles.css` — Estilizações com Design Tokens de Glassmorphism, temas claro/escuro e breakpoints responsivos.
- `public/app.js` — Core da aplicação (Event Listeners, Motor de Teoria Musical, Algoritmo MIDI, Manipulação do DOM).
- `public/data.js` — Base de dados teórica contendo intervalos musicais e construtores primários.
- `public/manifest.json` e `public/sw.js` — Configuração PWA e gestão de cache local para suporte Offline.
- `firebase.json` — Configuração oficial de deploy, cache-control avançado e regras de hosting.

## 🤝 Próximos Passos (Backlog)
- [ ] Implementar módulo completo de Edição de Músicas (reordenar e excluir acordes individualmente).
- [ ] Refinar a leitura UX de multiplas notas em visão de Chips/Lista para evitar scroll horizontal em músicas longas.
- [ ] Sugestão de Auto-Completar no campo de busca (ex: ao digitar "C", listar C, C#, Cmaj7, etc).

---
*Documentação atualizada.*
