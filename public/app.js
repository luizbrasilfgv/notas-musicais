/* ===========================================================
   <APP> — app.js
   Vanilla ES6 + Firebase (Auth / Firestore). Sem framework.
   -----------------------------------------------------------
   ESTE ARQUIVO É O ESQUELETO DO PADRÃO. O que já está pronto:
   tema, login, portaria de aprovação, navegação, janelas de
   baixo, toast, persistência com atraso e painel de acessos.
   VOCÊ ESCREVE: a seção 1 (domínio) e as funções pintarX().
   =========================================================== */

/* ===========================================================
   0. CONFIG
   =========================================================== */

/* Cole aqui o firebaseConfig do seu projeto.
   Console Firebase → Configurações do projeto → Seus apps → Web.
   Este bloco é PÚBLICO por natureza: ele identifica o projeto,
   não autoriza nada. A segurança está nas Firestore Rules. */
const firebaseConfig = {
  apiKey: "AIzaSyCS5Lk8Z-srCzYMIgRy1WoTjnbvhDQTats",
  authDomain: "notas-musicais-a2ad8.firebaseapp.com",
  projectId: "notas-musicais-a2ad8",
  storageBucket: "notas-musicais-a2ad8.firebasestorage.app",
  messagingSenderId: "88375421519",
  appId: "1:88375421519:web:7e3db910e4940f2830983a"
};

/* Falso = MODO LOCAL: entra sem Google e salva só no aparelho.
   Serve para desenvolver e testar. NUNCA publique em falso. */
const CONFIGURADO = !String(firebaseConfig.apiKey).startsWith("COLE_");

/* Prefixo das chaves no localStorage, para não colidir com
   outros apps publicados no mesmo domínio. */
const NS = "app";

/* ===========================================================
   9. REPERTÓRIO E VOICE-LEADING
   =========================================================== */

function criarHTMLTeclado(minOct = 3, maxOct = 6) {
  let html = "";
  for (let oct = minOct; oct <= maxOct; oct++) {
    const brancas = ["C", "D", "E", "F", "G", "A", "B"];
    brancas.forEach(nota => {
      let blackKey = "";
      const notaCompleta = nota + oct;
      const midiBranca = Note.midi(notaCompleta);
      if (nota !== "E" && nota !== "B") {
        const midiPreta = Note.midi(nota + "#" + oct);
        blackKey = `<div class="tecla-preta" data-midi="${midiPreta}" style="right:-14px;"></div>`;
      }
      html += `<div style="position:relative; flex:0 0 auto;">
                 <div class="tecla-branca" data-midi="${midiBranca}">${nota}</div>
                 ${blackKey}
               </div>`;
    });
  }
  return html;
}

function renderizarTecladoEstatico(alvo, notas, globalBounds = null) {
  let minOct = 3, maxOct = 6;
  if (globalBounds && globalBounds.minMidi && globalBounds.maxMidi) {
    minOct = Math.floor(globalBounds.minMidi / 12) - 1; 
    maxOct = Math.floor(globalBounds.maxMidi / 12) - 1;
    // Dar uma margem de segurança
    minOct = Math.max(1, minOct);
    maxOct = Math.min(8, maxOct);
  } else {
    // Se não tiver globalBounds, calcular pelos acordes atuais
    if (notas.length > 0) {
      const minMidi = Math.min(...notas.map(n => Note.midi(n)));
      const maxMidi = Math.max(...notas.map(n => Note.midi(n)));
      minOct = Math.max(1, Math.floor(minMidi / 12) - 1);
      maxOct = Math.min(8, Math.floor(maxMidi / 12) - 1);
    }
  }
  
  // Garantir pelo menos 2 oitavas (para ficar do tamanho de acordes como A7 e D)
  maxOct = Math.max(maxOct, minOct + 1);

  alvo.style.overflow = "hidden"; // Não usar barras de rolagem
  alvo.innerHTML = `<div class="teclado-inner" style="display:inline-flex; height:150px; transform-origin:left top; transition:transform 0s;">${criarHTMLTeclado(minOct, maxOct)}</div>`;
  
  notas.forEach(nota => {
    const elNota = alvo.querySelector(`[data-midi="${Note.midi(nota)}"]`);
    if (elNota) elNota.classList.add("ativa");
  });
  
  // Usa ResizeObserver para garantir que pintou
  const observer = new ResizeObserver(() => {
    if (alvo.clientWidth > 0) {
      observer.disconnect();
      
      const inner = alvo.querySelector(".teclado-inner");
      if (inner && inner.offsetWidth > 0) {
         const containerWidth = alvo.clientWidth;
         // A escala ideal é fazer o teclado caber na tela com 8px de margem
         let idealScale = (containerWidth - 16) / inner.offsetWidth;
         idealScale = Math.min(idealScale, 1.15); // Evitar que fique gigante demais
         
         inner.style.transform = `scale(${idealScale})`;
         alvo.style.height = `${inner.offsetHeight * idealScale}px`; // Ajustar a altura do alvo para a altura em escala real
         
         // Centralizar caso seja menor que o container
         if (inner.offsetWidth * idealScale < containerWidth) {
           const espacoLivre = containerWidth - (inner.offsetWidth * idealScale);
           inner.style.marginLeft = `${espacoLivre / 2}px`;
         }
         
         // Reaplica as classes ativa para garantir que renderizaram (fallback)
         notas.forEach(nota => {
           const el = alvo.querySelector(`[data-midi="${Note.midi(nota)}"]`);
           if (el) el.classList.add("ativa");
         });
      }
    }
  });
  observer.observe(alvo);
}

// INIT DA TELA
document.addEventListener("DOMContentLoaded", () => {
  renderizarListaMusicas();
  
  el("btnSalvarAcordeDicionario")?.addEventListener("click", () => {
    if (!acordeAtual) return;
    
    const opcoes = musicas.map(m => ({ r: m.nome, v: m.id }));
    opcoes.unshift({ r: "+ Criar nova música...", v: "NOVA" });
    
    abrirOpcoes(`Salvar ${acordeAtual} em...`, opcoes, id => {
      if (id === "NOVA") {
        const nome = prompt("Nome da nova música:");
        if (!nome) return;
        musicas.push({ id: Date.now().toString(), nome, acordes: [acordeAtual] });
      } else {
        const m = musicas.find(x => x.id === id);
        if (m) m.acordes.push(acordeAtual);
      }
      salvarMusicas();
      renderizarListaMusicas();
      // Opcional: toast
      alert(`Acorde ${acordeAtual} adicionado ao repertório!`);
    });
  });
  
  el("btnFavoritarAcorde")?.addEventListener("click", () => {
    if (!acordeAtual) return;
    
    // Check if already favorited
    const existente = acordesFavoritos.find(f => f.cifra === acordeAtual && f.inversao === inversaoAtual);
    if (existente) {
       alert("Este acorde já está nos seus favoritos!");
       return;
    }
    
    acordesFavoritos.unshift({ 
      id: Date.now().toString(), 
      cifra: acordeAtual, 
      inversao: inversaoAtual,
      data: Date.now()
    });
    salvarFavoritos();
    renderizarListaFavoritos();
    
    alert(`⭐ ${acordeAtual} (${["Fund.", "1ª Inv.", "2ª Inv.", "3ª Inv."][inversaoAtual]}) salvo nos favoritos!`);
  });
  
  el("segRepertorio")?.addEventListener("click", e => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    
    [...el("segRepertorio").children].forEach(x => x.classList.toggle("on", x === b));
    
    const tab = b.dataset.tab;
    el("listaMusicas").style.display = tab === "musicas" ? "block" : "none";
    el("listaFavoritos").style.display = tab === "favoritos" ? "block" : "none";
    el("cabecalhoRepertorio").style.display = tab === "musicas" ? "flex" : "none";
  });
});

let acordesFavoritos = [];
function carregarFavoritos() {
  // handled by firestore
}
function salvarFavoritos() {
  agendarSalvar();
}
carregarFavoritos();

function renderizarListaFavoritos() {
  const container = el("listaFavoritos");
  if (!container) return;
  
  if (acordesFavoritos.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--mut);">Você ainda não tem acordes favoritos.</div>`;
    return;
  }
  
  container.innerHTML = acordesFavoritos.map(f => `
    <div class="card fav-item" data-id="${f.id}" data-cifra="${f.cifra}" data-inversao="${f.inversao}" style="cursor:pointer; margin-bottom:12px; align-items:center;">
      <div class="body">
        <div class="tit" style="font-size: 20px; color:var(--acento);">${f.cifra}</div>
        <div class="meta">${["Fundamental", "1ª Inversão", "2ª Inversão", "3ª Inversão"][f.inversao]}</div>
      </div>
      <button class="mini del-fav" data-id="${f.id}" style="border:none; background:transparent; color:var(--bad);">Excluir</button>
    </div>
  `).join("");
}

function renderizarListaMusicas() {
  const container = el("listaMusicas");
  if (!container) return;
  
  if (musicas.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--mut);">Você ainda não salvou nenhuma música no repertório.</div>`;
    return;
  }
  
  container.innerHTML = musicas.map(m => `
    <div class="card musica-item" data-id="${m.id}" style="cursor:pointer; margin-bottom:12px; align-items:center;">
      <div class="body">
        <div class="tit">${m.nome}</div>
        <div class="meta">${(() => {
          let unique = new Set();
          if (m.secoes) m.secoes.forEach(s => (s.acordes || []).forEach(a => unique.add(a.cifra)));
          else if (m.acordes) m.acordes.forEach(a => unique.add(a.cifra || a));
          const size = unique.size;
          return size + (size === 1 ? " acorde único" : " acordes únicos");
        })()}</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="mini edit-musica" data-id="${m.id}" style="border:none; background:transparent; color:var(--acento);">Editar</button>
        <button class="mini del-musica" data-id="${m.id}" style="border:none; background:transparent; color:var(--bad);">Excluir</button>
      </div>
    </div>
  `).join("");
}

// Quando o DOM estiver pronto, também renderiza os favoritos
document.addEventListener("DOMContentLoaded", () => {
  renderizarListaFavoritos();
});

// CRIAÇÃO DE NOVA MÚSICA (SONG BUILDER)
let construtorMusica = {
  id: null,
  nome: "",
  secoes: []
};

el("btnNovaMusica")?.addEventListener("click", () => {
  // Inicializa o construtor
  construtorMusica = {
    id: null,
    nome: "",
    secoes: [{ titulo: "Seção 1", texto: "", acordes: [] }]
  };
  el("inputNomeMusica").value = "";
  renderizarConstrutorMusica();
});

el("btnVoltarRepertorio")?.addEventListener("click", () => {
  document.querySelector('#nav button[data-scr="meus"]')?.click();
});

el("btnAdicionarSecao")?.addEventListener("click", () => {
  construtorMusica.secoes.push({ titulo: `Seção ${construtorMusica.secoes.length + 1}`, texto: "", acordes: [] });
  renderizarConstrutorMusica();
});

el("inputNomeMusica")?.addEventListener("input", e => {
  construtorMusica.nome = e.target.value;
});

el("btnSalvarMusica")?.addEventListener("click", () => {
  if (!construtorMusica.nome.trim()) return alert("Dê um nome à música!");
  if (construtorMusica.secoes.length === 0) return alert("Adicione pelo menos uma seção!");
  
  const nova = {
    id: construtorMusica.id || "m" + Date.now(),
    nome: construtorMusica.nome.trim(),
    secoes: construtorMusica.secoes.map(s => ({
      titulo: s.titulo,
      acordes: [...s.acordes]
    }))
  };
  
  if (construtorMusica.id) {
    const idx = musicas.findIndex(m => m.id === construtorMusica.id);
    if (idx !== -1) musicas[idx] = nova;
    else musicas.push(nova);
  } else {
    musicas.push(nova);
  }
  
  salvarMusicas();
  alert("Música salva com sucesso!");
  document.querySelector('#nav button[data-scr="meus"]')?.click();
  renderizarListaMusicas();
});

function parseAcordesTexto(texto) {
  // Troca quebras de linha e barras por espaço, e pega os tokens
  const str = texto.replace(/[\n|\|]/g, " ").replace(/\s+/g, " ").trim();
  if (!str) return [];
  return str.split(" ");
}

function calcularVoiceLeadingSecao(cifras) {
  if (cifras.length === 0) return [];
  const res = [];
  
  let notasUltimo = obterNotasDoAcorde(cifras[0], 0);
  if(!notasUltimo.length) {
    res.push({cifra: cifras[0], inv: 0, valido: false});
  } else {
    // Tenta achar a inversão mais centralizada para o 1º acorde
    // O centro do teclado (C4) é midi 60. Vamos testar todas e ver qual centro de massa fica mais perto de 64.
    let bestInv = 0;
    let minDist = Infinity;
    const invCount = Chord.tokenize(cifras[0])[0] ? 4 : 1; // Simplificado
    for(let i=0; i<4; i++) {
       let testNotas = obterNotasDoAcorde(cifras[0], i);
       if(!testNotas.length) break;
       let cg = testNotas.reduce((a,b)=>a+Note.midi(b),0)/testNotas.length;
       if(Math.abs(cg - 64) < minDist) {
         minDist = Math.abs(cg - 64);
         bestInv = i;
       }
    }
    notasUltimo = obterNotasDoAcorde(cifras[0], bestInv);
    res.push({cifra: cifras[0], inv: bestInv, valido: true});
  }
  
  for(let i=1; i<cifras.length; i++) {
    const c = cifras[i];
    const notasC = obterNotasDoAcorde(c, 0);
    if (!notasC.length) {
      res.push({cifra: c, inv: 0, valido: false});
      continue;
    }
    const best = melhorInversao(notasUltimo, c);
    res.push({cifra: c, inv: best, valido: true});
    notasUltimo = obterNotasDoAcorde(c, best);
  }
  return res;
}

function renderizarConstrutorMusica() {
  const container = el("containerSecoesMusica");
  if(!container) return;
  
  let html = "";
  construtorMusica.secoes.forEach((sec, sIdx) => {
    html += `
      <div class="secao-builder" style="background:var(--bg-card); padding:16px; border-radius:12px; border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
          <input type="text" class="inp-titulo-secao" data-idx="${sIdx}" value="${sec.titulo}" style="background:transparent; border:none; border-bottom:1px solid var(--border); color:var(--text); font-size:18px; font-weight:bold; outline:none; flex:1; max-width:60%;" />
          <button class="btn btn-del-secao" data-idx="${sIdx}" style="background:transparent; border:none; color:var(--red); padding:0;">Excluir</button>
        </div>
        <input type="text" class="inp-texto-secao" data-idx="${sIdx}" value="${sec.texto}" placeholder="Digite os acordes (ex: C F G Am)" style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text); font-size:16px; margin-bottom:16px;" autocomplete="off" />
        
        <div id="teclados-secao-${sIdx}" class="teclados-secao" style="display:flex; flex-direction:column; gap:12px;">
    `;
    
    html += gerarHtmlTecladosSecao(sIdx);
    
    html += `</div></div>`;
  });
  
  container.innerHTML = html;
  
  // Attach listeners
  container.querySelectorAll(".inp-titulo-secao").forEach(inp => {
    inp.addEventListener("change", e => {
      construtorMusica.secoes[e.target.dataset.idx].titulo = e.target.value;
    });
  });
  
  container.querySelectorAll(".inp-texto-secao").forEach(inp => {
    inp.addEventListener("input", e => {
      const sIdx = e.target.dataset.idx;
      construtorMusica.secoes[sIdx].texto = e.target.value;
      const cifras = parseAcordesTexto(e.target.value);
      construtorMusica.secoes[sIdx].acordes = calcularVoiceLeadingSecao(cifras);
      
      const divTeclados = document.getElementById(`teclados-secao-${sIdx}`);
      if(divTeclados) {
        divTeclados.innerHTML = gerarHtmlTecladosSecao(sIdx);
        vincularEventosTeclados(divTeclados);
      }
    });
  });
  
  container.querySelectorAll(".btn-del-secao").forEach(btn => {
    btn.addEventListener("click", e => {
      if(confirm("Excluir esta seção?")) {
        construtorMusica.secoes.splice(e.target.dataset.idx, 1);
        renderizarConstrutorMusica();
      }
    });
  });
  
  vincularEventosTeclados(container);
}

function gerarHtmlTecladosSecao(sIdx) {
  const sec = construtorMusica.secoes[sIdx];
  let html = "<div style='display:flex; flex-wrap:wrap; gap:8px;'>";
  sec.acordes.forEach((ac, aIdx) => {
    if(!ac.valido) {
      html += `<div class="chip" style="background:var(--red); color:#fff;">${ac.cifra} ?</div>`;
      return;
    }
    const inv = ac.inv === 0 ? "" : (ac.inv === 1 ? " ¹" : (ac.inv === 2 ? " ²" : " ³"));
    html += `
      <div class="chip kb-row-edit" style="cursor:pointer; background:var(--acento); color:#fff; font-weight:bold; padding: 6px 12px; border-radius: 16px;" data-sidx="${sIdx}" data-aidx="${aIdx}">
        ${ac.cifra}${inv}
      </div>
    `;
  });
  html += "</div>";
  return html;
}

function vincularEventosTeclados(pai) {
  pai.querySelectorAll(".kb-row-edit").forEach(row => {
    // Remover listener duplicado se houver (mas como usamos .innerHTML, eles morrem)
    row.addEventListener("click", e => {
      const sIdx = row.dataset.sidx;
      const aIdx = row.dataset.aidx;
      abrirOpcoesInversao(sIdx, aIdx);
    });
  });
}

function abrirOpcoesInversao(sIdx, aIdx) {
  const ac = construtorMusica.secoes[sIdx].acordes[aIdx];
  const div = document.createElement("div");
  div.style.padding = "16px";
  div.style.display = "flex";
  div.style.gap = "8px";
  div.style.justifyContent = "center";
  div.innerHTML = [0,1,2,3].map(i => `<button class="btn" data-inv="${i}" style="${ac.inv === i ? 'background:var(--acento);color:#fff;' : ''}">${i===0?'Fund.':i+'ª'}</button>`).join("");
  
  el("opTit").textContent = `Inversão de ${ac.cifra}`;
  el("opLista").innerHTML = "";
  el("opLista").appendChild(div);
  
  div.addEventListener("click", e => {
    if(e.target.tagName==="BUTTON") {
      const novaInv = parseInt(e.target.dataset.inv);
      // Força a inversão escolhida
      construtorMusica.secoes[sIdx].acordes[aIdx].inv = novaInv;
      
      // Recalcula cascata a partir do próximo
      recalcularVoiceLeadingCascata(sIdx, parseInt(aIdx));
      
      fecharSheet("opSheet");
      renderizarConstrutorMusica();
    }
  });
  abrirSheet("opSheet");
}

function recalcularVoiceLeadingCascata(sIdx, aIdx) {
  const sec = construtorMusica.secoes[sIdx];
  let notasUltimo = obterNotasDoAcorde(sec.acordes[aIdx].cifra, sec.acordes[aIdx].inv);
  
  for(let i = aIdx + 1; i < sec.acordes.length; i++) {
    const c = sec.acordes[i];
    if(!c.valido) continue;
    const best = melhorInversao(notasUltimo, c.cifra);
    c.inv = best;
    notasUltimo = obterNotasDoAcorde(c.cifra, best);
  }
}


function transporMusica(intervalo) {
  if (!musicaAtual) return;
  if (musicaAtual.secoes) {
    musicaAtual.secoes.forEach(sec => {
      sec.acordes.forEach(ac => {
        if (!ac.valido) return;
        let [cifraMain, baixo] = ac.cifra.split("/");
        const chordParts = Chord.tokenize(cifraMain);
        let novaRaiz = Note.simplify(Note.transpose(chordParts[0], intervalo));
        let novoAc = novaRaiz + chordParts[1];
        if (baixo) {
          let novoBaixo = Note.simplify(Note.transpose(baixo, intervalo));
          ac.cifra = novoAc + "/" + novoBaixo;
        } else {
          ac.cifra = novoAc;
        }
      });
    });
  } else if (musicaAtual.acordes) {
     musicaAtual.acordes = musicaAtual.acordes.map(a => {
        let [cifraMain, baixo] = a.split("/");
        const chordParts = Chord.tokenize(cifraMain);
        let novaRaiz = Note.simplify(Note.transpose(chordParts[0], intervalo));
        let novoAc = novaRaiz + chordParts[1];
        if (baixo) return novoAc + "/" + Note.simplify(Note.transpose(baixo, intervalo));
        return novoAc;
     });
  }
  
  // Marcar como modificada localmente, mas não salvar ainda
  musicaFoiTransposta = true;
  atualizarHeaderMusica();
  
  // Re-renderizar a tela atual
  renderizarVisaoMusica();
}

function salvarTransposicao() {
  if (!musicaAtual) return;
  const idx = musicas.findIndex(m => m.id === musicaAtual.id);
  if (idx !== -1) musicas[idx] = musicaAtual;
  salvarMusicas();
  
  // Se Firebase estiver configurado e o usuário tiver permissão, salvar no Firestore
  if (typeof db !== "undefined" && typeof updateDoc === "function") {
    // Isso é síncrono para o app, mas async no firebase. Assumimos sucesso local.
    import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js").then(({ doc, updateDoc }) => {
      try {
        updateDoc(doc(db, "repertorio", musicaAtual.id), { 
           secoes: musicaAtual.secoes,
           acordes: musicaAtual.acordes || []
        });
      } catch (e) {
        console.error("Erro ao salvar no firebase", e);
      }
    });
  }
  
  musicaFoiTransposta = false;
  atualizarHeaderMusica();
  renderizarVisaoMusica(); // Re-renderizar para sumir o botão
  aviso("Transposição salva!");
}

document.addEventListener("click", e => {
  if (e.target.closest("#btnTransDown")) {
    transporMusica("-2m");
    return;
  }
  if (e.target.closest("#btnTransUp")) {
    transporMusica("2m");
    return;
  }
  if (e.target.closest("#btnSalvarTom")) {
    salvarTransposicao();
    return;
  }

  // Delete musica
  const delBtn = e.target.closest(".del-musica");
  if (delBtn) {
    e.stopPropagation(); // Evita acionar o item da musica
    if(confirm("Excluir música?")) {
      musicas = musicas.filter(m => m.id !== delBtn.dataset.id);
      salvarMusicas();
      renderizarListaMusicas();
    }
    return;
  }
  
  // Editar musica
  const editBtn = e.target.closest(".edit-musica");
  if (editBtn) {
    e.stopPropagation(); // Evita acionar o item da musica
    const m = musicas.find(x => x.id === editBtn.dataset.id);
    if (m) {
      construtorMusica = {
        id: m.id,
        nome: m.nome,
        // Clone profundo secoes
        secoes: m.secoes ? m.secoes.map(s => ({ titulo: s.titulo, texto: s.acordes.map(a=>a.cifra).join(" "), acordes: [...s.acordes] })) : (m.acordes ? [{ titulo: "Única", texto: m.acordes.join(" "), acordes: m.acordes.map(a => ({cifra: a, inv: 0, valido: true})) }] : [])
      };
      el("inputNomeMusica").value = construtorMusica.nome;
      renderizarConstrutorMusica();
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      el("scr-nova-musica")?.classList.add("active");
    }
    return;
  }  
  
  // Delete favorito
  const delFav = e.target.closest(".del-fav");
  if (delFav) {
    if(confirm("Remover dos favoritos?")) {
      acordesFavoritos = acordesFavoritos.filter(f => f.id !== delFav.dataset.id);
      salvarFavoritos();
      renderizarListaFavoritos();
    }
  }
  
  // Tocar musica
  else if (e.target.closest(".musica-item")) {
    tocarMusica(e.target.closest(".musica-item").dataset.id);
  }
  
  // Abrir Favorito
  else if (e.target.closest(".fav-item")) {
    const item = e.target.closest(".fav-item");
    const cifra = item.dataset.cifra;
    const inv = parseInt(item.dataset.inversao);
    
    // Navegar para o Dicionário
    document.querySelector('#nav button[data-scr="inicio"]')?.click();
    
    // Setar valores
    el("q").value = cifra;
    acordeAtual = cifra;
    inversaoAtual = inv;
    notasAtuais = obterNotasDoAcorde(acordeAtual, inversaoAtual);
    
    pintarDicionario();
    
    // Atualizar UI dos chips
    document.querySelectorAll("#chips-inversao button").forEach(b => {
      b.classList.toggle("on", parseInt(b.dataset.inv) === inv);
    });
  }
});


// TOCADOR DE MÚSICA E VOICE LEADING
let musicaAtual = null;
let modoVisaoMusica = "lista"; 
let musicaFoiTransposta = false;

el("segMusica")?.addEventListener("click", e => {
  const b = e.target.closest("button[data-vis]");
  if (!b) return;
  [...el("segMusica").children].forEach(x => x.classList.toggle("on", x === b));
  modoVisaoMusica = b.dataset.vis;
  if (musicaAtual) renderizarVisaoMusica();
});

function tocarMusica(id) {
  musicaAtual = musicas.find(m => m.id === id);
  if (!musicaAtual) return;
  musicaFoiTransposta = false; // reseta a flag ao abrir
  el("listaMusicas").style.display = "none";
  el("btnNovaMusica").style.display = "none";
  if (el("cabecalhoRepertorio")) el("cabecalhoRepertorio").style.display = "none";
  el("segMusica").style.display = "flex";
  if (el("segRepertorio")) el("segRepertorio").style.display = "none";
  
  el("visaoMusicaHeader").style.display = "block";
  atualizarHeaderMusica();
  
  el("visaoMusica").style.display = "block";
  renderizarVisaoMusica();
}

let modoAnalise = false;

/* Extrai a fundamental de uma cifra sem mutilar o restante.
   "Cmaj7" → "C" · "F#m7" → "F#" · "Bbdim" → "Bb" */
function extrairFundamental(cifra) {
  const m = String(cifra || "").trim().match(/^([A-Ga-g])(##?|bb?)?/);
  return m ? m[1].toUpperCase() + (m[2] || "") : null;
}

/* Normaliza só a letra da fundamental para maiuscula, preservando o resto
   da cifra como o usuario digitou: "g#m7" -> "G#m7", "b7#9" -> "B7#9". */
function normalizarCifra(cifra) {
  const s = String(cifra == null ? "" : cifra).trim();
  return /^[a-g]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s;
}

/* True se o tom é menor: "Am", "F#m", "Cm7"... (sem confundir com "maj") */
function tomEhMenor(tom) {
  return /m(?!aj)/i.test(String(tom || "").slice(1));
}

/* Infere o tom analisando as NOTAS reais de todos os acordes (via tonal)
   contra as 24 escalas candidatas (12 maiores + 12 menores), com bônus
   para tônica no primeiro e no último acorde. Retorna "C", "Am", "F#m"... */
function inferirTomDaMusica(musica) {
  if (!musica) return "?";
  if (musica.tomManual) return musica.tomManual;

  let allChords = [];
  if (musica.secoes) {
    musica.secoes.forEach(s => (s.acordes || []).forEach(a => {
      const c = a && (a.cifra || a);
      if (a && a.valido !== false && c && c !== "%") allChords.push(c);
    }));
  } else if (musica.acordes) {
    allChords = (musica.acordes || []).map(a => (a && (a.cifra || a))).filter(c => c && c !== "%");
  }
  if (allChords.length === 0) return "C";

  // Perfil de cada acorde: chroma da fundamental, chromas das notas e qualidade
  const eventos = allChords.map(c => {
    const info = Chord.get(c);
    const root = extrairFundamental(c);
    const rootChroma = root ? Note.chroma(root) : null;
    const notas = (info && !info.empty && info.notes && info.notes.length) ? info.notes : (root ? [root] : []);
    const chromas = notas.map(nt => Note.chroma(nt)).filter(x => x != null);
    const resto = root ? String(c).split("/")[0].slice(root.length) : "";
    const menor = (info && !info.empty && info.quality) ? info.quality === "Minor" : /^m(?!aj)/.test(resto);
    // Dominante: terca maior + setima menor (7, 7#9, 7b9, 9, 13...), nunca maj7
    const iv = (info && info.intervals) || [];
    const dom = iv.includes("3M") && iv.includes("7m");
    return { rootChroma, chromas, menor, dom };
  });

  // Blues/jazz onde quase tudo e dominante: as regras de dominante nao valem
  const nDom = eventos.filter(e => e.dom).length;
  const bluesy = nDom > eventos.length / 2;

  const NOMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const MAIOR = [0, 2, 4, 5, 7, 9, 11];
  const MENOR = [0, 2, 3, 5, 7, 8, 10]; // menor natural

  let melhor = { score: -Infinity, tom: "C" };
  for (let t = 0; t < 12; t++) {
    for (const modo of ["maior", "menor"]) {
      const graus = modo === "maior" ? MAIOR : MENOR;
      const escala = new Set(graus.map(g => (t + g) % 12));
      const sensivel = (t + 11) % 12; // 7ª maior: tolerada no menor (harmônica, ex. E7 em Am)
      let score = modo === "maior" ? 0.01 : 0; // leve preferência por maior em empate real

      eventos.forEach(ev => {
        ev.chromas.forEach(ch => {
          if (escala.has(ch)) score += 1;
          else if (modo === "menor" && ch === sensivel) score += 0.5;
          else score -= 1.25;
        });
        if (ev.rootChroma != null && escala.has(ev.rootChroma)) score += 0.5;
      });

      // Um dominante sobre o V reforça o tom; sobre a tônica sugere que ela é V de outro tom
      if (!bluesy) {
        const quinta = (t + 7) % 12;
        eventos.forEach(ev => {
          if (!ev.dom || ev.rootChroma == null) return;
          if (ev.rootChroma === quinta) score += 1.5;
          else if (ev.rootChroma === t) score -= 1.5;
        });
      }

      // Tônica (com a qualidade certa) no primeiro e sobretudo no último acorde
      const ehTonica = ev => ev && !ev.dom && ev.rootChroma === t && ev.menor === (modo === "menor");
      const ultimo = eventos[eventos.length - 1];
      if (ehTonica(eventos[0])) score += 2.5;
      if (ehTonica(ultimo)) score += 4;
      // Terminar em dominante é volta pro início: o tom é uma quinta abaixo dele
      else if (!bluesy && ultimo && ultimo.dom && ultimo.rootChroma != null
               && (ultimo.rootChroma + 5) % 12 === t) score += 2.5;

      if (score > melhor.score) melhor = { score, tom: NOMES[t] + (modo === "menor" ? "m" : "") };
    }
  }
  return melhor.tom;
}

function calcularGrau(cifra, tom) {
  const root = extrairFundamental(String(cifra || "").split("/")[0]);
  const tomRoot = extrairFundamental(tom);
  if (!root || !tomRoot) return "?";
  const rc = Note.chroma(root), tc = Note.chroma(tomRoot);
  if (rc == null || tc == null) return "?";
  const semitones = ((rc - tc) + 12) % 12;

  const tomMenor = tomEhMenor(tom);
  const resto = String(cifra).split("/")[0].slice(root.length);
  const info = Chord.get(cifra);
  const qualidade = (info && !info.empty && info.quality) ? info.quality : "";

  const isDim = qualidade === "Diminished" || /(dim|\u00b0|m7b5|\u00f8)/.test(resto);
  const isAug = !isDim && (qualidade === "Augmented" || /aug/.test(resto));
  const isMinor = !isDim && !isAug && (qualidade === "Minor" || /^m(?!aj)/.test(resto));
  // Setima dominante: pelo tipo do tonal ou, no fallback, "7" que nao seja maj7/7M/7+
  const ehDom7 = (info && !info.empty && info.type)
    ? /dominant/.test(info.type)
    : (/7/.test(resto) && !/maj7|7M|7\+/.test(resto));

  const MAPA_MAIOR = { 0: "I", 1: "bII", 2: "II", 3: "bIII", 4: "III", 5: "IV", 6: "bV", 7: "V", 8: "bVI", 9: "VI", 10: "bVII", 11: "VII" };
  const MAPA_MENOR = { 0: "I", 1: "bII", 2: "II", 3: "III", 4: "#III", 5: "IV", 6: "bV", 7: "V", 8: "VI", 9: "#VI", 10: "VII", 11: "#VII" };

  let g = (tomMenor ? MAPA_MENOR : MAPA_MAIOR)[semitones] || "?";
  if (isMinor) g = g.toLowerCase();
  if (isDim) g = g.toLowerCase() + "\u00b0";
  if (isAug) g = g + "+";

  // Dominantes secundarias no modo maior (acordes maiores em graus naturalmente menores)
  if (!tomMenor && !isMinor && !isDim && !isAug) {
    if (semitones === 2) g = ehDom7 ? "V7/V" : "V/V";
    else if (semitones === 4) g = ehDom7 ? "V7/vi" : "V/vi";
    else if (semitones === 9) g = ehDom7 ? "V7/ii" : "V/ii";
    else if (semitones === 11) g = ehDom7 ? "V7/iii" : "V/iii";
    else if (semitones === 0 && ehDom7) g = "V7/IV";
  }
  // Dominante que já está num grau natural: mostra o 7 (V -> V7, bVII -> bVII7)
  if (ehDom7 && g !== "?" && !g.includes("/") && !/7$/.test(g)) g += "7";
  return g;
}

function atualizarHeaderMusica() {
  const container = el("visaoMusicaHeader");
  if (!container || !musicaAtual) return;
  
  const tom = inferirTomDaMusica(musicaAtual);
  
  if (container.dataset.musicaId !== musicaAtual.id || !container.innerHTML.trim()) {
    container.dataset.musicaId = musicaAtual.id;
    container.innerHTML = `
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

      <div class="transpose-card" id="painelTom">
        <div class="transpose-row">
          <button class="btn-trans" id="btnTransDown">−½</button>
          <div class="tom-display" id="btnEditTom" style="cursor:pointer" title="Clique para editar manualmente"><small>Tom atual</small><b id="tomAtual">${tom}</b></div>
          <button class="btn-trans" id="btnTransUp">+½</button>
        </div>
        <div id="containerBtnSalvarTom"></div>
      </div>
    `;
      
    const btnVoltar = el("voltarListaMusicas");
    if (btnVoltar) {
      btnVoltar.onclick = () => {
        musicaAtual = null;
        container.dataset.musicaId = "";
        const activeTab = document.querySelector("#segRepertorio button.on")?.dataset?.tab || "musicas";
        el("listaMusicas").style.display = activeTab === "musicas" ? "block" : "none";
        if (el("cabecalhoRepertorio")) el("cabecalhoRepertorio").style.display = "flex";
        el("segMusica").style.display = "none";
        if (el("segRepertorio")) el("segRepertorio").style.display = "flex";
        el("visaoMusicaHeader").style.display = "none";
        el("visaoMusica").style.display = "none";
      };
    }
    
    const btnToggle = el("btnTomToggle");
    const painelTom = el("painelTom");
    if (btnToggle && painelTom) {
      btnToggle.onclick = () => {
        btnToggle.classList.toggle("aberta");
        painelTom.classList.toggle("aberta");
      };
    }
  } else {
    // Apenas atualizar os dados para não perder estado da UI
    if (el("tomAtual")) el("tomAtual").innerText = tom;
    if (el("btnTomToggle")) el("btnTomToggle").innerText = `Tom ${tom}`;
  }
  
  const containerSalvar = el("containerBtnSalvarTom");
  if (containerSalvar) {
    if (musicaFoiTransposta || (musicaAtual && musicaAtual.tomManual !== tom && document.querySelector("#painelTom.aberta"))) {
      containerSalvar.innerHTML = `<button class="btn p btn-salvar-tom" id="btnSalvarTom">Salvar novo tom</button>`;
    } else {
      containerSalvar.innerHTML = "";
    }
  }
  
  const btnAnalise = el("btnAnaliseToggle");
  if (btnAnalise) {
    btnAnalise.onclick = () => {
      const modal = el("scr-relatorio");
      const conteudo = el("conteudoRelatorioHarmonico");
      if (!modal || !conteudo) return;
  
      const tomFinal = inferirTomDaMusica(musicaAtual);
      const rel = gerarRelatorioHarmonico(musicaAtual, tomFinal);
      conteudo.innerHTML = montarRelatorioHTML(musicaAtual, tomFinal, rel);
  
      el("scr-meus").classList.remove("active");
      el("scr-meus").style.display = "none";
      el("nav").style.display = "none";
      modal.style.display = "block";
      window.scrollTo({ top: 0 });
      modoAnalise = false;
    };
  }
  
  const btnSolo = el("btnSoloToggle");
  if (btnSolo) {
    btnSolo.onclick = () => {
      const modal = el("scr-comotocar");
      const conteudo = el("conteudoComoTocar");
      if (!modal || !conteudo) return;
      
      renderComoTocar();
      
      el("scr-meus").classList.remove("active");
      el("scr-meus").style.display = "none";
      el("nav").style.display = "none";
      modal.style.display = "block";
      window.scrollTo({ top: 0 });
    };
  }
  
  const btnEdit = el("btnEditTom");
  if (btnEdit) {
    btnEdit.onclick = () => {
      const resp = prompt("Qual o Tom correto da música? (ex: C, Am, F#m)", tom);
      if (resp && resp.trim()) {
        let v = resp.trim();
        v = v.charAt(0).toUpperCase() + v.slice(1); // aceita "am" -> "Am", "f#m" -> "F#m"
        musicaAtual.tomManual = v;
        salvarMusicas();
        atualizarHeaderMusica();
        renderizarVisaoMusica();
      }
    };
  }
}

function renderizarVisaoMusica() {
  const container = el("visaoMusica");
  const secoes = musicaAtual.secoes || [];
  
  let allMidi = [];
  secoes.forEach(sec => sec.acordes.forEach(ac => {
    if(ac.valido) allMidi.push(...obterNotasDoAcorde(ac.cifra, ac.inv).map(n => Note.midi(n)));
  }));
  const globalBounds = allMidi.length > 0 ? { minMidi: Math.min(...allMidi), maxMidi: Math.max(...allMidi) } : null;
  
  if (modoVisaoMusica === "lista") {
    let html = "";
    let kbCounter = 0;
    
    secoes.forEach(sec => {
      html += `<div style="margin-bottom: 24px;">
                 <h3 style="color:var(--acento); border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:16px;">${sec.titulo}</h3>`;
                 
      sec.acordes.forEach(ac => {
        if(!ac.valido) return;
        const suffix = ["Fundamental", "1ª Inversão", "2ª Inversão", "3ª Inversão"][ac.inv];
        
        let grauHtml = "";
        if (modoAnalise) {
          const tom = inferirTomDaMusica(musicaAtual);
          const grau = calcularGrau(ac.cifra, tom);
          grauHtml = `<div style="font-size:14px; background:var(--acento); color:#fff; padding:2px 8px; border-radius:12px; margin-right:8px;">${grau}</div>`;
        }
        
        html += `
          <div class="card" style="flex-direction:column; margin-bottom:16px; padding: 16px;">
            <div style="font-weight:700; margin-bottom:12px; display:flex; justify-content:space-between; width:100%; align-items:center;">
              <div style="display:flex; align-items:center;">${grauHtml}<span style="font-size:24px; color:var(--text);">${ac.cifra}</span></div>
              <span class="chip" style="font-size:12px;">${suffix}</span>
            </div>
            <div id="kb-estatico-${kbCounter}" style="width:100%; min-width:0; box-sizing:border-box; height:140px; overflow:hidden; position:relative; background: #fff; border-radius: 8px; border: 1px solid var(--border);"></div>
          </div>
        `;
        kbCounter++;
      });
      html += `</div>`;
    });
    
    container.innerHTML = html;
    
    // Desenha teclados após o DOM carregar
    kbCounter = 0;
    secoes.forEach(sec => {
      sec.acordes.forEach(ac => {
        if(!ac.valido) return;
        const notas = obterNotasDoAcorde(ac.cifra, ac.inv);
        renderizarTecladoEstatico(el(`kb-estatico-${kbCounter}`), notas, globalBounds);
        kbCounter++;
      });
    });
  } else {
    // TELA CHEIA (Opção 3 - Chips + Teclado Único Fixo Embaixo)
    let htmlChips = "";
    const todosAcordes = [];
    
    secoes.forEach((sec, sIdx) => {
      htmlChips += `<div style="margin-bottom: 24px;">
                      <div style="font-size:12px; color:var(--mut); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:4px;">${sec.titulo}</div>
                      <div style="display:flex; flex-wrap:wrap; gap:8px;">`;
      sec.acordes.forEach((ac, aIdx) => {
        if(!ac.valido) return;
        const globalIdx = todosAcordes.length;
        todosAcordes.push(ac);
        
        let grauHtml = "";
        if (modoAnalise) {
          const tom = inferirTomDaMusica(musicaAtual);
          const grau = calcularGrau(ac.cifra, tom);
          grauHtml = `<div style="font-size:12px; color:var(--mut); font-weight:bold; text-align:center;">${grau}</div>`;
        }
        
        htmlChips += `<div style="display:flex; flex-direction:column; align-items:center; margin-right:8px;">
                        <div class="chip chip-play" data-idx="${globalIdx}" style="cursor:pointer; font-size:18px; width:56px; height:56px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; padding:0; margin-bottom:4px;">${ac.cifra}</div>
                        ${grauHtml}
                      </div>`;
      });
      htmlChips += `</div></div>`;
    });
    
    if(todosAcordes.length === 0) {
      container.innerHTML = `<p>Nenhum acorde válido nesta música.</p>`;
      return;
    }
    
    let idxAtivo = 0;
    
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; height:calc(100vh - 200px);">
        <div style="flex:1; overflow-y:auto; padding-bottom:16px;">
          ${htmlChips}
        </div>
        
        <div style="padding-top:16px; border-top:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <button class="btn" id="btnPrevAcorde" style="min-width:auto; padding:8px 16px;">‹ Ant</button>
            <div style="text-align:center;">
              <div id="lblCifraAtiva" style="font-size: 32px; font-weight:800; color:var(--acento);"></div>
              <div id="lblInvAtiva" style="color:var(--mut); font-size: 14px;"></div>
            </div>
            <button class="btn" id="btnNextAcorde" style="min-width:auto; padding:8px 16px;">Próx ›</button>
          </div>
          <div id="kb-estatico-fullscreen" style="width:100%; min-width:0; box-sizing:border-box; overflow:hidden; position:relative; background: #fff; border-radius: 12px; border: 1px solid var(--border); padding-bottom: 8px;"></div>
        </div>
      </div>
    `;
    
    function atualizarAtivo() {
      container.querySelectorAll(".chip-play").forEach(c => {
        c.classList.toggle("on", parseInt(c.dataset.idx) === idxAtivo);
      });
      
      const curr = todosAcordes[idxAtivo];
      const suffix = ["Fundamental", "1ª Inversão", "2ª Inversão", "3ª Inversão"][curr.inv];
      
      el("lblCifraAtiva").textContent = curr.cifra;
      el("lblInvAtiva").textContent = suffix;
      
      el("btnPrevAcorde").disabled = idxAtivo === 0;
      el("btnNextAcorde").disabled = idxAtivo === todosAcordes.length - 1;
      
      const notas = obterNotasDoAcorde(curr.cifra, curr.inv);
      renderizarTecladoEstatico(el(`kb-estatico-fullscreen`), notas, globalBounds);
    }
    
    container.querySelectorAll(".chip-play").forEach(c => {
      c.addEventListener("click", e => {
        idxAtivo = parseInt(e.target.dataset.idx);
        atualizarAtivo();
      });
    });
    
    el("btnPrevAcorde")?.addEventListener("click", () => { if (idxAtivo > 0) { idxAtivo--; atualizarAtivo(); } });
    el("btnNextAcorde")?.addEventListener("click", () => { if (idxAtivo < todosAcordes.length - 1) { idxAtivo++; atualizarAtivo(); } });
    
    atualizarAtivo();
  }
}

/* Coleção onde cada usuário guarda o estado dele. Se o app tiver
   dois conjuntos independentes, crie DUAS coleções — não dois
   campos no mesmo documento. */
const COLECAO = "dados";

/* E-mails que enxergam telas restritas. Controle COSMÉTICO:
   quem protege dado são as Rules. Vazio = todo mundo vê tudo. */
const DONOS = [];

/* ---------- estado global ---------- */
let usuario  = null;
let papeis   = [];
let situacao = "pendente";
let db = null, auth = null, salvarDoc = null;

let acordeAtual = "";
let notasAtuais = [];
let inversaoAtual = 0;

function el(id) { return document.getElementById(id); }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function chave(s) {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


/* ===========================================================
   1. DOMÍNIO E PERSISTÊNCIA
   =========================================================== */
import { Chord, Note, ChordType, Interval, Scale } from "https://esm.sh/@tonaljs/tonal";

let musicas = [];

function carregarMusicas() {
  try {
    const salva = localStorage.getItem("notas_musicas");
    if (salva) {
      musicas = JSON.parse(salva);
      // Migração de formato antigo
      musicas.forEach(m => {
        if (m.acordes && !m.secoes) {
           m.secoes = [{
             titulo: "Única",
             acordes: m.acordes.map(c => ({ cifra: c, inv: 0, valido: true }))
           }];
           delete m.acordes;
        }
      });
    }
  } catch(e) {}
}

function salvarMusicas() {
  agendarSalvar();
}

const commonQualities = ["", "m", "7", "m7", "maj7", "m7b5", "dim", "dim7", "aug", "sus4", "sus2", "6", "m6", "9", "m9", "maj9", "11", "13"];

function obterNotasDoAcorde(cifra, inversao = 0) {
  if (!cifra) return [];
  const chord = Chord.get(cifra);
  if (chord.empty) return [];
  
  let notes = chord.notes;
  inversao = inversao % notes.length;
  if (inversao > 0) {
    notes = [...notes.slice(inversao), ...notes.slice(0, inversao)];
  }
  
  let octave = 4;
  let result = [];
  let lastMidi = -1;
  
  for (let i = 0; i < notes.length; i++) {
    let noteName = notes[i] + octave;
    let midi = Note.midi(noteName);
    
    if (i > 0 && midi <= lastMidi) {
      octave++;
      noteName = notes[i] + octave;
      midi = Note.midi(noteName);
    }
    result.push(noteName);
    lastMidi = midi;
  }
  
  return result;
}

function centroDeGravidade(notas) {
  if (!notas || notas.length === 0) return 0;
  const soma = notas.reduce((acc, nota) => acc + Note.midi(nota), 0);
  return soma / notas.length;
}

function melhorInversao(acordeAnterior, novoAcordeBase) {
  if (!acordeAnterior || acordeAnterior.length === 0) return 0;
  const centroAnterior = centroDeGravidade(acordeAnterior);
  
  let melhorInv = 0;
  let menorDistancia = Infinity;
  
  for (let i = 0; i <= 3; i++) {
    const notasTeste = obterNotasDoAcorde(novoAcordeBase, i);
    if (!notasTeste || notasTeste.length === 0) continue;
    
    const centroTeste = centroDeGravidade(notasTeste);
    const distancia = Math.abs(centroTeste - centroAnterior);
    
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhorInv = i;
    }
  }
  return melhorInv;
}

/* ===========================================================
   2. PERSISTÊNCIA
   =========================================================== */
let timerSalvar = null;
function agendarSalvar(){
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(() => {
    const payload = { musicas, favoritos: acordesFavoritos };
    if (salvarDoc) salvarDoc(payload).catch(e => aviso("Falha ao salvar: " + (e.code || e.message)));
    else {
      try { localStorage.setItem("notas_dados", JSON.stringify(payload)); } catch(e){}
    }
  }, 600);
}


/* ===========================================================
   3. TEMA
   Só troca o atributo data-tema no <html>; o resto é CSS.
   Grava nos dois lugares: no aparelho (instantâneo, funciona
   antes do login) e na conta (segue de aparelho para aparelho).
   =========================================================== */
const TEMAS = ["escuro", "claro"];
let tema = "escuro";
let salvarTema = null;

function aplicarTema(t, gravar){
  tema = TEMAS.includes(t) ? t : TEMAS[0];
  document.documentElement.setAttribute("data-tema", tema);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", tema === "claro" ? "#f1f4f8" : "#0a0d12");
  const b = el("btnTema");
  if (b) b.setAttribute("aria-label", "Mudar para o tema " + (tema === "claro" ? "escuro" : "claro"));
  try { localStorage.setItem(NS + "_tema", tema); } catch(e){}
  if (gravar && salvarTema) salvarTema(tema).catch(() => {});
}
try { aplicarTema(localStorage.getItem(NS + "_tema") || "escuro", false); }
catch(e){ aplicarTema("escuro", false); }


/* ===========================================================
   4. RENDER
   =========================================================== */
let tecladoGerado = false;

function gerarDOMTeclado() {
  const alvo = el("teclado");
  if (!alvo) return;
  let html = "";
  for (let oct = 3; oct <= 6; oct++) {
    const brancas = ["C", "D", "E", "F", "G", "A", "B"];
    brancas.forEach(nota => {
      let blackKey = "";
      const notaCompleta = nota + oct;
      const midiBranca = Note.midi(notaCompleta);
      
      if (nota !== "E" && nota !== "B") {
        const midiPreta = Note.midi(nota + "#" + oct);
        blackKey = `<div class="tecla-preta" id="tecla-${nota}#${oct}" data-midi="${midiPreta}" style="right:-14px;"></div>`;
      }
      html += `<div style="position:relative; flex:0 0 auto;">
                 <div class="tecla-branca" id="tecla-${nota}${oct}" data-midi="${midiBranca}">${nota}</div>
                 ${blackKey}
               </div>`;
    });
  }
  alvo.innerHTML = html;
  tecladoGerado = true;
}

function pintarDicionario() {
  if (!tecladoGerado) gerarDOMTeclado();
  
  const debug = el("debug-notas");
  if (debug) {
    debug.textContent = acordeAtual ? `Acorde: ${acordeAtual} | Notas: ${notasAtuais.join(", ")}` : "";
  }
  
  document.querySelectorAll(".tecla-branca, .tecla-preta").forEach(t => t.classList.remove("ativa"));
  
  const btnSalvar = el("btnSalvarAcordeDicionario");
  const btnFavoritar = el("btnFavoritarAcorde");
  const btnPlayBloco = el("btnPlayBloco");
  const btnPlayArpejo = el("btnPlayArpejo");
  
  if (btnSalvar) btnSalvar.style.display = notasAtuais.length > 0 ? "flex" : "none";
  if (btnFavoritar) btnFavoritar.style.display = notasAtuais.length > 0 ? "flex" : "none";
  if (btnPlayBloco) btnPlayBloco.style.display = notasAtuais.length > 0 ? "flex" : "none";
  if (btnPlayArpejo) btnPlayArpejo.style.display = notasAtuais.length > 0 ? "flex" : "none";
  
  if (notasAtuais.length > 0) {
    notasAtuais.forEach(nota => {
      const midi = Note.midi(nota);
      const elNota = document.querySelector(`[data-midi="${midi}"]`);
      if (elNota) elNota.classList.add("ativa");
    });
    
    const container = el("teclado-container");
    const activeElements = notasAtuais.map(nota => {
       const midi = Note.midi(nota);
       const elNota = document.querySelector(`[data-midi="${midi}"]`);
       if (!elNota) return null;
       return elNota.parentElement; // Sempre pegar o wrapper para o offsetLeft correto
    }).filter(e => e);
    
    if (activeElements.length > 0 && container) {
       const firstEl = activeElements[0];
       const lastEl = activeElements[activeElements.length - 1];
       
       const left = firstEl.offsetLeft;
       const right = lastEl.offsetLeft + lastEl.offsetWidth;
       const chordWidth = right - left;
       
       const containerWidth = container.clientWidth;
       
       // Calcula escala ideal com 60px de margem (30 de cada lado)
       let idealScale = containerWidth / (chordWidth + 60);
       idealScale = Math.max(0.55, Math.min(idealScale, 1.15)); // Limites de zoom
       
       scale = idealScale;
       el("teclado").style.transform = `scale(${scale})`;
       
       // Rola para centralizar
       const scaledLeft = left * scale;
       const scaledChordWidth = chordWidth * scale;
       const scrollPos = scaledLeft - (containerWidth / 2) + (scaledChordWidth / 2);
       
       container.scrollTo({left: Math.max(0, scrollPos), behavior: 'smooth'});
    }
  }
  
  document.querySelectorAll("#chips-inversao button").forEach(b => {
    b.classList.toggle("on", parseInt(b.dataset.inv) === inversaoAtual);
  });
  
  if (notasAtuais.length >= 4) el("btn-inv-3").style.display = "block";
  else { el("btn-inv-3").style.display = "none"; if (inversaoAtual === 3) inversaoAtual = 0; }
}

function pintar() {
  pintarDicionario();
}


/* ===========================================================
   5. JANELA DE BAIXO E TOAST
   =========================================================== */
let idSheet = null;

function abrirSheet(id){
  const s = document.getElementById(id); 
  if (!s) return;
  idSheet = id;
  el("scrim").classList.add("on");
  s.classList.add("on");
}

function abrirOpcoes(titulo, opcoes, aoEscolher){
  el("opTit").textContent = titulo;
  el("opLista").innerHTML = opcoes.map(o =>
    `<button class="opt" data-op="${esc(o.v)}">${esc(o.r)}</button>`).join("");
  el("opLista").onclick = e => {
    const b = e.target.closest("[data-op]"); if (!b) return;
    fecharSheet(); aoEscolher(b.dataset.op);
  };
  el("scrim").classList.add("on");
  el("opSheet").classList.add("on");
}

function fecharSheet(){
  el("scrim").classList.remove("on");
  document.querySelectorAll(".sheet").forEach(s => s.classList.remove("on"));
  idSheet = null;
}

let timerToast = null;
function aviso(msg){
  const t = el("toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.classList.remove("on"), 3000);
}


/* ===========================================================
   6. EVENTOS
   UM listener no document. Interação identificada por data-*.
   Ao acrescentar um botão, acrescente um data- novo — não um
   addEventListener novo. É isso que faz conteúdo redesenhado
   continuar funcionando sem religar nada.
   =========================================================== */
document.addEventListener("click", e => {
  const btnNova = e.target.closest("#btnNovaMusica");
  if (btnNova) {
    construtorMusica = {
      id: "M_" + Date.now(),
      nome: "",
      secoes: [{ titulo: "Verso", texto: "", acordes: [] }]
    };
    el("inputNomeMusica").value = "";
    if (typeof renderizarConstrutorMusica === 'function') renderizarConstrutorMusica();
    
    document.querySelectorAll(".nav button").forEach(b => b.classList.remove("on"));
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    el("scr-nova-musica")?.classList.add("active");
    el("ctxLabel").textContent = "Nova Música";
    window.scrollTo({ top:0 });
    return;
  }

  const tab = e.target.closest("[data-scr]");
  if (tab){
    document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("on", b === tab));
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    el("scr-" + tab.dataset.scr)?.classList.add("active");
    el("ctxLabel").textContent =
      { inicio:"Início", meus:"Os meus", perfil:"Perfil" }[tab.dataset.scr] || "";
    window.scrollTo({ top:0 });
    return;
  }
  const mk = e.target.closest("[data-marcar]");
  if (mk){ e.stopPropagation(); return alternar(mk.dataset.marcar); }

  const ab = e.target.closest("[data-abrir]");
  if (ab) return abrirSheet(ab.dataset.abrir);

  const invBtn = e.target.closest("#chips-inversao button");
  if (invBtn) {
    inversaoAtual = parseInt(invBtn.dataset.inv);
    notasAtuais = obterNotasDoAcorde(acordeAtual, inversaoAtual);
    pintarDicionario();
    return;
  }
  
  const btnPlayBloco = e.target.closest("#btnPlayBloco");
  if (btnPlayBloco) {
    if (window.AudioSynth) window.AudioSynth.tocarAcorde(notasAtuais, "bloco");
    return;
  }
  const btnPlayArpejo = e.target.closest("#btnPlayArpejo");
  if (btnPlayArpejo) {
    if (window.AudioSynth) window.AudioSynth.tocarAcorde(notasAtuais, "arpejo");
    return;
  }
  
  const btnExemplo = e.target.closest(".btn-play-exemplo");
  if (btnExemplo) {
    const notas = btnExemplo.dataset.notas ? btnExemplo.dataset.notas.split(",") : [];
    const modo = btnExemplo.dataset.modo || "escala";
    const kbd = btnExemplo.dataset.kbd || null;
    const lev = btnExemplo.dataset.levada || "balada";
    const bpmB = Number(btnExemplo.dataset.bpm) || 0;
    let fx = [];
    if (btnExemplo.dataset.fluxo) { try { fx = JSON.parse(btnExemplo.dataset.fluxo); } catch (err) { fx = []; } }
    if (window.AudioSynth) {
      if (modo === "levada") {
        window.AudioSynth.tocarLevada(fx, lev, bpmB, kbd);
      } else if (modo === "solo") {
        window.AudioSynth.tocarSolo(fx, lev, bpmB, btnExemplo.dataset.tom || "C", kbd);
      } else if (modo === "progressao") {
        window.AudioSynth.tocarProgressao(btnExemplo.dataset.fluxo, kbd);
      } else if (notas.length > 0) {
        window.AudioSynth.tocarAcorde(notas, modo, kbd);
      }
    }
    return;
  }

  // ---- escolher a levada da musica ----
  const chipLev = e.target.closest(".ct-lev");
  if (chipLev && musicaAtual) {
    const k = chipLev.dataset.levada;
    if (LEVADAS[k]) {
      musicaAtual.levada = k;
      musicaAtual.bpm = LEVADAS[k].bpm;
      const idx = musicas.findIndex(m => m.id === musicaAtual.id);
      if (idx !== -1) musicas[idx] = musicaAtual;
      salvarMusicas();
      renderComoTocar();
    }
    return;
  }

  // ---- ajustar o andamento ----
  const btnBpm = e.target.closest(".ct-bpm-b");
  if (btnBpm && musicaAtual) {
    const passo = Number(btnBpm.dataset.bpm) || 0;
    const novoBpm = Math.max(40, Math.min(220, bpmDaMusica(musicaAtual) + passo));
    musicaAtual.bpm = novoBpm;
    const idx = musicas.findIndex(m => m.id === musicaAtual.id);
    if (idx !== -1) musicas[idx] = musicaAtual;
    salvarMusicas();
    renderComoTocar();
    return;
  }

  // ---- painel de acessos (admin) ----
  const ap = e.target.closest("[data-aprovar]"); if (ap) return decidir(ap.dataset.aprovar, "aprovado");
  const ng = e.target.closest("[data-negar]");   if (ng) return decidir(ng.dataset.negar, "negado");
  const lt = e.target.closest("[data-lote]");    if (lt) return decidirLote(lt.dataset.lote);
  const sa = e.target.closest("[data-selall]");  if (sa) return marcarTodos(sa.dataset.selall === "1");
  
  // ---- Dicionario Reverso ----
  const limpaBtn = e.target.closest("#qLimpa");
  if (limpaBtn) {
    notasAtuais = [];
    acordeAtual = "";
    inversaoAtual = 0;
    const q = el("q"); if(q) q.value = "";
    limpaBtn.style.display = "none";
    pintarDicionario();
    return;
  }
  
  const tecla = e.target.closest("#teclado .tecla-branca, #teclado .tecla-preta");
  if (tecla && el("scr-inicio")?.classList.contains("active")) {
    const midi = parseInt(tecla.dataset.midi);
    const notaName = Note.fromMidi(midi);
    if (notasAtuais.includes(notaName)) {
      notasAtuais = notasAtuais.filter(n => n !== notaName);
    } else {
      notasAtuais.push(notaName);
      notasAtuais.sort((a, b) => Note.midi(a) - Note.midi(b));
    }
    
    if (notasAtuais.length > 0) {
      const pClasses = notasAtuais.map(n => Note.pitchClass(n));
      const detectados = Chord.detect(pClasses);
      if (detectados.length > 0) {
        acordeAtual = detectados[0];
        el("q").value = acordeAtual;
      } else {
        acordeAtual = pClasses.join(",");
        el("q").value = acordeAtual;
      }
      el("qLimpa").style.display = "block";
    } else {
      acordeAtual = "";
      el("q").value = "";
      el("qLimpa").style.display = "none";
    }
    inversaoAtual = 0;
    pintarDicionario();
    
    // Auto-play the note when clicking a key
    if (window.AudioSynth) window.AudioSynth.playNote(midi, 0, 1.0);
    return;
  }

  const ps = e.target.closest("[data-selac]");   if (ps) return alternarSel(ps.dataset.selac);
  
  const fecharModal = e.target.closest("#btnVoltarRelatorio");
  if (fecharModal) {
    // Limpar relatório para evitar elementos órfãos
    const relatorio = el("scr-relatorio");
    relatorio.style.display = "none";
    
    // Restaurar scr-meus usando o sistema de classes correto (NÃO style.display)
    const scrMeus = el("scr-meus");
    scrMeus.style.display = ""; // Limpar style inline para CSS controlar
    scrMeus.classList.add("active");
    
    // Restaurar nav
    el("nav").style.display = "";
    
    // Reconstruir layout do teclado com delay para garantir DOM visível
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (musicaAtual && typeof renderizarVisaoMusica === 'function') {
          renderizarVisaoMusica();
        }
      });
    });
  }
  
  const fecharComoTocar = e.target.closest("#btnVoltarComoTocar");
  if (fecharComoTocar) {
    el("scr-comotocar").style.display = "none";
    const scrMeus = el("scr-meus");
    scrMeus.style.display = ""; 
    scrMeus.classList.add("active");
    el("nav").style.display = "";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (musicaAtual && typeof renderizarVisaoMusica === 'function') {
          renderizarVisaoMusica();
        }
      });
    });
    return;
  }
});

el("scrim").addEventListener("click", fecharSheet);
el("btnTema").addEventListener("click", () => aplicarTema(tema === "claro" ? "escuro" : "claro", true));
el("shBtn").addEventListener("click", () => { if (idSheet){ alternar(idSheet); abrirSheet(idSheet); } });
el("q").addEventListener("input", (e) => {
  let val = e.target.value.trim();
  if (val.length > 0) {
    val = val.charAt(0).toUpperCase() + val.slice(1);
  }
  
  mostrarAutocomplete(val);
  
  acordeAtual = val;
  notasAtuais = obterNotasDoAcorde(acordeAtual, inversaoAtual);
  pintarDicionario();
});

function mostrarAutocomplete(val) {
  const container = el("autocomplete-results");
  if (!container) return;
  
  if (!val || val.length === 0) {
    container.classList.remove("active");
    return;
  }
  
  const [root, quality] = Chord.tokenize(val);
  if (!root) {
    container.classList.remove("active");
    return;
  }
  
  let matches = [];
  if (quality === "") {
    matches = commonQualities;
  } else {
    const allTypes = ChordType.all().map(t => t.aliases[0]);
    matches = allTypes.filter(q => q && q.toLowerCase().startsWith(quality.toLowerCase()));
    matches.sort((a, b) => a.length - b.length);
  }
  
  matches = matches.slice(0, 8);
  
  if (matches.length === 0 || (matches.length === 1 && matches[0] === quality)) {
    container.classList.remove("active");
    return;
  }
  
  container.innerHTML = matches.map(q => {
    const fullChord = root + q;
    return `<div class="autocomplete-item" data-chord="${fullChord}"><b>${root}</b>${q}</div>`;
  }).join("");
  
  container.classList.add("active");
}

document.addEventListener("click", e => {
  const item = e.target.closest(".autocomplete-item");
  if (item) {
    const chord = item.dataset.chord;
    el("q").value = chord;
    acordeAtual = chord;
    inversaoAtual = 0;
    notasAtuais = obterNotasDoAcorde(acordeAtual, inversaoAtual);
    pintarDicionario();
    el("autocomplete-results").classList.remove("active");
    
    // Atualizar visual dos chips para Fundamental
    document.querySelectorAll("#chips-inversao button").forEach(b => {
      b.classList.toggle("on", parseInt(b.dataset.inv) === 0);
    });
  } else if (!e.target.closest(".search-wrap")) {
    el("autocomplete-results")?.classList.remove("active");
  }
});
el("qLimpa").addEventListener("click", () => { 
  el("q").value = ""; 
  acordeAtual = "";
  notasAtuais = [];
  pintarDicionario(); 
  el("q").focus(); 
});

// Pinch to zoom no teclado
let scale = 1;
const tecladoContainer = el("teclado-container");
if (tecladoContainer) {
  let touchStartDist = 0;
  let initialScale = 1;
  tecladoContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      touchStartDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      initialScale = scale;
    }
  });
  tecladoContainer.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      scale = initialScale * (dist / touchStartDist);
      scale = Math.max(0.5, Math.min(scale, 2));
      el("teclado").style.transform = `scale(${scale})`;
    }
  }, { passive: false });
  tecladoContainer.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      scale -= e.deltaY * 0.01;
      scale = Math.max(0.5, Math.min(scale, 2));
      el("teclado").style.transform = `scale(${scale})`;
    }
  }, { passive: false });
}
el("btnAcessos")?.addEventListener("click", () => {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  el("scr-acessos").classList.add("active");
  el("ctxLabel").textContent = "Gerenciar acessos";
  window.scrollTo({ top:0 });
  listarPedidos();
});
el("acVoltar")?.addEventListener("click", () => document.querySelector('#nav [data-scr="perfil"]')?.click());
el("segAc")?.addEventListener("click", e => {
  const b = e.target.closest("button[data-st]"); if (!b) return;
  stAc = b.dataset.st; selAc.clear();
  [...el("segAc").children].forEach(x => x.classList.toggle("on", x === b));
  pintarAc();
});
el("q-ac")?.addEventListener("input", e => { qAc = e.target.value; pintarAc(); });
el("espRecarregar").addEventListener("click", () => location.reload());
el("espSair").addEventListener("click", () => auth ? auth.signOut().then(() => location.reload()) : location.reload());


/* ===========================================================
   7. FIREBASE — auth, portaria e sincronização
   =========================================================== */
async function iniciar(){
  if (!CONFIGURADO){
    el("gateLoad").style.display = "none";
    el("gateBtn").style.display = "block";
    el("offMsg").style.display = "block";
    el("offMsg").innerHTML = "Firebase ainda não configurado — o botão abre em <b>modo local</b>.";
    el("btnLogin").addEventListener("click", () => {
      try { 
        const local = JSON.parse(localStorage.getItem("notas_dados") || '{"musicas":[], "favoritos":[]}');
        musicas = local.musicas || [];
        acordesFavoritos = local.favoritos || [];
      } catch(e){}
      entrar({ displayName:"Modo local", email:"salvo neste aparelho", photoURL:"", uid:"local" }, ["member"]);
    });
    return;
  }

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
          setPersistence, browserLocalPersistence }
    = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp,
          collection, query, where, getDocs, writeBatch }
    = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app); db = getFirestore(app);
  await setPersistence(auth, browserLocalPersistence);

  el("btnLogin").addEventListener("click", async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch(e){ aviso("Não deu pra entrar: " + e.code); }
  });
  el("btnLogout").addEventListener("click", () => signOut(auth).then(() => location.reload()));

  onAuthStateChanged(auth, async u => {
    if (!u){
      el("gateLoad").style.display = "none";
      el("gateBtn").style.display = "block";
      el("gate").classList.add("on"); el("app").style.display = "none";
      return;
    }

    // perfil, papéis e situação
    const refU = doc(db, "users", u.uid);
    let snap = await getDoc(refU);
    if (!snap.exists()){
      await setDoc(refU, {
        nome: u.displayName || "", email: u.email || "", foto: u.photoURL || "",
        roles: ["member"], status: "pendente", criadoEm: serverTimestamp()
      });
      snap = await getDoc(refU);
    }
    const dados = snap.data() || {};

    salvarTema = t => updateDoc(refU, { tema: t });
    if (dados.tema && !localStorage.getItem(NS + "_tema")) aplicarTema(dados.tema, false);

    papeis = dados.roles || ["member"];
    if (dados.papel === "admin" && !papeis.includes("admin")) papeis = [...papeis, "admin"];
    situacao = dados.status || "pendente";

    // PORTARIA: só quem foi aprovado passa
    if (situacao !== "aprovado") return mostrarEspera(u, situacao);

    // estado do usuário, em tempo real
    const refD = doc(db, COLECAO, u.uid);
    salvarDoc = payload => setDoc(refD, { ...payload, atualizadoEm: serverTimestamp() }, { merge:true });
    onSnapshot(refD, s => {
      if (s.exists()) {
        const data = s.data();
        musicas = data.musicas || (data.ids ? data.ids : []); // migração
        acordesFavoritos = data.favoritos || [];
      } else {
        musicas = [];
        acordesFavoritos = [];
      }
      pintar();
      renderizarListaMusicas();
      renderizarListaFavoritos();
    });

    apiAdmin = { db, doc, updateDoc, collection, query, where, getDocs, writeBatch, onSnapshot };
    entrar(u, papeis);
    listarPedidos();
    vigiarPedidos();
  });
}

function mostrarEspera(u, st){
  el("gate").classList.remove("on");
  el("app").style.display = "none";
  el("espera").classList.add("on");
  el("espMail").textContent = u.email || "";
  el("espTit").textContent  = st === "negado" ? "Acesso não liberado" : "Aguardando liberação";
  el("espTxt").textContent  = st === "negado"
    ? "O administrador não liberou este e-mail."
    : "Seu pedido chegou. Assim que liberarem, toque em “Já fui liberado”.";
}

function entrar(u, roles){
  usuario = u; papeis = roles;
  el("gate").classList.remove("on");
  el("espera").classList.remove("on");
  el("app").style.display = "block";

  const foto = u.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
  el("avatar").src = foto; el("pAvatar").src = foto;
  el("pNome").textContent = u.displayName || "—";
  el("pMail").textContent = u.email || "—";
  el("pRoles").innerHTML = roles.map(r =>
    `<span class="role ${r === "admin" ? "admin" : ""}">${esc(r)}</span>`).join("");

  // hub por papéis: a ferramenta nem é renderizada para quem não tem o papel
  el("painelAcesso").style.display = roles.includes("admin") ? "block" : "none";
  el("syncMsg").textContent = CONFIGURADO
    ? "Ligado à nuvem. O que você marcar aparece igual em qualquer aparelho."
    : "Modo local: salvo só neste navegador.";
  aplicarTema(tema, false);
  pintar();
}


/* ===========================================================
   8. PAINEL DE ACESSOS (só admin)
   Busca, abas por situação, ação em lote e sinalização de
   pedido novo em tempo real.
   =========================================================== */
let apiAdmin = null, vigia = null;
let USERS = [], stAc = "pendente", qAc = "", selAc = new Set();
const VAZIO_AC = { pendente:"Nenhum pedido no momento.",
                   aprovado:"Ninguém liberado ainda além de você.",
                   negado:"Nenhum acesso negado." };
const sit = u => u.status || "pendente";

async function listarPedidos(){
  if (!apiAdmin || !papeis.includes("admin")) return;
  const { db, collection, getDocs } = apiAdmin;
  try {
    const qs = await getDocs(collection(db, "users"));
    USERS = [];
    qs.forEach(d => { if (d.id !== usuario.uid) USERS.push({ id:d.id, ...d.data() }); });
  } catch(e){ return aviso("Não deu pra ler a lista: " + (e.code || e.message)); }
  contarAc(); pintarAc();
}

function contarAc(){
  const n = st => USERS.filter(u => sit(u) === st).length;
  const p = n("pendente"), l = n("aprovado"), g = n("negado");
  const põe = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  põe("cPend", p); põe("cLib", l); põe("cNeg", g);
  põe("acPlacar", `${p} pedidos · ${l} liberados · ${g} negados`);
  sinalizar(p);
}

/** aviso de "tem gente esperando", no espírito de mensagem não lida */
function sinalizar(n){
  const nb = el("navBadgePerfil");
  if (nb){ nb.style.display = n ? "grid" : "none"; nb.textContent = n > 9 ? "9+" : n; }
  const pb = el("pendBadge");
  if (pb){ pb.style.display = n ? "inline-block" : "none"; pb.textContent = n; }
  const bt = el("btnAcessosTxt");
  if (bt) bt.textContent = n ? (n === 1 ? "Ver o pedido" : "Ver os " + n + " pedidos")
                             : "Gerenciar acessos";
}

/** se alguém pedir acesso com o app aberto, a bolinha aparece sozinha */
function vigiarPedidos(){
  if (!apiAdmin || !papeis.includes("admin") || vigia) return;
  const { db, collection, query, where, onSnapshot } = apiAdmin;
  try {
    vigia = onSnapshot(query(collection(db, "users"), where("status", "==", "pendente")),
      s => { let n = 0; s.forEach(d => { if (d.id !== usuario.uid) n++; });
             sinalizar(n); listarPedidos(); },
      () => {});
  } catch(e){}
}

function visiveisAc(){
  const t = chave(qAc).trim();
  return USERS.filter(u => sit(u) === stAc)
    .filter(u => !t || chave((u.nome || "") + " " + (u.email || "")).includes(t))
    .sort((a,b) => String(a.nome||"").localeCompare(String(b.nome||""), "pt"));
}

function pintarAc(){
  const lista = el("listaAc"); if (!lista) return;
  const vis = visiveisAc();
  const total = USERS.filter(u => sit(u) === stAc).length;
  const modoLote = selAc.size > 0;

  lista.innerHTML = vis.length ? vis.map(u => {
    const on = selAc.has(u.id);
    const ini = String(u.nome || u.email || "?").trim()[0].toUpperCase();
    return `<div class="linha ${on ? "sel" : ""}" data-selac="${u.id}">
      <div class="chk ${on ? "on" : ""}">✓</div>
      ${u.foto ? `<img src="${esc(u.foto)}" alt="">` : `<div class="ini">${esc(ini)}</div>`}
      <div class="qm"><b>${esc(u.nome || "sem nome")}</b><span>${esc(u.email || "")}</span></div>
      ${modoLote ? "" : `<div class="acoes">${acoesDe(stAc, u.id)}</div>`}
    </div>`;
  }).join("") : `<div class="vazio"><b>${total && qAc ? "Ninguém com esse nome" : VAZIO_AC[stAc]}</b></div>`;

  const bar = el("loteBar");
  bar.style.display = selAc.size ? "flex" : "none";
  el("loteN").textContent = selAc.size + (selAc.size === 1 ? " selecionado" : " selecionados");
  el("loteAcoes").innerHTML = acoesLote(stAc);
}

function acoesDe(st, id){
  if (st === "pendente") return `<button class="mini ok" data-aprovar="${id}">Liberar</button>
                                 <button class="mini no" data-negar="${id}">Negar</button>`;
  if (st === "aprovado") return `<button class="mini no" data-negar="${id}">Remover</button>`;
  return `<button class="mini" data-aprovar="${id}">Liberar</button>`;
}
function acoesLote(st){
  if (st === "pendente") return `<button class="mini ok" data-lote="aprovado">Liberar</button>
                                 <button class="mini no" data-lote="negado">Negar</button>`;
  if (st === "aprovado") return `<button class="mini no" data-lote="negado">Remover</button>`;
  return `<button class="mini" data-lote="aprovado">Liberar</button>`;
}

function alternarSel(id){ selAc.has(id) ? selAc.delete(id) : selAc.add(id); pintarAc(); }
function marcarTodos(ligar){
  visiveisAc().forEach(u => ligar ? selAc.add(u.id) : selAc.delete(u.id));
  pintarAc();
}

async function decidir(uid, novo){
  if (!apiAdmin) return;
  const { db, doc, updateDoc } = apiAdmin;
  try {
    await updateDoc(doc(db, "users", uid), { status: novo });
    const u = USERS.find(x => x.id === uid); if (u) u.status = novo;
    selAc.delete(uid);
    aviso(novo === "aprovado" ? "Liberado." : "Acesso removido.");
    contarAc(); pintarAc();
  } catch(e){ aviso("Não deu: " + (e.code || e.message)); }
}

/** blocos de 400 porque um lote do Firestore aceita no máximo 500 */
async function decidirLote(novo){
  if (!apiAdmin || !selAc.size) return;
  const { db, doc, writeBatch } = apiAdmin;
  const ids = [...selAc];
  try {
    for (let i = 0; i < ids.length; i += 400){
      const b = writeBatch(db);
      ids.slice(i, i + 400).forEach(id => b.update(doc(db, "users", id), { status: novo }));
      await b.commit();
    }
    ids.forEach(id => { const u = USERS.find(x => x.id === id); if (u) u.status = novo; });
    selAc.clear();
    aviso(ids.length + (ids.length === 1 ? " pessoa atualizada." : " pessoas atualizadas."));
    contarAc(); pintarAc();
  } catch(e){ aviso("Não deu: " + (e.code || e.message)); }
}


iniciar();

/* ===========================================================
   AUDIO ENGINE (Web Audio API)
   =========================================================== */
const AudioSynth = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  playNote(midiNote, timeOffset = 0, duration = 1.5, targetKbdId = null, vel = 1) {
    this.init();
    const t = this.ctx.currentTime + timeOffset;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const pico = Math.max(0.04, Math.min(0.42, 0.3 * vel));
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Mix of sine and triangle for a smooth epiano sound
    osc.type = "triangle";
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(freq, t);
    
    // Envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(pico, t + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // Decay
    
    osc.start(t);
    osc.stop(t + duration);

    // Feedback visual (Teclado UI)
    setTimeout(() => {
      let selector = ".v-key[data-midi='" + midiNote + "']";
      if (targetKbdId) {
        selector = "#" + targetKbdId + " " + selector;
      }
      const keys = document.querySelectorAll(selector);
      keys.forEach(k => {
        k.classList.add("lit");
        setTimeout(() => k.classList.remove("lit"), 300);
      });
    }, timeOffset * 1000);
  },
  tocarAcorde(notasStr, modo = "bloco", targetKbdId = null) {
    if (!notasStr || notasStr.length === 0) return;
    this.init();
    const midiNotes = notasStr.map(n => Note.midi(n));
    if (modo === "bloco") {
      midiNotes.forEach(midi => this.playNote(midi, 0, 2.0, targetKbdId));
    } else if (modo === "arpejo") {
      midiNotes.forEach((midi, i) => this.playNote(midi, i * 0.15, 2.0, targetKbdId));
    } else if (modo === "escala") {
      midiNotes.forEach((midi, i) => this.playNote(midi, i * 0.25, 1.0, targetKbdId));
    } else if (modo === "lick") {
      // Padr�o de Solo: 0, 1, 2, 4, 3, 1, 0
      // Assumindo pentatonica de 5 notas + 1 (oitava) = 6 notas
      const p = [0, 1, 2, 4, 3, 1, 0];
      const tempos = [0, 0.25, 0.5, 0.75, 1.0, 1.35, 1.6]; // Swing simulado no final
      p.forEach((idx, i) => {
        if (midiNotes[idx]) {
           this.playNote(midiNotes[idx], tempos[i], 1.0, targetKbdId);
        }
      });
    }
  },
  /* ---- LEVADAS: cada estilo tem seu desenho ritmico proprio ---- */
  _sw(beat, L, sb) {
    const swing = (L.swing && Math.abs((beat % 1) - 0.5) < 0.01) ? sb * 0.16 : 0;
    return beat * sb + swing;
  },
  tocarLevada(fluxo, levadaKey, bpm, targetKbdId = null) {
    this.init();
    const L = LEVADAS[levadaKey] || LEVADAS.balada;
    const sb = 60 / (bpm || L.bpm);
    const compassos = Math.max(1, Math.min(fluxo.length, 8));
    for (let i = 0; i < compassos; i++) {
      const ac = fluxo[i] || {};
      const midis = (ac.notas || []).map(n => Note.midi(n)).filter(m => m != null).sort((a, b) => a - b);
      if (!midis.length) continue;
      const t0 = i * L.batidas * sb;
      const baixo = midis[0] - 12;
      L.baixo.forEach(b => this.playNote(baixo, t0 + this._sw(b, L, sb), sb * 1.15, targetKbdId, 0.95));
      L.acordes.forEach(ev => {
        midis.forEach(m => this.playNote(m, t0 + this._sw(ev.t, L, sb), ev.d * sb, targetKbdId, ev.v));
      });
    }
  },
  /* ---- SOLO: o lick anda em cima dos acordes da musica, nao de uma escala fixa ---- */
  tocarSolo(fluxo, levadaKey, bpm, tom, targetKbdId = null) {
    this.init();
    const L = LEVADAS[levadaKey] || LEVADAS.balada;
    const sb = 60 / (bpm || L.bpm);
    const notas = gerarLickDoFluxo(fluxo, tom, L);
    notas.forEach(n => this.playNote(n.midi, this._sw(n.t, L, sb), n.d * sb, targetKbdId, n.v));
  },
  tocarProgressao(fluxoJSON, targetKbdId = null) {
    this.init();
    let fluxo = [];
    try { fluxo = JSON.parse(fluxoJSON); } catch(e) { return; }
    if (!fluxo || fluxo.length === 0) return;

    let acordesParaTocar = [];
    for(let i=0; i<4; i++) {
      if (fluxo[i]) acordesParaTocar.push(fluxo[i]);
      else acordesParaTocar.push(fluxo[fluxo.length-1]);
    }

    acordesParaTocar.forEach((acordeObj, compassoIndex) => {
      const notasStr = acordeObj.notas || [];
      const midiNotes = notasStr.map(n => Note.midi(n));
      const tempoBaseDoCompasso = compassoIndex * 1.6;

      [0, 0.4, 0.8, 1.2].forEach(beatOffset => {
        midiNotes.forEach(midi => {
          this.playNote(midi, tempoBaseDoCompasso + beatOffset, 0.3, targetKbdId);
        });
      });
    });
  },
  getNotasEscala(tom) {
    let t = tom.replace(/m7?$/, "");
    let isMenor = tom.includes("m");
    try {
      const scaleType = isMenor ? "minor pentatonic" : "major pentatonic";
      return Scale.get(t + "4 " + scaleType).notes.concat([t + "5"]);
    } catch(e) {
      return [t+"4", "E4", "G4", t+"5"];
    }
  }
};
window.AudioSynth = AudioSynth;

/* ===========================================================
   LEVADAS — o desenho ritmico de cada estilo.
   Posicoes em BATIDAS (0 = primeira batida do compasso).
   v = intensidade (acento). d = duracao em batidas.
   =========================================================== */
const LEVADAS = {
  balada: { nome: "Balada", batidas: 4, bpm: 72, swing: false,
    baixo: [0, 2],
    acordes: [{ t: 0, d: 1.8, v: .95 }, { t: 2, d: 1.8, v: .7 }],
    dica: "Baixo na 1 e na 3, acorde segurado por cima. Deixa a musica respirar entre as frases." },

  reta: { nome: "Cama reta", batidas: 4, bpm: 92, swing: false,
    baixo: [0],
    acordes: [{ t: 0, d: 3.7, v: .85 }],
    dica: "Um acorde por compasso, segurado inteiro. E o colchao mais simples que existe: some pra voz aparecer." },

  pop: { nome: "Pop 8", batidas: 4, bpm: 104, swing: false,
    baixo: [0, 2],
    acordes: [{ t: 0, d: .45, v: .95 }, { t: .5, d: .45, v: .55 }, { t: 1, d: .45, v: .75 }, { t: 1.5, d: .45, v: .55 },
              { t: 2, d: .45, v: .9 }, { t: 2.5, d: .45, v: .55 }, { t: 3, d: .45, v: .75 }, { t: 3.5, d: .45, v: .6 }],
    dica: "Colcheias sem parar, com acento na 1 e na 3. E o motor da musica pop: a mao vira metronomo." },

  rock: { nome: "Rock", batidas: 4, bpm: 128, swing: false,
    baixo: [0, 2],
    acordes: [{ t: 0, d: .8, v: 1 }, { t: 1, d: .8, v: .7 }, { t: 2, d: .8, v: .95 }, { t: 3, d: .8, v: .75 }],
    dica: "Bloco firme nas quatro batidas. Peso vem da regularidade, nao da velocidade." },

  sertanejo: { nome: "Sertanejo", batidas: 4, bpm: 88, swing: false,
    baixo: [0, 2],
    acordes: [{ t: .5, d: .4, v: .75 }, { t: 1, d: .4, v: .9 }, { t: 1.5, d: .4, v: .6 },
              { t: 2.5, d: .4, v: .75 }, { t: 3, d: .4, v: .9 }, { t: 3.5, d: .4, v: .6 }],
    dica: "O baixo cai na batida e o acorde entra logo depois. E esse atraso de proposito que da o balanco." },

  samba: { nome: "Samba", batidas: 4, bpm: 96, swing: false,
    baixo: [0, 2],
    acordes: [{ t: .5, d: .35, v: .85 }, { t: 1.5, d: .35, v: .65 }, { t: 2, d: .35, v: .95 },
              { t: 3, d: .35, v: .7 }, { t: 3.5, d: .35, v: .9 }],
    dica: "Quase nada cai na batida cheia. Conta 'um e dois e' em voz alta e toca nos 'e'." },

  bolero: { nome: "Bolero", batidas: 4, bpm: 80, swing: false,
    baixo: [0, 2],
    acordes: [{ t: 0, d: .7, v: .9 }, { t: 1.5, d: .5, v: .6 }, { t: 2, d: .7, v: .8 }, { t: 3, d: .7, v: .7 }],
    dica: "O 'tam... ta-tam' arrastado. Romantico e sem pressa, com peso na primeira." },

  swing: { nome: "Swing", batidas: 4, bpm: 120, swing: true,
    baixo: [0, 2],
    acordes: [{ t: 1, d: .5, v: .8 }, { t: 2.5, d: .5, v: .6 }, { t: 3.5, d: .5, v: .85 }],
    dica: "O acorde entra fora da batida e deixa buraco. Quem marca o tempo e a sua cabeca, nao a mao." },

  funk: { nome: "Funk", batidas: 4, bpm: 100, swing: false,
    baixo: [0, 2.5],
    acordes: [{ t: 0, d: .22, v: .95 }, { t: .75, d: .22, v: .6 }, { t: 1.5, d: .22, v: .85 },
              { t: 2, d: .22, v: .7 }, { t: 2.75, d: .22, v: .9 }, { t: 3.5, d: .22, v: .6 }],
    dica: "Semicolcheias curtas e secas, a mao fecha rapido. O silencio entre elas e que faz o groove." },

  valsa: { nome: "Valsa", batidas: 3, bpm: 120, swing: false,
    baixo: [0],
    acordes: [{ t: 1, d: .8, v: .8 }, { t: 2, d: .8, v: .65 }],
    dica: "Baixo na 1, acorde na 2 e na 3. Um-dois-tres, um-dois-tres, sempre girando." }
};

function levadaDaMusica(musica) {
  const k = musica && musica.levada;
  return (k && LEVADAS[k]) ? k : "balada";
}
function bpmDaMusica(musica) {
  const b = musica && Number(musica.bpm);
  if (b >= 40 && b <= 220) return Math.round(b);
  return LEVADAS[levadaDaMusica(musica)].bpm;
}

/* Monta o lick EM CIMA dos acordes do fluxo: notas do proprio acorde,
   com nota de aproximacao cromatica ligando para o acorde seguinte. */
const MOTIVOS_LICK = [
  [0, 1, 2, 1, 2, 3, 2, -1],
  [2, 1, 0, 1, 2, 4, 3, -1],
  [0, 2, 1, 3, 2, 1, 0, -1],
  [4, 3, 2, 3, 1, 2, 0, -1]
];

function gerarLickDoFluxo(fluxo, tom, L) {
  const out = [];
  const compassos = Math.max(1, Math.min((fluxo || []).length, 8));
  const porCompasso = L.batidas === 3 ? 6 : 8;   // colcheias
  for (let i = 0; i < compassos; i++) {
    const ac = fluxo[i] || {};
    const info = Chord.get(ac.cifra || "");
    let base = (info && !info.empty && info.notes.length) ? info.notes : [];
    if (!base.length) continue;
    // duas oitavas de notas do acorde, em MIDI, subindo
    let tons = base.map(n => Note.midi(n + "4")).filter(m => m != null);
    tons = tons.concat(tons.map(m => m + 12)).sort((a, b) => a - b);
    if (!tons.length) continue;

    const prox = fluxo[(i + 1) % compassos] || ac;
    const rProx = extrairFundamental(prox.cifra || ac.cifra || "");
    const midiProx = rProx ? Note.midi(rProx + "5") : null;
    const aprox = midiProx != null ? midiProx - 1 : tons[0] - 1;

    const motivo = MOTIVOS_LICK[i % MOTIVOS_LICK.length];
    const t0 = i * L.batidas;
    for (let j = 0; j < porCompasso; j++) {
      const idx = motivo[j % motivo.length];
      const midi = (idx === -1) ? aprox : tons[idx % tons.length];
      if (midi == null) continue;
      out.push({ midi, t: t0 + j * 0.5, d: 0.45, v: (j % 2 === 0 ? 0.9 : 0.65) });
    }
  }
  return out;
}

/* ===========================================================
   MOTOR ESPECIALISTA DE ANÁLISE HARMÔNICA
   =========================================================== */
function gerarRelatorioHarmonico(musica, tom) {
  const relatorio = { tom: tom, fluxo: [], eventos: [], funcoes: {} };
  let acordesM = [];
  
  if (musica.secoes && musica.secoes.length > 0) {
    musica.secoes.forEach(sec => {
      if (sec.acordes) acordesM.push(...sec.acordes);
    });
  } else if (musica.acordes) {
    acordesM = musica.acordes;
  }
  
  let i = 1;
  const contagem = {};
  acordesM.forEach(a => {
    try {
      let cifra = normalizarCifra(a.cifra || a);
      if (!cifra || cifra === "%") return;
      let grau = calcularGrau(cifra, tom);
      let func = analisarFuncaoH(cifra, tom, grau);
      let notas = obterNotasDoAcorde(cifra, 0);
      relatorio.fluxo.push({ cp: i++, cifra: cifra, grau, func, notas });
      relatorio.funcoes[cifra] = func;              // o relatório procura por cifra
      contagem[func] = (contagem[func] || 0) + 1;   // contagem só para os eventos
    } catch(e){}
  });

  const temFuncao = frag => Object.keys(contagem).some(k => k.indexOf(frag) === 0);
  if (temFuncao("Dominante secundária")) {
    relatorio.eventos.push({ 
      tipo: "tensão", 
      texto: "Uso intenso de Dominantes Secundárias. A música tem transições que 'puxam' forte para acordes fora da escala básica." 
    });
  }
  if (temFuncao("Subdominante menor")) {
    relatorio.eventos.push({ 
      tipo: "emocional", 
      texto: "Acorde de Empréstimo Modal (Subdominante Menor) encontrado! Cria um clima dramático e melancólico na preparação." 
    });
  }
  return relatorio;
}

function analisarFuncaoH(cifra, tom, grau) {
  const g = String(grau || "");
  const NOMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

  // Dominante secundária: dizer PARA QUAL acorde ela prepara
  if (g.includes("/")) {
    const root = extrairFundamental(cifra);
    const rc = root ? Note.chroma(root) : null;
    const alvoGrau = g.split("/")[1] || "";
    if (rc != null) {
      const alvo = NOMES[(rc + 5) % 12] + (alvoGrau === alvoGrau.toLowerCase() ? "m" : "");
      return "Dominante secundária \u2014 prepara " + alvo;
    }
    return "Dominante secundária \u2014 puxa para fora do tom";
  }
  if (g.includes("\u00b0")) return "Diminuto de passagem \u2014 liga um acorde ao seguinte";

  const base = g.replace(/[0-9+]/g, "");     // "V7" -> "V", "bIII" -> "bIII"
  if (/^[b#]/.test(base)) return "Empr\u00e9stimo modal \u2014 acorde de fora do tom";

  const menor = tomEhMenor(tom);
  const n = base.toLowerCase();
  const ehMenorGrau = base === base.toLowerCase();

  if (n === "i")   return menor ? "T\u00f4nica \u2014 repouso menor" : "T\u00f4nica \u2014 repouso";
  if (n === "ii")  return ehMenorGrau ? "Supert\u00f4nica \u2014 prepara a dominante"
                                      : "Supert\u00f4nica maior \u2014 tens\u00e3o de empr\u00e9stimo";
  if (n === "iii") return "Mediante \u2014 ponte tonal";
  if (n === "iv")  return (!menor && ehMenorGrau) ? "Subdominante menor \u2014 empr\u00e9stimo dram\u00e1tico"
                                                  : "Subdominante \u2014 afastamento";
  if (n === "v")   return ehMenorGrau ? "Dominante menor \u2014 tens\u00e3o suave"
                                      : "Dominante \u2014 tens\u00e3o que pede resolu\u00e7\u00e3o";
  if (n === "vi")  return menor ? "Submediante \u2014 cor" : "Submediante \u2014 relativo menor";
  if (n === "vii") return menor ? "Subt\u00f4nica \u2014 cad\u00eancia modal" : "Sens\u00edvel \u2014 tens\u00e3o";
  return "Acorde de passagem \u2014 fora dos sete graus";
}

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
//    const rel = gerarRelatorioHarmonico(musicaAtual, tomFinal);
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
    const cifras = (s.acordes || []).filter(a => a.valido !== false).map(a => normalizarCifra(a.cifra || a));
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
        <span class="rh-pill rh-pill-on">Tom de ${tomEhMenor(tom) ? esc(extrairFundamental(tom) || tom) + " menor" : esc(tom) + " maior"}</span>
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


function renderizarTecladoVisor(idStr = "") {
  let idAttr = idStr ? `id="${idStr}"` : "";
  let html = `<div class="v-keyboard" ${idAttr}>`;
  let whiteIndex = 0;
  const isBlack = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);
  
  for (let midi = 60; midi <= 84; midi++) {
    if (!isBlack(midi)) {
      html += `<div class="v-key" data-midi="${midi}"></div>`;
      if (midi < 84 && isBlack(midi + 1)) {
        const percent = ((whiteIndex + 1) / 15) * 100;
        html += `<div class="v-key black" data-midi="${midi + 1}" style="left:${percent}%"></div>`;
      }
      whiteIndex++;
    }
  }
  html += `</div>`;
  return html;
}

/* Redesenha a tela Como Tocar com os dados atuais da musica */
function renderComoTocar() {
  const conteudo = el("conteudoComoTocar");
  if (!conteudo || !musicaAtual) return;
  const tomFinal = inferirTomDaMusica(musicaAtual);
  const rel = gerarRelatorioHarmonico(musicaAtual, tomFinal);
  conteudo.innerHTML = montarComoTocarHTML(musicaAtual, tomFinal, rel);
}
window.renderComoTocar = renderComoTocar;

function montarComoTocarHTML(musica, tom, rel) {
  if (!rel.fluxo || !rel.fluxo.length) {
    return `<div class="rh-vazio">Adicione acordes para ver dicas de execução.</div>`;
  }

  const fluxo = rel.fluxo;
  const acordesNoTom = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "i", "ii°", "III", "iv", "v", "VI", "VII"];

  let hasTension = false;
  let hasOutside = false;

  fluxo.forEach(f => {
    const grau = window.calcularGrau ? calcularGrau(f.cifra, tom) : "I";
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

  const levadaKey = levadaDaMusica(musica);
  const L = LEVADAS[levadaKey];
  const bpm = bpmDaMusica(musica);

  let fluxoMini = fluxo.slice(0, 8);
  let fluxoJSON = JSON.stringify(fluxoMini).replace(/"/g, '&quot;');

  const seletorLevada = `
    <section class="ct-card ct-card-ctl">
      <div class="ct-card-head">
        <h3 class="ct-card-tit"><span>\u{1F39A}\uFE0F</span>Levada <em>${esc(L.nome)}</em></h3>
        <div class="ct-bpm">
          <button class="ct-bpm-b" data-bpm="-4" aria-label="Diminuir andamento">\u2212</button>
          <b>${bpm}</b><span>BPM</span>
          <button class="ct-bpm-b" data-bpm="4" aria-label="Aumentar andamento">+</button>
        </div>
      </div>
      <div class="ct-levadas">
        ${Object.keys(LEVADAS).map(k =>
          `<button class="ct-lev${k === levadaKey ? " on" : ""}" data-levada="${k}">${esc(LEVADAS[k].nome)}</button>`
        ).join("")}
      </div>
      <p class="ct-txt">${esc(L.dica)}</p>
    </section>
  `;

  const compassoTxt = L.batidas === 3 ? "3/4" : "4/4";
  const textoCama = `<b>${esc(L.nome)} \u00b7 ${bpm} BPM \u00b7 ${compassoTxt}.</b> ${esc(L.dica)}<br><br>` + (hasTension
    ? `<b>Nesta m\u00fasica:</b> a progress\u00e3o tem bastante tens\u00e3o, ent\u00e3o pesa a m\u00e3o nos acordes de tens\u00e3o e alivia nos de repouso. O contraste \u00e9 que segura o ouvinte.`
    : `<b>Nesta m\u00fasica:</b> a harmonia \u00e9 est\u00e1vel, ent\u00e3o quem cria movimento \u00e9 a levada. Mant\u00e9m o desenho igual do come\u00e7o ao fim e deixa a voz variar por cima.`);

  let arpejoHTML = `
    <section class="ct-card">
      <div class="ct-card-head">
        <h3 class="ct-card-tit"><span>🎹</span>O Peso do Groove <em>Cama</em></h3>
        <button class="ct-play btn-play-exemplo" data-fluxo="${fluxoJSON}" data-modo="levada" data-levada="${levadaKey}" data-bpm="${bpm}" data-kbd="kbd-groove" aria-label="Ouvir a levada">Ouvir ${esc(L.nome)}</button>
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
        <button class="ct-play btn-play-exemplo" data-fluxo="${fluxoJSON}" data-modo="solo" data-levada="${levadaKey}" data-bpm="${bpm}" data-tom="${esc(tom)}" data-kbd="kbd-solo" aria-label="Ouvir Solo">Ouvir Lick</button>
      </div>

      <p class="ct-txt"><b class="ct-sub">A Escala Mágica</b>
        Na hora do solo no Keytar, as notas são tocadas soltas criando melodias (Licks). A base segura é a <b>${escalaPentatonica}</b>. O lick do botão acima não é genérico: ele anda em cima dos acordes desta música, um desenho por compasso, terminando cada compasso na nota que puxa para o acorde seguinte. Ouça e veja as teclas acenderem.
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
      ${seletorLevada}
      ${arpejoHTML}
      ${soloHTML}
    </div>
  `;
}

window.montarComoTocarHTML = montarComoTocarHTML;
window.renderizarTecladoVisor = renderizarTecladoVisor;
