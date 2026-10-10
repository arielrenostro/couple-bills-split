import type { Pessoa, Proporcao, SaldoDescrito } from "./tipos";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 12345 -> "R$ 123,45". */
export function formatarMoeda(centavos: number): string {
  return moeda.format(centavos / 100);
}

/** 12345 -> "123,45" (para preencher campos de valor). */
export function formatarValorCampo(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Lê o que a pessoa digitou como valor e devolve centavos, ou `null` se não
 * for um valor positivo. Aceita "12", "12,5", "12.50", "1.234,56" e "R$ 12,50".
 */
export function lerValor(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (limpo === "" || !/^[\d.,]+$/.test(limpo)) return null;

  const ultimaVirgula = limpo.lastIndexOf(",");
  const ultimoPonto = limpo.lastIndexOf(".");
  const separador = Math.max(ultimaVirgula, ultimoPonto);

  let inteira = limpo;
  let fracao = "";
  if (separador >= 0) {
    const depois = limpo.slice(separador + 1);
    // "1.234" é milhar; "12.5" e "12,50" são decimais.
    const ehMilhar = depois.length === 3 && ultimaVirgula < 0 && ultimoPonto >= 0;
    if (!ehMilhar) {
      inteira = limpo.slice(0, separador);
      fracao = depois;
    }
  }
  inteira = inteira.replace(/[.,]/g, "");
  if (fracao.length > 2 || !/^\d*$/.test(fracao) || !/^\d+$/.test(inteira || "0")) return null;

  const centavos = Number(inteira || "0") * 100 + Number((fracao + "00").slice(0, 2));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

export function nomePessoa(pessoa: Pessoa): string {
  return pessoa === "ariel" ? "Ariel" : "Isabella";
}

export function outra(pessoa: Pessoa): Pessoa {
  return pessoa === "ariel" ? "isabella" : "ariel";
}

/** "2026-10-09" -> "09/10/2026". */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Data de hoje (AAAA-MM-DD) no calendário do aparelho. */
export function hoje(agora: Date = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

/** { 60, 40 } -> "60/40". */
export function textoProporcao(p: Proporcao): string {
  return `${p.ariel}/${p.isabella}`;
}

/** 60 -> "60%". */
export function formatarPorcentagem(pct: number): string {
  return `${pct}%`;
}

/** Décimos de ponto percentual -> "60%" (inteiro) ou "58,3%" (uma casa decimal, vírgula). */
export function formatarPorcentagemDecimal(decimos: number): string {
  return decimos % 10 === 0 ? `${decimos / 10}%` : `${(decimos / 10).toFixed(1).replace(".", ",")}%`;
}

/** "Isabella deve R$ 50,00 ao Ariel" ou "Ninguém deve nada". */
export function fraseSaldo(saldo: SaldoDescrito | null): string {
  if (!saldo) return "Ninguém deve nada";
  const credor = nomePessoa(saldo.credor);
  const preposicao = saldo.credor === "ariel" ? "ao" : "à";
  return `${nomePessoa(saldo.devedor)} deve ${formatarMoeda(saldo.valor)} ${preposicao} ${credor}`;
}

/** Mesma frase a partir do saldo assinado (positivo: Isabella deve ao Ariel). */
export function fraseSaldoAssinado(saldoAssinado: number): string {
  if (saldoAssinado === 0) return fraseSaldo(null);
  return fraseSaldo(
    saldoAssinado > 0
      ? { devedor: "isabella", credor: "ariel", valor: saldoAssinado }
      : { devedor: "ariel", credor: "isabella", valor: -saldoAssinado },
  );
}
