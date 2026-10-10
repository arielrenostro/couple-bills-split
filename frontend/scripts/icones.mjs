// Gera os ícones do PWA em public/ (PNG, sem dependências):
//   node scripts/icones.mjs
// Um casal (duas figuras) com uma moeda de dinheiro na frente, sobre fundo verde.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const saida = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
mkdirSync(saida, { recursive: true });

const FUNDO = [15, 118, 110];
const PESSOA_A = [255, 255, 255];
const PESSOA_B = [153, 246, 228];
const MOEDA = [251, 191, 36];
const MOEDA_BORDA = [180, 83, 9];
const CIETE = [120, 53, 15]; // cifrão

// ---- PNG -------------------------------------------------------------------
const tabelaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = tabelaCrc[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const t = Buffer.from(tipo, "ascii");
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([tam, t, dados, crc]);
}
function png(largura, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(largura, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  const linhas = Buffer.alloc(largura * (largura * 4 + 1));
  for (let y = 0; y < largura; y++) {
    linhas[y * (largura * 4 + 1)] = 0; // filtro "nenhum"
    pixels.copy(linhas, y * (largura * 4 + 1) + 1, y * largura * 4, (y + 1) * largura * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(linhas, { level: 9 })),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Desenho (coordenadas de 0 a 1, y para baixo) --------------------------
const dentroCirculo = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/** Cabeça redonda e ombros (meia elipse com a base reta). */
function pessoa(x, y, cx) {
  if (dentroCirculo(x, y, cx, 0.3, 0.1)) return true;
  const cyCorpo = 0.63;
  if (y > cyCorpo) return false;
  return ((x - cx) / 0.165) ** 2 + ((y - cyCorpo) / 0.18) ** 2 <= 1;
}

/** Parte superior do "S": arco do alto-direita até o centro, passando pela esquerda. */
function arcoDoS(dx, dy) {
  const x = dx;
  const y = dy + 0.33; // centro do arco em (0, -0.33)
  const d = Math.hypot(x, y);
  if (d < 0.26 || d > 0.4) return false;
  const graus = (Math.atan2(y, x) * 180) / Math.PI;
  return graus >= 90 || graus <= -40;
}

/** Cifrão em coordenadas relativas ao centro da moeda, em unidades do raio. */
function cifrao(dx, dy) {
  if (Math.abs(dx) < 0.07 && Math.abs(dy) < 0.82) return true; // haste vertical
  return arcoDoS(dx, dy) || arcoDoS(-dx, -dy); // o arco de baixo é o de cima girado 180°
}

function corEm(x, y) {
  // Moeda, por cima de tudo.
  const mx = 0.5, my = 0.71, R = 0.18;
  if (dentroCirculo(x, y, mx, my, R)) {
    if (!dentroCirculo(x, y, mx, my, R * 0.86)) return MOEDA_BORDA;
    return cifrao((x - mx) / R, (y - my) / R) ? CIETE : MOEDA;
  }
  if (pessoa(x, y, 0.31)) return PESSOA_A;
  if (pessoa(x, y, 0.69)) return PESSOA_B;
  return FUNDO;
}

/** `escala` < 1 encolhe o desenho (zona segura do ícone maskable). */
function desenhar(tamanho, { cantos, escala }) {
  const pixels = Buffer.alloc(tamanho * tamanho * 4);
  const amostras = 4;
  const raioCanto = cantos ? tamanho * 0.22 : 0;

  const dentroDoQuadrado = (x, y) => {
    if (!cantos) return true;
    const qx = Math.max(raioCanto - x, 0, x - (tamanho - raioCanto));
    const qy = Math.max(raioCanto - y, 0, y - (tamanho - raioCanto));
    return qx * qx + qy * qy <= raioCanto * raioCanto;
  };

  for (let py = 0; py < tamanho; py++) {
    for (let px = 0; px < tamanho; px++) {
      let r = 0, g = 0, b = 0, cobertas = 0;
      for (let sy = 0; sy < amostras; sy++) {
        for (let sx = 0; sx < amostras; sx++) {
          const x = px + (sx + 0.5) / amostras;
          const y = py + (sy + 0.5) / amostras;
          if (!dentroDoQuadrado(x, y)) continue;
          const u = 0.5 + (x / tamanho - 0.5) / escala;
          const v = 0.5 + (y / tamanho - 0.5) / escala;
          const cor = corEm(u, v);
          r += cor[0]; g += cor[1]; b += cor[2]; cobertas += 1;
        }
      }
      const i = (py * tamanho + px) * 4;
      if (cobertas > 0) {
        pixels[i] = Math.round(r / cobertas);
        pixels[i + 1] = Math.round(g / cobertas);
        pixels[i + 2] = Math.round(b / cobertas);
      }
      pixels[i + 3] = Math.round((cobertas / (amostras * amostras)) * 255);
    }
  }
  return pixels;
}

const icones = [
  ["icone-180.png", 180, { cantos: false, escala: 1 }], // iOS arredonda sozinho
  ["icone-192.png", 192, { cantos: true, escala: 1 }],
  ["icone-512.png", 512, { cantos: true, escala: 1 }],
  ["icone-512-maskable.png", 512, { cantos: false, escala: 0.8 }],
];
for (const [nome, tamanho, opcoes] of icones) {
  writeFileSync(resolve(saida, nome), png(tamanho, desenhar(tamanho, opcoes)));
  console.log("gerado", nome);
}
