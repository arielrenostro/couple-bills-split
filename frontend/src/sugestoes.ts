import type { ItemHistorico, Pessoa } from "./tipos";

/** Quantas sugestões a lista mostra, no máximo. */
export const MAXIMO_SUGESTOES = 5;
/** Ciclos fechados mais recentes que entram na conta, além do aberto. */
const CICLOS_FECHADOS = 3;

/**
 * Proporção da sugestão: `{ customizada: false }` segue a vigente de hoje, e
 * `{ customizada: true, ariel }` guarda a divisão do último lançamento (o
 * percentual da Isabella é o resto até 100).
 */
export type DecisaoDeProporcao = { customizada: false } | { customizada: true; ariel: number };

export interface Sugestao {
  descricao: string;
  /** Centavos. */
  valor: number;
  proporcao: DecisaoDeProporcao;
}

/** "Plano de saúde " e "plano de saude" -> "plano de saude". */
export function normalizarDescricao(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

interface Despesa extends ItemHistorico {
  descricao: string;
  valor: number;
}

function ehDespesa(item: ItemHistorico): item is Despesa {
  return item.tipo === "despesa" && item.descricao !== null && item.valor !== null;
}

/** Ordem do ledger: por data e, em empate, por id (que é ordenável no tempo). */
function porDataEId(a: ItemHistorico, b: ItemHistorico): number {
  return a.data < b.data ? -1 : a.data > b.data ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Índice do ciclo aberto. Logo após um fechamento o aberto está vazio e não
 * aparece em nenhum item: então é o seguinte ao último ciclo, que está fechado.
 */
function indiceDoCicloAberto(historico: ItemHistorico[]): number {
  let ultimo: ItemHistorico | undefined;
  for (const item of historico) if (!ultimo || item.ciclo > ultimo.ciclo) ultimo = item;
  if (!ultimo) return 0;
  return ultimo.cicloFechado ? ultimo.ciclo + 1 : ultimo.ciclo;
}

/**
 * Contas recorrentes de `pagador`: despesas pagas por ele (`pagoPor`, e não
 * quem as lançou) no ciclo aberto e nos 3 ciclos fechados mais recentes, uma
 * sugestão por descrição normalizada, com os valores do último lançamento. Ordena por ciclos
 * distintos, depois por lançamentos, depois pelo lançamento mais recente.
 */
export function calcularSugestoes(historico: ItemHistorico[], pagador: Pessoa): Sugestao[] {
  const corte = indiceDoCicloAberto(historico) - CICLOS_FECHADOS;

  const grupos = new Map<string, Despesa[]>();
  for (const item of historico) {
    if (!ehDespesa(item) || item.pagoPor !== pagador || item.ciclo < corte) continue;
    const chave = normalizarDescricao(item.descricao);
    if (chave === "") continue;
    grupos.set(chave, [...(grupos.get(chave) ?? []), item]);
  }

  const contas = [...grupos.values()].map((lancamentos) => {
    const ordenados = [...lancamentos].sort(porDataEId);
    return {
      ultimo: ordenados[ordenados.length - 1]!,
      ciclos: new Set(lancamentos.map((l) => l.ciclo)).size,
      lancamentos: lancamentos.length,
    };
  });

  contas.sort(
    (a, b) => b.ciclos - a.ciclos || b.lancamentos - a.lancamentos || -porDataEId(a.ultimo, b.ultimo),
  );

  return contas.slice(0, MAXIMO_SUGESTOES).map(({ ultimo }) => ({
    descricao: ultimo.descricao,
    valor: ultimo.valor,
    proporcao:
      ultimo.proporcaoCustomizada && ultimo.proporcao
        ? { customizada: true, ariel: ultimo.proporcao.ariel }
        : { customizada: false },
  }));
}
