# Objetivo
Consertar o salvamento em nuvem, melhorar a usabilidade da criação de músicas e corrigir bugs visuais apontados no desktop.

## User Review Required
> [!IMPORTANT]
> A principal causa de suas músicas não estarem sendo salvas no celular (e do botão favoritos parecer quebrado em alguns casos) é que o módulo que criei estava salvando apenas na Memória Interna (Local Storage) e não estava se conectando à Nuvem (Firestore). O plano abaixo resolve isso de forma definitiva.

## Open Questions
> [!TIP]
> Sobre a experiência de criar músicas: para ficar mais limpo e não travar, vou remover os teclados gigantes que apareciam ENQUANTO você digitava. Enquanto você estiver criando a música, aparecerão apenas as "Fichas/Chips" dos acordes reconhecidos embaixo de cada linha. Quando você clicar em "Salvar", aí sim você vai para a tela de Execução, onde verá a música completa na Visão 1 (Teclados) ou Visão 3 (Chips/Player). Podemos seguir assim?

## Proposed Changes

### 1. Refatoração da Sincronização em Nuvem (`app.js`)
- **[MODIFY] app.js**
  - Remover variáveis locais separadas (`musicas`, `acordesFavoritos`).
  - Centralizar tudo em um objeto de estado global `DADOS_NUVEM = { musicas: [], favoritos: [] }`.
  - Atualizar o ouvinte `onSnapshot` (que puxa da nuvem) para ler esses campos e acionar a renderização das listas.
  - Atualizar a função `agendarSalvar()` para gravar o objeto inteiro no Firestore em um único documento por usuário.
  - Atualizar o botão de Salvar Música e de Favoritar Acorde para simplesmente adicionar ao `DADOS_NUVEM` e chamar `agendarSalvar()`.

### 2. Melhoria no Construtor de Música (`app.js` e `index.html`)
- **[MODIFY] app.js**
  - Na função que processa o texto digitado (`gerarHtmlTecladosSecao`), remover a chamada de renderização pesada de teclados visuais. 
  - Substituir pela renderização de simples "Chips" mostrando quais acordes o sistema conseguiu identificar. Isso deixará a digitação super rápida e a tela mais limpa.

### 3. Ajuste do Toggle e Visões (Opção 1 e Opção 3) (`app.js`)
- **[MODIFY] app.js**
  - Garantir que a barra de abas "Opção 1 (Lista) / Opção 3 (Chips)" apareça sempre que você abrir uma música já salva.
  - Ocultar a barra de "Setlists / Favoritos" enquanto a música estiver aberta, para não poluir a tela.

### 4. Correção do Botão Favoritos no Desktop (`index.html`)
- **[MODIFY] index.html**
  - Ajustar o CSS e os eventos do botão da aba "Favoritos" dentro de Repertório para evitar que cliques no Desktop sejam ignorados (remover bloqueios invisíveis de z-index ou pointer-events).

## Verification Plan
1. Criar uma música no Desktop e verificar se os teclados pararam de atrapalhar a digitação.
2. Confirmar que a música salvou (ela aparecerá na lista de Músicas).
3. Abrir o celular e verificar se a música recém-criada apareceu lá magicamente (graças à nuvem corrigida).
4. Abrir a música e testar a alternância entre a Visão 1 e a Visão 3.
