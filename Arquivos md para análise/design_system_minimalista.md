# Design System Minimalista — Guia Visual (Padrão QBEE)

Este documento mapeia todos os padrões visuais, tokens e truques de CSS (animações, glassmorphism e layout de tela inteira) que usamos no app atual. Use isso como um **"Guia de Estilo (Style Guide)"** para recriar a mesma experiência premium no seu novo aplicativo.

---

## 1. O Segredo do Fundo (Aura Dinâmica)
O aspecto premium do app não vem de cores chapadas, mas de um fundo dinâmico e imersivo. O fundo (`body`) possui cores base sólidas, mas recebe esferas grandes borradas (blobs) que flutuam lentamente.

### Implementação:
1.  **Blobs (Esferas Borradas):** São divs com `border-radius: 50%` e `filter: blur(90px)`. Elas ficam em um container `position: fixed; inset: 0; z-index: -1` atrás de tudo.
2.  **Animação Suave:** Uma animação `@keyframes float` move as esferas vagarosamente no eixo X e Y.
3.  **Tons sobre Tons:** Usamos `radial-gradient` no CSS do `body` e transparências sutis (ex: `rgba(124, 58, 237, 0.14)`) para criar a "aura".

---

## 2. Paleta de Cores e Tokens (CSS Variables)
Sempre declare as cores na raiz `:root` (Tema Claro) e crie uma variação (ex: `body.dark-theme`) para redefinir as variáveis. 

*   **Fundos (Backgrounds):** Evite branco e preto puros. O claro usa `#F1EEF7` (um tom gélido/lilás muito claro). O escuro usa `#0E0B1A` (um roxo quase preto).
*   **Superfícies (Glass):** Os modais e cards usam branco ou preto transparentes (`rgba(255,255,255, 0.55)`) para deixar o fundo dinâmico transparecer.
*   **Destaque (Accent):** 
    *   Primária: `#7C3AED` (Violeta)
    *   Secundária: `#DB2777` (Magenta)
*   **Bordas (Hairlines):** Linhas muito finas e sutis `border: 1px solid rgba(23, 21, 38, 0.09)`.

---

## 3. O Componente Principal: Painel de Vidro (Glassmorphism)
Este é o coração do design minimalista. Todas as telas (`.glass-panel`) flutuam no centro da tela (no Desktop) ou ocupam a tela toda (no Mobile) usando o efeito de vidro fosco.

### A Fórmula do Glassmorphism perfeito:
```css
.glass-panel {
    /* O Fundo transparente */
    background: rgba(255, 255, 255, 0.66); 
    
    /* O desfoque mágico (funciona no Safari com prefixo -webkit-) */
    backdrop-filter: blur(22px) saturate(150%);
    -webkit-backdrop-filter: blur(22px) saturate(150%);
    
    /* Borda e Sombra suaves */
    border: 1px solid rgba(23, 21, 38, 0.09);
    border-radius: 26px; /* Cantos bem arredondados */
    box-shadow: 0 24px 60px -20px rgba(55, 18, 92, 0.13);
}
```
*Dica:* Quando for Tema Escuro, a borda deve ser `rgba(255, 255, 255, 0.10)` e o fundo `rgba(31, 25, 51, 0.55)`.

---

## 4. Tipografia e Inputs
*   **Fonte Base:** Google Fonts: `Outfit`. Usamos pesos 300, 400, 500, 600, 700. Ela é limpa e geométrica.
*   **Inputs Elegantes (`.glass-input`):**
    *   Sem bordas duras nativas (`outline: none`).
    *   Fundo levemente escurecido ou clareado: `background: rgba(23, 21, 38, 0.035)`.
    *   Ao focar (`:focus`): A borda muda para a cor primária (`#7C3AED`) e adicionamos uma "aura" ao redor do input: `box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12)`.

---

## 5. Botões Modernos e Micro-animações

### Botão Primário (`.btn-primary`)
Os botões não são chapados, eles reagem ao usuário e parecem físicos.
*   **Formato:** Arredondamento moderado (`border-radius: 11px`), preenchimento generoso (`padding: 15px 18px`), fonte em negrito (`font-weight: 700`).
*   **Interação (Hover & Active):**
    *   Sobe levemente: `transform: translateY(-2px);`
    *   A sombra aumenta: `box-shadow: 0 18px 34px -14px ...`
    *   Ao clicar (`:active`), ele desce: `transform: translateY(0);`
*   **Brilho (Shine Effect):** Um feixe translúcido (`::after` pseudo-element com `linear-gradient`) passa pelo botão ao fazer `hover`.
*   **Tema Escuro:** Em vez de cor sólida, o botão primário no dark mode recebe um degradê dinâmico `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`.

### Botão Secundário (`.btn-secondary`)
*   Fundo transparente, apenas borda e texto. No `:hover`, ele ganha o fundo translúcido da cor primária.

---

## 6. Layout de "App Nativo" (Mobile)

Para que o site pareça um aplicativo instalado (mesmo no navegador):
1.  **Tela Inteira:** No celular, a classe `.glass-panel` perde os cantos arredondados inferiores, se prende ao topo e fundo da tela (`width: 100%; min-height: 100vh; border-radius: 0 0 26px 26px`), removendo a sensação de "site flutuante" que existe no Desktop.
2.  **Bottom Navigation (Barra de Navegação Inferior):**
    *   Fica colada no final da tela (`position: fixed; bottom: 14px;`).
    *   A barra em si tem o formato de "Pílula" (Pill) flutuante (`border-radius: 100px; max-width: 460px`), imitando a navegação do iOS e Android modernos.
3.  **Modais estilo Bottom-Sheet:**
    *   Quando um modal abre no mobile, ele não aparece no meio da tela. Ele "desliza" de baixo para cima (`transform: translateY(100%) -> translateY(0)`) e fica colado na base com cantos superiores redondos.

---

## 7. Transições Gerais (O toque premium)
Praticamente todo elemento no aplicativo tem `transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1)`.
Sempre que uma nova tela carrega, ela não "pisca". Ela entra com uma animação de fade e sobe de baixo para cima (Keyframes `rise` ou `fadeIn`), o que tira completamente a percepção de ser uma página web comum.
