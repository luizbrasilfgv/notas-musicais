/* ==========================================================================
   RELATÓRIO HARMÔNICO PREMIUM — opção 3a
   Código para colar no seu app.js (Vanilla + tonal.js). Nada de framework.
   --------------------------------------------------------------------------
   ONDE COLAR — 3 passos

   1) Em app.js, dentro de atualizarHeaderMusica(), localize:

          const btnAnalise = el("btnAnaliseToggle");
          if (btnAnalise) {
            btnAnalise.onclick = () => {
              ... TODO ESTE MIOLO (gera a variável html) ...
            };
          }

      Troque o miolo do onclick pelo BLOCO 1 abaixo. Ele tem 12 linhas:
      todo o HTML saiu de lá e virou a função montarRelatorioHTML().

   2) Cole o BLOCO 2 (daqui até o fim do arquivo) no FIM do app.js,
      fora de qualquer função. Ele usa Chord / Note / calcularGrau / esc,
      que já existem no seu app.js.

   3) Cole o conteúdo de styles-relatorio.css no fim do styles.css,
      SUBSTITUINDO o bloco antigo "=== RELATÓRIO HARMÔNICO ===".

   Bônus: o campo notasHtml do motor usava window.Note, que não existe em
   módulo ES6 — por isso as notas nunca apareciam. Agora as notas são
   calculadas aqui, com enarmonia simplificada (E# vira F, F## vira G).
   ========================================================================== */


/* ==========================================================================
   BLOCO 1 — miolo de btnAnalise.onclick
   ========================================================================== */

//  btnAnalise.onclick = () => {
//    const modal = el("scr-relatorio");
//    const conteudo = el("conteudoRelatorioHarmonico");
//    if (!modal || !conteudo) return;
//
//    const tomFinal = inferirTomDaMusica(musicaAtual);
//    const rel = window.gerarRelatorioHarmonico(musicaAtual, tomFinal);
//    conteudo.innerHTML = montarRelatorioHTML(musicaAtual, tomFinal, rel);
//
//    el("scr-meus").classList.remove("active");
//    el("scr-meus").style.display = "none";
//    el("nav").style.display = "none";
//    modal.style.display = "block";
//    window.scrollTo({ top: 0 });
//    modoAnalise = false;
//  };

/* (Descomente as linhas acima e substitua o onclick antigo por elas.) */


/* ==========================================================================
   BLOCO 2 — motor visual do relatório
   ========================================================================== */

/* ---------- notas do acorde, com enarmonia simplificada ---------- */
function rhNotas(cifra) {
  const c = Chord.get(cifra);
  if (!c || c.empty) return [];
  return c.notes.map(n => Note.simplify(n) || n);
}

/* ---------- distância entre duas notas pelo caminho mais curto ---------- */
function rhDelta(a, b) {
  const ca = Note.chroma(a), cb = Note.chroma(b);
  if (ca == null || cb == null) return null;
  let d = (cb - ca + 12) % 12;
  if (d > 6) d -= 12;
  return d;                                   // -6 .. +6 (semitons)
}

const RH_INTERVALO = { 1: "meio tom", 2: "1 tom", 3: "1 tom e meio",
                       4: "2 tons", 5: "2 tons e meio", 6: "trítono" };

function rhRotuloDelta(d) {
  if (d === 0) return "nota em comum";
  return (d > 0 ? "↑ " : "↓ ") + RH_INTERVALO[Math.abs(d)];
}

/* ---------- casa cada nota do acorde A com a nota mais próxima de B ----------
   É isto que revela o "porquê": nota que fica parada, nota que sobe meio tom. */
function rhMovimentos(cifraA, cifraB) {
  const a = rhNotas(cifraA), b = rhNotas(cifraB);
  if (!a.length || !b.length) return [];
  const livres = b.slice(), movs = [];
  a.forEach(na => {
    if (!livres.length) return;
    let iMelhor = 0, dMelhor = null;
    livres.forEach((nb, i) => {
      const d = rhDelta(na, nb);
      if (d == null) return;
      if (dMelhor == null || Math.abs(d) < Math.abs(dMelhor)) { dMelhor = d; iMelhor = i; }
    });
    const nb = livres.splice(iMelhor, 1)[0];
    movs.push({ de: na, para: nb, d: dMelhor == null ? 0 : dMelhor });
  });
  return movs.sort((x, y) => Math.abs(x.d) - Math.abs(y.d));   // paradas primeiro
}

/* ---------- etiqueta curta da transição ---------- */
function rhTagTransicao(movs) {
  if (!movs.length) return "Movimento";
  const comuns = movs.filter(m => m.d === 0).length;
  if (comuns) return comuns === 1 ? "1 nota em comum" : comuns + " notas em comum";
  if (movs.every(m => m.d === movs[0].d)) return "Bloco paralelo";
  return "Vozes se cruzam";
}

/* ---------- o porquê: movimento das notas + texto do motor de análise ---------- */
function rhPorque(a, b, movs, rel) {
  const ev = (rel.eventos || []).find(e =>
    e.acordes && e.acordes[0] === a && e.acordes[1] === b);
  const comuns = movs.filter(m => m.d === 0);
  let mov = "";
  if (movs.length) {
    if (!comuns.length && movs.every(m => m.d === movs[0].d)) {
      mov = `Nenhuma nota em comum: as ${movs.length} vozes andam juntas, ` +
            `${RH_INTERVALO[Math.abs(movs[0].d)]} ${movs[0].d > 0 ? "acima" : "abaixo"}.`;
    } else if (comuns.length === 1) {
      mov = `A nota ${comuns[0].de} fica parada e as outras se acomodam por perto.`;
    } else if (comuns.length > 1) {
      mov = `${comuns.length} notas ficam paradas — a mudança é mínima.`;
    } else {
      mov = "As vozes andam em direções diferentes.";
    }
  }
  return [mov, ev ? ev.texto : ""].filter(Boolean).join(" ");
}

/* ---------- altura na curva de tensão (0 = repouso, 5 = tensão máxima) ---------- */
function rhTensao(grau) {
  const g = String(grau || "");
  if (g.includes("°")) return 5;
  if (g.includes("V/") || g.includes("V7/")) return 5;
  if (/^V7?$/.test(g)) return 4;
  if (g.toLowerCase().includes("vii")) return 4;
  if (g.toLowerCase() === "ii") return 3;
  if (g.startsWith("b")) return 3;
  if (g === "IV" || g === "iv") return 2;
  if (g.toLowerCase() === "vi" || g.toLowerCase() === "iii") return 2;
  if (g === "I" || g === "i") return 0;
  return 2;
}

/* ---------- "Tônica (I) — Estabilidade, Repouso" → partes ---------- */
function rhFuncaoPartes(txt) {
  const s = String(txt || "");
  return {
    nome: (s.split("—")[0] || "Acorde").trim(),
    desc: (s.split("—")[1] || "").trim()
  };
}
function rhFuncaoMini(txt) {
  const p = rhFuncaoPartes(txt);
  const nome = p.nome.split("(")[0].trim();
  const desc = (p.desc.split(",")[0] || "").trim().toLowerCase();
  return `${esc(nome)}${desc ? "<br>" + esc(desc) : ""}`;
}

/* ---------- a música como você salvou (= como você toca) ---------- */
function rhSecoesSalvas(musica) {
  const secs = (musica.secoes && musica.secoes.length)
    ? musica.secoes
    : [{ titulo: "Sequência", acordes: (musica.acordes || []).map(c => ({ cifra: c, valido: true })) }];

  return secs.map(s => {
    const cifras = (s.acordes || []).filter(a => a.valido !== false).map(a => a.cifra || a);
    const seq = [];
    cifras.forEach(c => {
      const ult = seq[seq.length - 1];
      if (ult && ult.cifra === c) ult.n++;
      else seq.push({ cifra: c, n: 1 });
    });
    return { titulo: s.titulo || "Seção", seq };
  }).filter(s => s.seq.length);
}

/* ---------- frase de fechamento, tirada do próprio fluxo ---------- */
function rhFrase(fluxo, graus) {
  const paralelos = [];
  for (let i = 0; i < fluxo.length - 1; i++) {
    const m = rhMovimentos(fluxo[i].cifra, fluxo[i + 1].cifra);
    if (m.length && !m.some(x => x.d === 0) && m.every(x => x.d === m[0].d)) paralelos.push(m[0].d);
  }
  const secundarias = graus.filter(g => g.includes("V/")).length;
  if (paralelos.length >= 2 && paralelos.every(d => d === paralelos[0])) {
    return `Os acordes andam <b>em bloco</b>, todos na mesma direção, e só no fim as vozes param. A tensão está no <b>movimento</b>, não em um acorde isolado.`;
  }
  if (secundarias >= 2) {
    return `São <b>${secundarias} dominantes secundárias</b> encadeadas: cada acorde prepara o seguinte antes de a harmonia voltar ao repouso.`;
  }
  if (secundarias === 1) {
    return `Uma <b>dominante secundária</b> puxa a harmonia para fora do tom por um instante — é ela que dá o tempero do trecho.`;
  }
  return `O trecho se move entre repouso e tensão dentro do tom, sem acordes de fora.`;
}

/* ==========================================================================
   MONTAGEM DA TELA
   ========================================================================== */
function montarRelatorioHTML(musica, tom, rel) {
  if (!rel.fluxo || !rel.fluxo.length) {
    return `<div class="rh-vazio">Adicione acordes à música para gerar a análise.</div>`;
  }

  const fluxo = rel.fluxo;
  const graus = fluxo.map(f => calcularGrau(f.cifra, tom));
  const n = fluxo.length;
  const nEventos = (rel.eventos || []).length;

  /* ---- cabeçalho ---- */
  let html = `
    <header class="rh-head">
      <div class="rh-eyebrow">Análise da progressão</div>
      <h1 class="rh-titulo">${esc(musica.nome || "Música sem título")}</h1>
      <div class="rh-pills">
        <span class="rh-pill rh-pill-on">Tom de ${esc(tom)} maior</span>
        <span class="rh-pill">${n} ${n === 1 ? "acorde" : "acordes"} · ${nEventos} ${nEventos === 1 ? "evento" : "eventos"}</span>
      </div>
    </header>`;

  /* ---- como você salvou / toca ---- */
  const secoes = rhSecoesSalvas(musica);
  if (secoes.length) {
    html += `
    <section class="rh-bloco">
      <div class="rh-label">Como você toca</div>
      <div class="rh-salvo">
        ${secoes.map(s => `
          <div class="rh-secao">
            <div class="rh-secao-tit">${esc(s.titulo)}</div>
            <div class="rh-secao-seq">
              ${s.seq.map(x => `<b>${esc(x.cifra)}${x.n > 1 ? `<i class="rh-rep">×${x.n}</i>` : ""}</b>`)
                     .join(`<span class="rh-seta">→</span>`)}
            </div>
          </div>`).join("")}
      </div>
    </section>`;
  }

  /* ---- curva de tensão ---- */
  const px = i => (n === 1 ? 50 : 7 + (i * 86) / (n - 1));
  const py = i => 84 - (rhTensao(graus[i]) / 5) * 68;
  const pontos = fluxo.map((f, i) => `${px(i).toFixed(2)},${py(i).toFixed(2)}`).join(" ");

  html += `
    <section class="rh-curva" style="--rh-n:${n}">
      <div class="rh-curva-top"><span>Curva de tensão</span><span>Repouso → Tensão</span></div>
      <div class="rh-graf-wrap">
        <div class="rh-graf-inner">
          <div class="rh-graf">
            <div class="rh-grid"><i></i><i></i><i></i><i></i></div>
            <svg class="rh-linha" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="rhGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color="#8A6A2A"/><stop offset=".45" stop-color="#FFCA28"/><stop offset="1" stop-color="#E6A700"/>
                </linearGradient>
              </defs>
              <polyline points="${pontos}" fill="none" stroke="url(#rhGrad)" stroke-width="2.5"
                        stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
            </svg>
            ${fluxo.map((f, i) => `
              <div class="rh-no${f.badges && f.badges.length ? " rh-no-on" : ""}"
                   style="left:${px(i).toFixed(2)}%;top:${py(i).toFixed(2)}%">${esc(f.cifra)}</div>`).join("")}
          </div>
          <div class="rh-eixo">
            ${fluxo.map((f, i) => `
              <div class="rh-eixo-col">
                <span class="rh-eixo-i">${i + 1}º</span>
                <span class="rh-eixo-c${f.badges && f.badges.length ? " rh-on" : ""}">${esc(f.cifra)}</span>
                <span class="rh-eixo-g${f.badges && f.badges.length ? " rh-on" : ""}">${esc(graus[i])}</span>
              </div>`).join("")}
          </div>
        </div>
      </div>
    </section>`;

  /* ---- fluxo e motivos ---- */
  html += `
    <section class="rh-bloco">
      <div class="rh-label">Fluxo e motivos</div>
      <div class="rh-trilha">`;

  fluxo.forEach((f, i) => {
    const temBadge = f.badges && f.badges.length;
    const notas = rhNotas(f.cifra);

    html += `
        <article class="rh-acorde${temBadge ? " rh-acorde-on" : ""}">
          <div class="rh-ac-col">
            <span class="rh-idx">${i + 1}º</span>
            <span class="rh-grau${temBadge ? " rh-grau-on" : ""}">${esc(graus[i])}</span>
          </div>
          <div class="rh-ac-body">
            <div class="rh-cifra">${esc(f.cifra)}</div>
            <div class="rh-notas">${notas.length ? notas.map(esc).join(" · ") : "—"}</div>
            ${temBadge ? `<div class="rh-badges">${f.badges.map(b => `<span class="rh-badge">${esc(b)}</span>`).join("")}</div>` : ""}
          </div>
          <div class="rh-ac-func">${rhFuncaoMini(rel.funcoes[f.cifra])}</div>
        </article>`;

    if (i < n - 1) {
      const prox = fluxo[i + 1].cifra;
      const movs = rhMovimentos(f.cifra, prox);
      const ultima = i === n - 2;
      html += `
        <div class="rh-transicao${ultima ? " rh-transicao-fim" : ""}">
          <div class="rh-tr-top">
            <span class="rh-tr-par">${esc(f.cifra)} → ${esc(prox)}</span>
            <span class="rh-tr-tag">${rhTagTransicao(movs)}</span>
          </div>
          <div class="rh-vozes">
            ${movs.map(m => `
              <div class="rh-voz${m.d === 0 ? " rh-voz-parada" : ""}">
                <span>${esc(m.de)} <i>→</i> ${esc(m.para)}</span>
                <em>${rhRotuloDelta(m.d)}</em>
              </div>`).join("")}
          </div>
          <p class="rh-porque">${esc(rhPorque(f.cifra, prox, movs, rel))}</p>
        </div>`;
    }
  });

  html += `
        <div class="rh-ciclo"><span>↻</span> Do ${esc(fluxo[n - 1].cifra)} a sequência volta para o ${esc(fluxo[0].cifra)} — é aí que o ciclo recomeça.</div>
      </div>
    </section>`;

  /* ---- função de cada acorde ---- */
  const cifrasFn = Object.keys(rel.funcoes || {});
  if (cifrasFn.length) {
    html += `
    <section class="rh-bloco">
      <div class="rh-label">Função de cada acorde</div>
      <div class="rh-funcoes">
        ${cifrasFn.map(c => {
          const p = rhFuncaoPartes(rel.funcoes[c]);
          return `
          <div class="rh-fn">
            <span class="rh-fn-cifra">${esc(c)}</span>
            <div class="rh-fn-txt">
              <b>${esc(p.nome)}</b>
              ${p.desc ? `<span>${esc(p.desc)}</span>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  /* ---- fechamento ---- */
  html += `
    <section class="rh-bloco">
      <div class="rh-frase">${rhFrase(fluxo, graus)}</div>
    </section>`;

  return html;
}
