import { randomBytes } from "node:crypto";

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TAMANHO_TEMPO = 10;
const TAMANHO_ALEATORIO = 16;

let ultimoTempo = -1;
let ultimoAleatorio = 0n;

function codificar(valor: bigint, tamanho: number): string {
  let resto = valor;
  let saida = "";
  for (let i = 0; i < tamanho; i++) {
    saida = ALFABETO[Number(resto % 32n)] + saida;
    resto /= 32n;
  }
  return saida;
}

/**
 * Id no estilo ULID: tempo em milissegundos seguido de parte aleatória, em
 * Base32. Ordena lexicograficamente pela criação; no mesmo milissegundo, dentro
 * do mesmo processo, a parte aleatória é incrementada para manter a ordem.
 */
export function gerarId(agora: number = Date.now()): string {
  if (agora === ultimoTempo) {
    ultimoAleatorio += 1n;
  } else {
    ultimoTempo = agora;
    ultimoAleatorio = BigInt("0x" + randomBytes(10).toString("hex"));
  }
  return codificar(BigInt(agora), TAMANHO_TEMPO) + codificar(ultimoAleatorio, TAMANHO_ALEATORIO);
}
