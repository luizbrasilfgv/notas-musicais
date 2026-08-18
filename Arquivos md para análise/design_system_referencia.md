# Guia Visual e Design System - Padrão "Quem Paga o Café"

Este documento compila a identidade visual, padrões de CSS, botões e layout de tela cheia utilizados no aplicativo. Você pode usar estas classes e regras como base para construir a interface minimalista e imersiva do seu novo aplicativo.

## 1. Variáveis de Cor e Tipografia (Root)
Toda a paleta de cores é baseada em tons escuros e elegantes, com um destaque primário forte.
A fonte utilizada é a **Outfit** (do Google Fonts), que traz um tom moderno e minimalista.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');

:root {
    --bg-color: #1a100c; /* Fundo base (café muito escuro) */
    --surface-color: rgba(62, 39, 35, 0.7); /* Fundo dos cartões (efeito vidro) */
    --surface-border: rgba(255, 213, 79, 0.2); /* Borda sutil dos cartões */
    --primary-color: #FFD54F; /* Amarelo principal (destaque) */
    --primary-hover: #ffc107; 
    --text-main: #fdf5e6; /* Texto principal (off-white agradável) */
    --text-muted: #d7ccc8; /* Texto secundário */
    --danger: #ef5350; /* Vermelho padrão */
    --success: #81c784; /* Verde padrão */
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
```

---

## 2. Estrutura Base e Abertura em Tela Inteira
Para conseguir o efeito imersivo de "App" ocupando toda a tela, com o conteúdo perfeitamente centralizado e um fundo com gradiente sutil:

```css
body {
    /* Gradiente radial ou linear escuro */
    background: linear-gradient(135deg, var(--bg-color) 0%, #2e1c15 100%);
    color: var(--text-main);
    
    /* Configuração chave para ocupar 100% da altura da tela (Full-screen) */
    min-height: 100vh;
    display: flex;
    justify-content: center; /* Centraliza horizontalmente */
    /* align-items: center; -> Use se quiser o card verticalmente no centro absoluto */
    
    padding: 1rem;
    padding-bottom: 80px; /* Importante se usar botões fixos no rodapé (Bottom Tabs) */
}
```

---

## 3. Containers e Glassmorphism (Minimalismo)
O principal segredo do visual premium é o `backdrop-filter: blur`, criando um efeito de vidro fosco (Glassmorphism) nos cartões principais.

```css
.app-container {
    background: var(--surface-color); /* Cor semi-transparente */
    backdrop-filter: blur(16px); /* O famoso efeito de desfoque no fundo */
    -webkit-backdrop-filter: blur(16px);
    
    border: 1px solid var(--surface-border);
    border-radius: 24px; /* Bordas bem arredondadas, moderno */
    padding: 1.5rem;
    width: 100%;
    max-width: 480px; /* Limita a largura em PCs, ideal para mobile-first */
    box-shadow: 0 20px 40px rgba(0,0,0,0.5); /* Sombra profunda para destacar do fundo */
    margin: auto; /* Ajuda a centralizar caso body flex não atue */
}
```

---

## 4. Botões (Calls to Action)
Os botões seguem um padrão com fonte "Bold/Black" (`font-weight: 800`), caixa alta (`text-transform: uppercase`) e transições suaves ao passar o mouse ou clicar.

```css
/* Estilo Base para botões principais */
.primary-btn, .secondary-btn, .danger-btn {
    width: 100%; 
    padding: 1rem; 
    border: none; 
    border-radius: 12px; 
    font-size: 1.1rem;
    font-weight: 800; 
    cursor: pointer; 
    transition: all 0.3s ease; 
    text-transform: uppercase; 
    letter-spacing: 1px;
}

/* Botão Principal de Ação (Amarelo, chama muita atenção) */
.primary-btn { 
    background: var(--primary-color); 
    color: #3e2723; /* Texto escuro contrastando com fundo claro */
    box-shadow: 0 4px 15px rgba(255, 213, 79, 0.3); /* Brilho em volta do botão */
}
.primary-btn:active { 
    transform: translateY(2px); /* Efeito de afundar ao clicar (mobile) */
}

/* Botão Secundário (Vazado / Fantasma) */
.secondary-btn { 
    background: rgba(255,255,255,0.1); 
    color: var(--primary-color); 
    border: 1px solid var(--primary-color); 
    margin-top: 1rem; 
}
.secondary-btn:hover {
    background: var(--primary-color);
    color: #000;
}
```

---

## 5. Inputs, Formulários e Textos Minimalistas
Campos de digitação (como senhas, datas, formulários) perdem a borda branca padrão agressiva e ganham fundos escuros semi-transparentes que se fundem ao app.

```css
/* Campos de Texto / Data / Selects */
input.minimal-input {
    background: rgba(0,0,0,0.3); 
    border: 1px solid rgba(255, 255, 255, 0.2); 
    color: var(--text-main);
    padding: 0.8rem 1rem; 
    border-radius: 8px; 
    font-size: 1.1rem; 
    font-family: inherit; 
    width: 100%;
}
input.minimal-input:focus {
    outline: none;
    border-color: var(--primary-color); /* Brilha na cor principal ao focar */
}

/* Títulos do Header */
header h1 { 
    font-size: 1.8rem; 
    color: var(--primary-color); 
    text-shadow: 0 2px 4px rgba(0,0,0,0.5); /* Sombra para leitura perfeita */
}
```

---

## 6. Modais e Pop-ups (Bottom Sheets)
Para avisos ou ações rápidas, modais com `slideUp` (que sobem do fundo da tela, estilo Android/iOS) dão um ar muito profissional, também utilizando o fundo translúcido (`backdrop-filter`).

```css
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.8); /* Fundo preto transparente */
    display: flex; 
    align-items: flex-end; /* Modal gruda embaixo na tela */
    z-index: 1000;
}

.modal-content {
    background: rgba(62, 39, 35, 0.85); /* Vidro fumê */
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    width: 100%; 
    padding: 1.5rem;
    padding-bottom: 2rem;
    border-radius: 20px 20px 0 0; /* Arredonda só o topo */
    animation: slideUp 0.3s ease-out;
}

/* Animações chave para fluidez */
@keyframes slideUp { 
    from { transform: translateY(100%); } 
    to { transform: translateY(0); } 
}
@keyframes popIn { 
    0% { transform: scale(0.5); opacity: 0; } 
    100% { transform: scale(1); opacity: 1; } 
}
@keyframes fadeIn { 
    from { opacity: 0; transform: translateY(10px); } 
    to { opacity: 1; transform: translateY(0); } 
}
```

## Resumo das Dicas de UI/UX
1. **Blur Background (Glassmorphism):** É a alma desse estilo. Use `.app-container` ou aplique o `backdrop-filter: blur(16px)` nos elementos para dar aquele acabamento moderno.
2. **Preto Profundo e Contraste:** Não use preto 100% (#000000) no fundo, use cinzas ou marrons escuros (como `#1a100c`), para não cansar os olhos.
3. **Botões Arredondados:** As bordas mais redondas (12px, 16px ou 24px) tornam o aplicativo mais simpático e clique-amigável, quebrando a rigidez.
4. **Sem bordas brutas:** Substitua bordas sólidas pesadas por fundos semi-transparentes (`rgba(0,0,0,0.3)`) em caixas e inputs.
