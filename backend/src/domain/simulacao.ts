import { calcular } from "./ledger";
import { proporcaoValida } from "./validacao";
import type { DataISO, Lancamento, Proporcao } from "./tipos";

export interface PreviaProporcao {
  proporcaoAtual: Proporcao;
  proporcaoNova: Proporcao;
  /** Saldo do ciclo aberto hoje (convenção de `ledger.ts`). */
  saldoAntes: number;
  /** Saldo do ciclo aberto se a nova proporção fosse gravada agora. */
  saldoDepois: number;
}

/**
 * Mostra o saldo antes e depois de uma mudança de proporção, sem gravar nada.
 * O lançamento hipotético entra no fim do histórico (data de `hoje`, id que
 * ordena depois de qualquer outro) e o histórico recebido não é alterado.
 */
export function simularProporcao(
  existentes: readonly Lancamento[],
  nova: Proporcao,
  hoje: DataISO,
): PreviaProporcao {
  if (!proporcaoValida(nova)) {
    throw new RangeError("Proporção inválida: deve somar 100%.");
  }
  const antes = calcular(existentes);
  const hipotetico: Lancamento = {
    id: "￿",
    tipo: "proporcao",
    data: hoje,
    criadoEm: hoje,
    criadoPor: "ariel",
    proporcao: nova,
  };
  const depois = calcular([...existentes, hipotetico]);
  return {
    proporcaoAtual: antes.proporcaoVigente,
    proporcaoNova: nova,
    saldoAntes: antes.saldoAtual,
    saldoDepois: depois.saldoAtual,
  };
}
