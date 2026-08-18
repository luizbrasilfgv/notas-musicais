# Mapeamento Técnico e Arquitetura - Quem Paga o Café

Este documento detalha a infraestrutura e arquitetura construídas para o aplicativo **Quem Paga o Café**, respondendo às principais questões sobre PWA, Banco de Dados, Autenticação, Sincronização e Inicialização.

## 1. Progressive Web App (PWA) e Caching

### Como foi configurado para ser instalável
Para que o navegador reconheça a aplicação como instalável (WebAPK no Android ou app no iOS/Desktop), duas coisas foram implementadas: o arquivo de manifesto (`manifest.json`) com os metadados visuais, e um Service Worker (`sw.js`) ativo para prover capacidade offline.

**Trecho do `manifest.json`:**
O arquivo define o escopo, modo standalone (sem barra de navegação do browser) e os ícones obrigatórios para instalação:
```json
{
  "name": "Quem Paga o Café?",
  "short_name": "Quem Paga?",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a100c",
  "theme_color": "#1a100c",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
```

### Estratégia de Cache e Atualização (`sw.js`)
O aplicativo utiliza uma combinação de estratégias para equilibrar performance e atualização em tempo real:
1. **Network First, falling back to Cache (Navegação):** Para buscar a página HTML principal (`req.mode === "navigate"`).
2. **Stale-while-revalidate (Assets estáticos):** Para imagens e outros recursos locais. Ele retorna instantaneamente o que está no cache e faz um fetch assíncrono para atualizar.
3. **Network Only (Firebase):** As rotas de API do Google/Firebase nunca são cacheadas (lista `SEMPRE_REDE`).

Não há código no HTML que force a atualização de forma ativa (como um listener de `controllerchange`). A mágica arquitetural para forçar a atualização imediata quando há deploy no Firebase Hosting ocorre no próprio `sw.js`, usando `self.skipWaiting()` e limpando os caches pela variável `VERSAO`:

```javascript
const VERSAO = "quempaga-v4";
const SEMPRE_REDE = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com"
];

// Instala e toma o controle na mesma hora
self.addEventListener("install", e => {
  e.waitUntil( /* ... */ .then(() => self.skipWaiting()) );
});

// Purga o cache da versão antiga e força o controle
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys() 
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
```

A principal diferença arquitetural que garante atualizações rápidas é combinar essa troca de `VERSAO` no SW com o **Network First** para as requisições de navegação, impedindo que o esqueleto fique "preso" num cache antigo.

---

## 2. Firebase e Banco de Dados

### Serviço Utilizado
Estamos utilizando o **Cloud Firestore** (banco de dados NoSQL orientado a documentos).

### Leitura, Gravação e Persistência Offline
Toda a gravação é feita sobrescrevendo documentos (via `setDoc` ou `updateDoc`) nos nós específicos (`/config/participants` e `/data/coffee`). 

O sistema **não utiliza** a persistência offline nativa (como `enableIndexedDbPersistence`). Dessa forma, as leituras são feitas estritamente via internet. Associado à regra `SEMPRE_REDE` no Service Worker, isso garante que o app instalado (WebAPK) **não fique lendo dados velhos locais**. Toda chamada feita buscará a verdade absoluta na nuvem; sem internet, a chamada simplesmente falha.

---

## 3. Autenticação e Perfis (Auth)

### Fluxo de Autenticação e Armazenamento da Sessão
A entrada é gerenciada pelo Firebase Auth através do provedor do Google (`GoogleAuthProvider`), chamando o método `signInWithPopup`.
A sessão é persistida localmente no navegador/dispositivo através do padrão do Firebase Web, que é a persistência `browserLocalPersistence` usando o `IndexedDB`.

### Conflito WebAPK (App instalado) vs Navegador Web
Quando o usuário instala o app (WebAPK no Android), esse app roda num container isolado do Chrome principal. Portanto, **o usuário terá que fazer login novamente no app instalado**. Porém, se ele usar a *mesma* conta Google que usa no navegador, o Firebase Auth irá processar o mesmo login e o **UID gerado será exatamente o mesmo**. Não há risco de conflito de contas se o email Google subjacente for idêntico.

### Regras de Acesso e Criação do Documento de Usuário
Há um sistema de roles e status atrelado a cada usuário. A criação desse documento (e definição da role) é gerenciada ativamente dentro do ouvinte de estado da autenticação (`onAuthStateChanged`):

```javascript
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        unsubUser = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                let userData = docSnap.data();
                
                // Se aprovado, destrava o hub do app
                if (userData.status === 'approved') {
                    // ... lógicas de exibição e injeção do HTML
                    setupRoleBasedUI(); // Libera UI baseada nas roles
                    initApp();
                } 
            } else {
                // Criação do documento do novo usuário
                const isMaster = user.email === 'luizbrasil.rj@gmail.com';
                const fallbackRoles = isMaster ? ['member', 'admin'] : ['member'];
                
                setDoc(userDocRef, {
                    email: user.email,
                    status: isMaster ? 'approved' : 'pending',
                    roles: fallbackRoles
                });
            }
```

---

## 4. Gerenciamento de Estado e Sincronização

O aplicativo mantém os dados sincronizados em tempo real através de **listeners (onSnapshot)** do Firestore. Não há carregamento estático sob demanda com `getDoc`.

O estado é reativo: se um participante é alterado ou um novo café é pago, o `onSnapshot` dispara, atualizando os dados e engatilhando os métodos de repintura do DOM (ex: `renderCheckboxes()`, `calculateAndRender()`).

```javascript
function initApp() {
    // Escuta as configurações (lista de participantes) em tempo real
    unsubConfig = onSnapshot(configDocRef, (docSnap) => {
        if (docSnap.exists()) {
            participantNames = docSnap.data().participants || [];
        }
        renderCheckboxes();
        calculateAndRender();
    });

    // Escuta os dados principais em tempo real
    unsubData = onSnapshot(coffeeDocRef, (docSnap) => {
        if (docSnap.exists()) {
            events = docSnap.data().events || [];
        }
        calculateAndRender();
        renderLog();
    });
}
```

---

## 5. Processo de Inicialização (Bootstrap)

A ordem de inicialização do aplicativo é feita em etapas bloqueantes para garantir a segurança da interface e dos dados:

1. **Injeção de Assets e PWA:** O browser carrega o HTML e o CSS. A tag `<script>` finaliza e aciona o registro do Service Worker.
2. **Inicialização do Firebase:** O script tipo "module" carrega e inicializa as instâncias de App, Firestore e Auth.
3. **Bloqueio Visual Nativo:** A interface principal (`mainApp`) nasce com a classe `.hidden`. Apenas a tela de login fica visível.
4. **Verificação de Identidade (Auth):** O Firebase lê o `IndexedDB` e dispara o `onAuthStateChanged`.
5. **Verificação de Integridade e Status:** Se o usuário existe, o `onSnapshot` consulta o Firestore para verificar se seu `status` é `approved`.
6. **Desbloqueio e Injeção (initApp):** Apenas após ser verificado como `approved`, a UI principal tem a classe `.hidden` removida e a função `initApp()` é chamada, pendurando os listeners de dados que desenham efetivamente a aplicação.

```javascript
// Lógica de Registro no index (quempagaocafe.html)
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
```
