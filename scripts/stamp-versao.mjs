#!/usr/bin/env node
/* ============================================================================
   stamp-versao.mjs — carimba a versão de cache em public/index.html e public/sw.js

   Existe por um motivo específico: o firebase.json serve js/css com
   Cache-Control immutable de 1 ano. A ÚNICA coisa que faz o navegador buscar
   o arquivo novo é a query string ?v=N do index.html (e o VERSAO do sw.js).
   Esquecer de subir esse número já causou o bug mais grave do projeto:
   o CSS ficou preso em v=11 enquanto o app.js estava em v=57, e nenhum
   celular chegou a baixar o CSS novo.

   Este script tira isso da mão de quem publica. No CI ele roda com o número
   da execução do GitHub Actions, então cada deploy sai com versão nova
   automaticamente — é impossível esquecer.

   Uso:
     node scripts/stamp-versao.mjs 61        (versão explícita)
     node scripts/stamp-versao.mjs           (usa o timestamp como versão)
   ========================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = resolve(raiz, "public/index.html");
const SW = resolve(raiz, "public/sw.js");

// Versão: argumento > número da execução do Actions > timestamp
const versao = String(
  process.argv[2] || process.env.GITHUB_RUN_NUMBER || Date.now()
).trim();

if (!/^[0-9A-Za-z._-]+$/.test(versao)) {
  console.error(`Versão inválida: "${versao}"`);
  process.exit(1);
}

let erros = 0;

/* ---- index.html: styles.css?v=N, data.js?v=N, app.js?v=N ---- */
let html = readFileSync(INDEX, "utf8");
const ASSETS = ["styles.css", "data.js", "app.js"];
for (const asset of ASSETS) {
  const re = new RegExp(`(${asset.replace(/\./g, "\\.")})\\?v=[^"']+`, "g");

  // Testar o MATCH no texto original. Não comparar antes/depois: se a versão
  // nova for igual à que já está no arquivo, o replace devolve uma string
  // idêntica e a comparação acusaria "não achei" sem haver erro nenhum.
  if (!re.test(html)) {
    console.error(`  ERRO: não achei ${asset}?v=… no index.html`);
    erros++;
    continue;
  }

  re.lastIndex = 0; // regex com flag /g guarda posição entre chamadas
  html = html.replace(re, `$1?v=${versao}`);
}
writeFileSync(INDEX, html);

/* ---- sw.js: const VERSAO = "notas-vN" ---- */
let sw = readFileSync(SW, "utf8");
const reSw = /(const\s+VERSAO\s*=\s*")[^"]*(")/;
if (!reSw.test(sw)) {
  console.error("  ERRO: não achei const VERSAO = \"…\" no sw.js");
  erros++;
} else {
  sw = sw.replace(reSw, `$1notas-v${versao}$2`);
  writeFileSync(SW, sw);
}

/* ---- conferência final: os três assets têm que estar na MESMA versão ----
   Só js/css entram na regra immutable do firebase.json. O manifest.json e os
   ícones usam ?v= próprio e são servidos com no-cache, então ficam de fora. */
const conferido = readFileSync(INDEX, "utf8");
const encontradas = ASSETS.map((asset) => {
  const m = conferido.match(new RegExp(`${asset.replace(".", "\\.")}\\?v=([^"']+)`));
  return m ? m[1] : null;
});
const unicas = [...new Set(encontradas)];

if (unicas.length !== 1 || unicas[0] !== versao) {
  console.error(
    `  ERRO: versões desalinhadas -> ${ASSETS.map((a, i) => `${a}=${encontradas[i]}`).join(", ")}`
  );
  erros++;
}

if (erros) {
  console.error(`\nFALHOU com ${erros} erro(s). Deploy abortado de propósito.`);
  process.exit(1);
}

console.log(`Versão carimbada: v${versao}`);
console.log(`  index.html -> ${ASSETS.map((a) => `${a}?v=${versao}`).join(", ")}`);
console.log(`  sw.js      -> notas-v${versao}`);
