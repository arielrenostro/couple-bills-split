import type { ErroValidacao } from "../domain/validacao";
import type { DataISO, NovoLancamento, Pessoa, Proporcao } from "../domain/tipos";

export type EntradaLida =
  | { novo: NovoLancamento; erros?: undefined }
  | { novo?: undefined; erros: ErroValidacao[] };

function erro(codigo: ErroValidacao["codigo"], mensagem: string): EntradaLida {
  return { erros: [{ codigo, mensagem }] };
}

/** `{ ariel, isabella }` bruto; os valores são conferidos pela validação do domínio. */
export function lerProporcao(bruto: unknown): Proporcao | undefined {
  if (bruto === null || typeof bruto !== "object") return undefined;
  const { ariel, isabella } = bruto as Record<string, unknown>;
  return { ariel, isabella } as Proporcao;
}

/**
 * Converte o corpo do POST de lançamentos em um `NovoLancamento`. Autor vem do
 * token; data e `pagoPor` assumem hoje e o próprio autor quando omitidos. Os
 * valores em si (positivo, inteiro, data real...) são validados no domínio.
 */
export function lerNovoLancamento(
  corpo: Record<string, unknown> | undefined,
  criadoPor: Pessoa,
  hoje: DataISO,
): EntradaLida {
  if (!corpo) return erro("CORPO_INVALIDO", "Envie um corpo JSON.");

  const data = (corpo.data ?? hoje) as DataISO;
  const pagoPor = (corpo.pagoPor ?? criadoPor) as Pessoa;

  switch (corpo.tipo) {
    case "despesa": {
      const proporcao = corpo.proporcao == null ? null : lerProporcao(corpo.proporcao);
      if (proporcao === undefined) {
        return erro("PROPORCAO_INVALIDA", "A proporção deve ser {ariel, isabella}.");
      }
      return {
        novo: {
          tipo: "despesa",
          data,
          criadoPor,
          descricao: corpo.descricao as string,
          valor: corpo.valor as number,
          pagoPor,
          proporcao,
        },
      };
    }
    case "acerto":
      return {
        novo: { tipo: "acerto", data, criadoPor, valor: corpo.valor as number, pagoPor },
      };
    case "proporcao": {
      const proporcao = lerProporcao(corpo.proporcao);
      if (proporcao === undefined) {
        return erro("PROPORCAO_INVALIDA", "A proporção deve ser {ariel, isabella}.");
      }
      return { novo: { tipo: "proporcao", data, criadoPor, proporcao } };
    }
    default:
      return erro("TIPO_INVALIDO", "O tipo deve ser despesa, acerto ou proporcao.");
  }
}
