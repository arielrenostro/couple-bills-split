import { descreverSaldo, type Historico, type ItemHistorico } from "../domain/ledger";
import type { Proporcao } from "../domain/tipos";

export interface SaldoDto {
  /** `null` quando ninguém deve nada. */
  saldo: { devedor: string; credor: string; valor: number } | null;
  /** Positivo: Isabella deve ao Ariel. Negativo: Ariel deve à Isabella. */
  saldoAssinado: number;
  proporcao: Proporcao;
  cicloAberto: Historico["cicloAberto"];
  dataUltimoFechamento: string | null;
}

export function montarSaldo(historico: Historico): SaldoDto {
  return {
    saldo: descreverSaldo(historico.saldoAtual),
    saldoAssinado: historico.saldoAtual,
    proporcao: historico.proporcaoVigente,
    cicloAberto: historico.cicloAberto,
    dataUltimoFechamento: historico.dataUltimoFechamento,
  };
}

export interface ItemHistoricoDto {
  id: string;
  tipo: "despesa" | "acerto" | "proporcao";
  data: string;
  criadoPor: string;
  descricao: string | null;
  pagoPor: string | null;
  valor: number | null;
  proporcao: Proporcao | null;
  proporcaoCustomizada: boolean;
  proporcaoAnterior: Proporcao | null;
  partes: { ariel: number; isabella: number } | null;
  saldoAcumulado: number;
  saldoAntes: number | null;
  saldoDepois: number | null;
  ciclo: number;
  cicloFechado: boolean;
  fechaCiclo: boolean;
  /** Pode ser removido: está no ciclo aberto. */
  removivel: boolean;
}

function paraDto(item: ItemHistorico): ItemHistoricoDto {
  const l = item.lancamento;
  return {
    id: l.id,
    tipo: l.tipo,
    data: l.data,
    criadoPor: l.criadoPor,
    descricao: l.tipo === "despesa" ? l.descricao : null,
    pagoPor: l.tipo === "proporcao" ? null : l.pagoPor,
    valor: l.tipo === "proporcao" ? null : l.valor,
    proporcao: item.proporcao,
    proporcaoCustomizada: l.tipo === "despesa" && l.proporcao !== null,
    proporcaoAnterior: item.proporcaoAnterior,
    partes: item.partes,
    saldoAcumulado: item.saldoAcumulado,
    saldoAntes: item.saldoAntes,
    saldoDepois: item.saldoDepois,
    ciclo: item.ciclo,
    cicloFechado: item.cicloFechado,
    fechaCiclo: item.fechaCiclo,
    removivel: !item.cicloFechado,
  };
}

/** Itens do mais recente para o mais antigo, como a tela de histórico os mostra. */
export function montarHistorico(historico: Historico): ItemHistoricoDto[] {
  return [...historico.itens].reverse().map(paraDto);
}
