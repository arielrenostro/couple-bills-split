import { calcular } from "./ledger";
import {
  PESSOAS,
  type DataISO,
  type Lancamento,
  type NovoLancamento,
  type Pessoa,
  type Proporcao,
} from "./tipos";

export type CodigoErro =
  | "CORPO_INVALIDO"
  | "TIPO_INVALIDO"
  | "VALOR_INVALIDO"
  | "DESCRICAO_OBRIGATORIA"
  | "PESSOA_INVALIDA"
  | "PROPORCAO_INVALIDA"
  | "DATA_INVALIDA"
  | "DATA_FUTURA"
  | "DATA_ANTES_DO_FECHAMENTO"
  | "LANCAMENTO_INEXISTENTE"
  | "CICLO_FECHADO"
  | "ACERTO_DE_FECHAMENTO";

export interface ErroValidacao {
  codigo: CodigoErro;
  mensagem: string;
}

function erro(codigo: CodigoErro, mensagem: string): ErroValidacao {
  return { codigo, mensagem };
}

function pessoaValida(valor: unknown): valor is Pessoa {
  return PESSOAS.includes(valor as Pessoa);
}

/** Proporção válida: dois percentuais inteiros entre 0 e 100 que somam 100. */
export function proporcaoValida(p: Proporcao): boolean {
  const pct = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 100;
  return pct(p.ariel) && pct(p.isabella) && p.ariel + p.isabella === 100;
}

/** Data de calendário real no formato AAAA-MM-DD. */
export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split("-").map(Number) as [number, number, number];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/**
 * Valida um lançamento novo contra o histórico existente. Devolve a lista de
 * erros; lista vazia significa que o lançamento pode ser gravado.
 *
 * `hoje` (AAAA-MM-DD) vem de quem chama, já no fuso do casal.
 */
export function validarNovoLancamento(
  existentes: readonly Lancamento[],
  novo: NovoLancamento,
  hoje: DataISO,
): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  if (!pessoaValida(novo.criadoPor)) {
    erros.push(erro("PESSOA_INVALIDA", "Usuário inválido."));
  }

  if (novo.tipo === "despesa" || novo.tipo === "acerto") {
    if (!Number.isInteger(novo.valor) || novo.valor <= 0) {
      erros.push(erro("VALOR_INVALIDO", "O valor deve ser maior que zero."));
    }
    if (!pessoaValida(novo.pagoPor)) {
      erros.push(erro("PESSOA_INVALIDA", "Quem pagou é inválido."));
    }
  }

  if (novo.tipo === "despesa") {
    if (typeof novo.descricao !== "string" || novo.descricao.trim() === "") {
      erros.push(erro("DESCRICAO_OBRIGATORIA", "Informe a descrição da conta."));
    }
    if (novo.proporcao !== null && !proporcaoValida(novo.proporcao)) {
      erros.push(erro("PROPORCAO_INVALIDA", "A proporção deve somar 100%."));
    }
  }

  if (novo.tipo === "proporcao" && !proporcaoValida(novo.proporcao)) {
    erros.push(erro("PROPORCAO_INVALIDA", "A proporção deve somar 100%."));
  }

  if (!dataValida(novo.data)) {
    erros.push(erro("DATA_INVALIDA", "Data inválida."));
  } else if (novo.data > hoje) {
    erros.push(erro("DATA_FUTURA", "A data não pode ser posterior a hoje."));
  } else {
    const fechamento = calcular(existentes).dataUltimoFechamento;
    if (fechamento !== null && novo.data < fechamento) {
      erros.push(
        erro(
          "DATA_ANTES_DO_FECHAMENTO",
          `A data não pode ser anterior ao último acerto que fechou o ciclo (${fechamento}).`,
        ),
      );
    }
  }

  return erros;
}

/**
 * Valida a remoção de um lançamento: só vale no ciclo aberto, e nunca para o
 * acerto que fechou um ciclo. Devolve `null` quando a remoção é permitida.
 */
export function validarRemocao(
  existentes: readonly Lancamento[],
  id: string,
): ErroValidacao | null {
  const item = calcular(existentes).itens.find((i) => i.lancamento.id === id);
  if (!item) return erro("LANCAMENTO_INEXISTENTE", "Lançamento não encontrado.");
  if (item.fechaCiclo) {
    return erro(
      "ACERTO_DE_FECHAMENTO",
      "Este acerto fechou um ciclo e não pode ser removido.",
    );
  }
  if (item.cicloFechado) {
    return erro("CICLO_FECHADO", "Lançamentos de ciclos fechados não podem ser removidos.");
  }
  return null;
}
