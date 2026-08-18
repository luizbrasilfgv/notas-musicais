# Mapeamento Técnico e Arquitetura - QBEE (Que Aplicativo é Esse?!)

Este documento contém o relatório detalhado da infraestrutura e arquitetura do aplicativo, baseado na análise do código atual (`index.html`, `app_v2.js`, `manifest.json`, `firebase.json` e `firestore.rules`).

---

## 1. Progressive Web App (PWA) e Instalação

### Instalabilidade
O aplicativo foi configurado para ser instalável através do arquivo `manifest.json`. Ele define o modo de exibição como `standalone`, permitindo que o PWA seja "instalado" (Adicionado à Tela Inicial) e rode em janela própria sem a barra de endereços do navegador.

### Service Worker (`sw.js`) e Cache
> [!IMPORTANT]
> **Não existe nenhum `sw.js` ou Service Worker registrado no seu projeto.** 

Por consequência, o aplicativo não utiliza as estratégias convencionais de cache offline (como *Network First*, *Cache-only* ou *Stale-while-revalidate*). O app depende 100% da rede para carregar o HTML/JS e do cache nativo do navegador para assets estáticos.

### Atualizações de Versão
Como não há Service Worker, a atualização do código não é feita por avisos de atualização ("Novo código disponível"). Em vez disso, a arquitetura utiliza **Cache-Busting por Query String**. Sempre que um deploy é feito, as URLs dos arquivos principais no HTML são alteradas, forçando o navegador a baixar a versão nova.

**Trecho Essencial (`index.html`):**
```html
<link rel="manifest" href="manifest.json">
<!-- Os parâmetros ?v=103 e ?v=104 forçam o download do novo código -->
<link rel="stylesheet" href="style.css?v=103">
<script src="app_v2.js?v=104"></script>
```

---

## 2. Firebase, Banco de Dados e Sincronização

### Banco Utilizado e Persistência Offline
O serviço utilizado é o **Firestore** (via SDK Web Modular v10 em modo compat).

Nós **não utilizamos** a persistência offline nativa do Firebase SDK (`enableIndexedDbPersistence()`). Toda leitura e gravação exige conexão com a internet. Isso garante que o app instalado (WebAPK ou Atalho no iOS) nunca leia dados obsoletos armazenados no cache local. Toda vez que uma tela é atualizada, ela busca os dados frescos do Firestore.

### Armazenamento Local
O uso do `localStorage` no projeto é restrito a flags de UI e configurações menores, como:
- Preferência de tema (`qbee-theme`)
- Controle de pop-up de instalação (`qbee_ios_prompt_dismissed`)
- Controle de exibição da última notificação do financeiro (`last_fin_notif`)

---

## 3. Autenticação, Perfis (Auth) e RBAC

### Fluxo de Login e Persistência
O fluxo de autenticação utiliza o **Firebase Authentication** (login por e-mail e senha via `auth.signInWithEmailAndPassword()`). 

Como nenhuma configuração explícita de `setPersistence` foi declarada, o Firebase Web assume o padrão: **Local Persistence** (armazenado via IndexedDB no navegador). A sessão do usuário persiste indefinidamente, mesmo se ele fechar e reabrir o app.

### WebAPK vs Navegador Web
Um *WebAPK* (app instalado no Android) é essencialmente um "Chrome Custom Tab" encapsulado. Ele compartilha o mesmo repositório de cookies e IndexedDB do Google Chrome. Portanto, se o usuário logou no Chrome web, ele abrirá o app instalado já logado. Não há chance de gerar um `UID` diferente se a conta de e-mail for a mesma. No iOS, no entanto, o app instalado (via Safari) funciona em um contêiner isolado, exigindo que o usuário faça o login novamente na primeira vez.

### Regras de Acesso e Perfis (Roles)
O aplicativo possui um forte sistema de controle de acesso baseado em cargos (RBAC). O documento do usuário na coleção `integrantes` possui um campo `roles` (ex: `['member', 'admin', 'financeiro']`).

**Trecho Essencial (`firestore.rules`):**
Essas regras no servidor validam rigidamente quem tem permissão de diretoria e bloqueiam qualquer escalada de privilégios.
```javascript
function isDirector() {
  return isLoggedIn() && (
    hasRole('admin') || hasRole('financeiro') || hasRole('logistica')
    || hasRole('harmonia') || hasRole('producao')
  );
}

function validRolesIfPresent() {
  return !request.resource.data.keys().hasAny(['roles'])
    || (request.resource.data.roles is list
      && request.resource.data.roles.hasOnly(['member', 'admin', 'financeiro', 'logistica', 'harmonia', 'producao']));
}
```

---

## 4. Gerenciamento de Estado e Listeners

A arquitetura do QBEE mescla carregamentos sob demanda (`get()`) com um uso intenso de **Listeners em Tempo Real (`onSnapshot`)**. 

Isso garante que informações críticas (como aprovação de pagamentos, mudança de nível de acesso ou novos avisos) sejam injetadas imediatamente na tela do usuário, sem necessidade de *refresh*.

**Trecho Essencial (`app_v2.js`):**
```javascript
// O listener observa o documento do próprio usuário. Qualquer mudança no banco 
// dispara o bloco interno, atualizando as variáveis de memória e a interface.
db.collection('integrantes').doc(user.uid).onSnapshot((doc) => {
    if (doc.exists) {
        const userData = doc.data();
        window.currentUserData = userData;
        
        // Exemplo: redesenha o perfil ou altera estado financeiro em tempo real
        renderPerfil(); 
    }
});
```

---

## 5. Inicialização (Bootstrap)

A inicialização do aplicativo é ditada pelo observador de estado do Firebase Auth (`onAuthStateChanged`). O HTML nasce com o esqueleto base oculto. 

**Ordem cronológica:**
1. O navegador processa o `index.html`.
2. Baixa os scripts do Firebase (`firebase-app-compat.js`, `auth`, `firestore`) via CDN.
3. Carrega e executa o `app_v2.js`.
4. O Firebase verifica o IndexedDB local e dispara o evento `onAuthStateChanged`.
5. Se autenticado, o JS oculta o painel de Auth, puxa os dados do usuário e exibe o Dashboard correto (baseado nas roles).

**Trecho Essencial (`app_v2.js`):**
```javascript
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Usuário logado: Carrega o contexto e mostra o sistema
        document.getElementById('auth-view').classList.remove('active');
        await carregarSistema(); // Função hipotética que orquestra a carga
        document.getElementById('dashboard-view').style.display = 'block';
    } else {
        // Usuário deslogado: Mostra o painel de login
        document.getElementById('dashboard-view').style.display = 'none';
        document.getElementById('auth-view').classList.add('active');
    }
});
```

---

## 6. Resumo Arquitetural: A Garantia de Atualização (Deploy)

> [!TIP]
> A principal decisão arquitetural deste PWA é a **ausência intencional do Service Worker** combinada com **Cabeçalhos de Controle de Cache restritos no Servidor**.

Ao abrir mão do suporte offline para assets HTML/JS, o aplicativo garante 100% de consistência. As configurações no Hosting informam a qualquer navegador e provedor de internet que é proibido fazer cache da página `index.html`. Toda vez que o ícone do aplicativo é clicado, o celular baixa o HTML mais recente diretamente dos servidores do Firebase. Este novo HTML puxa os novos arquivos CSS e JS devido à mudança nas *query strings* (`?v=...`), aplicando o novo código instantaneamente na tela do usuário.

**Trecho Essencial (`firebase.json`):**
```json
"headers": [
  {
    "source": "**/index.html",
    "headers": [
      {
        "key": "Cache-Control",
        "value": "no-cache, no-store, must-revalidate"
      }
    ]
  }
]
```
