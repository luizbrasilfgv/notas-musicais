/* ============================================================================
   PATCH DE HTML INLINE — app.js
   Só template string mudou. Nenhum id, dataset, listener ou fluxo foi alterado.
   ========================================================================== */


/* ============================================================================
   BLOCO 1 — CABEÇALHO DA MÚSICA
   Em atualizarHeaderMusica(): substituir APENAS o <div class="visao-header">
   ... </div> dentro de container.innerHTML. O .transpose-card continua igual.

   O que mudou: as ações saíram de dentro da fileira do título (era isso que
   encavalava) e passaram a ser a segunda fileira do cabeçalho.
   .tom-badge ficou só no botão de tom — é ele que tem seta de "abre painel".
   ========================================================================== */
`
      <div class="visao-header">
        <div class="vh-top">
          <button class="btn btn-icone" id="voltarListaMusicas" aria-label="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div class="visao-titulos">
            <small>Repertório</small>
            <h2>${musicaAtual.nome}</h2>
          </div>
          <button class="btn btn-icone edit-musica" data-id="${musicaAtual.id}" aria-label="Editar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
        <div class="vh-acoes">
          <button class="vh-chip" id="btnAnaliseToggle"><i>💡</i>Analisar</button>
          <button class="vh-chip" id="btnSoloToggle"><i>🎸</i>Como Tocar</button>
          <button class="tom-badge" id="btnTomToggle">Tom ${tom}</button>
        </div>
      </div>
`


/* ============================================================================
   BLOCO 2 — AULA PRÁTICA
   Substituir a função montarComoTocarHTML() inteira pela versão abaixo.
   Mesma lógica, mesmos data-* dos botões de áudio; só o markup ficou enxuto.
   ========================================================================== */
function montarComoTocarHTML(musica, tom, rel) {
  if (!rel.fluxo || !rel.fluxo.length) {
    return `<div class="rh-vazio">Adicione acordes para ver dicas de execução.</div>`;
  }

  const fluxo = rel.fluxo;
  const acordesNoTom = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "i", "ii°", "III", "iv", "v", "VI", "VII"];

  let hasTension = false;
  let hasOutside = false;

  fluxo.forEach(f => {
    const grau = window.calcularGrau ? window.calcularGrau(f.cifra, tom) : "I";
    if (grau.includes("V/") || grau.includes("°") || grau.includes("aug")) hasTension = true;
    if (!acordesNoTom.includes(grau.replace(/7$/, ""))) hasOutside = true;
  });

  let notasEscalaStr = "";
  if (window.AudioSynth && window.AudioSynth.getNotasEscala) {
    notasEscalaStr = window.AudioSynth.getNotasEscala(tom).join(",");
  } else {
    let t = tom.replace(/m7?$/, "");
    notasEscalaStr = `${t}4,E4,G4,${t}5`;
  }

  let fluxoMini = fluxo.slice(0, 4);
  let fluxoJSON = JSON.stringify(fluxoMini).replace(/"/g, '&quot;');

  const textoCama = hasTension
    ? `A progressão tem muita tensão e pede impacto. <br><br><b>O que fazer:</b> Toque os acordes inteiros na região média do teclado, batendo as notas de forma mais rápida (staccato) junto com a bateria. Essa pegada rítmica é que dá o peso necessário na pista!`
    : `A música é reta e bem estável. <br><br><b>O que fazer:</b> Em vez de só "fazer cama parada", toque os acordes em blocos sincopados. Deixe a mão marcar o groove tocando as notas do acorde todas juntas no ritmo 4/4.`;

  let arpejoHTML = `
    <section class="ct-card">
      <div class="ct-card-head">
        <h3 class="ct-card-tit"><span>🎹</span>O Peso do Groove <em>Cama</em></h3>
        <button class="ct-play btn-play-exemplo" data-fluxo="${fluxoJSON}" data-modo="progressao" data-kbd="kbd-groove" aria-label="Ouvir Cama">Ouvir Cama 4/4</button>
      </div>
      <p class="ct-txt">${textoCama}</p>
      <div class="ct-kbd">${renderizarTecladoVisor("kbd-groove")}</div>
    </section>
  `;

  let escalaMaior = `${tom} Maior`;
  let escalaPentatonica = `Pentatônica de ${tom} Maior`;
  if (tom.endsWith("m") || tom.endsWith("m7")) {
    const root = tom.replace(/m7?$/, "");
    escalaMaior = `${root} Menor Natural`;
    escalaPentatonica = `Pentatônica de ${root} Menor`;
  }

  let soloHTML = `
    <section class="ct-card">
      <div class="ct-card-head">
        <h3 class="ct-card-tit"><span>🎸</span>O Momento do Solo</h3>
        <button class="ct-play btn-play-exemplo" data-notas="${notasEscalaStr}" data-modo="lick" data-kbd="kbd-solo" aria-label="Ouvir Solo">Ouvir Lick</button>
      </div>

      <p class="ct-txt"><b class="ct-sub">A Escala Mágica</b>
        Na hora do solo no Keytar, as notas são tocadas soltas criando melodias (Licks). Use a <b>${escalaPentatonica}</b>. Ouça o lick suingado no botão acima e veja as teclas acenderem para decorar.
      </p>
  `;

  if (hasOutside || hasTension) {
    soloHTML += `
      <div class="ct-alerta">
        <div class="ct-alerta-tit">⚠️ O Acorde Perigoso!</div>
        <p>No meio da música existem acordes que saem da escala padrão. Quando a música chegar neles, não toque o Lick na pentatônica inteira. <b>O truque:</b> Solfeje apenas as notas desse acorde separadas!</p>
      </div>
    `;
  }

  soloHTML += `
      <p class="ct-txt ct-bloco"><b class="ct-sub">A Regra de Ouro</b>
        Respire! Sempre termine sua frase musical "pousando" o dedo na Tônica do acorde atual.
      </p>
      <div class="ct-kbd">${renderizarTecladoVisor("kbd-solo")}</div>
    </section>
  `;

  return `
    <header class="rh-head ct-head">
      <div class="ct-head-row">
        <div class="ct-head-id">
          <div class="rh-eyebrow">Aula Prática · Keytar</div>
          <h1 class="ct-titulo">${window.esc ? window.esc(musica.nome) : musica.nome}</h1>
        </div>
        <span class="rh-pill rh-pill-on">${window.esc ? window.esc(tom) : tom}</span>
      </div>
    </header>
    <div class="ct-wrap">
      ${arpejoHTML}
      ${soloHTML}
    </div>
  `;
}
