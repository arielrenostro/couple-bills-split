import { autenticar } from "../auth/autenticacao";
import { emitirToken } from "../auth/jwt";
import { autenticarRequisicao } from "../auth/sessao";
import { gerarId } from "../dados/id";
import type { Repositorio } from "../dados/repositorio";
import { calcular } from "../domain/ledger";
import { simularProporcao } from "../domain/simulacao";
import type { DataISO, Lancamento } from "../domain/tipos";
import { proporcaoValida, validarNovoLancamento, validarRemocao } from "../domain/validacao";
import { montarHistorico, montarSaldo } from "./apresentacao";
import { lerNovoLancamento, lerProporcao } from "./entrada";
import { erroHttp, json, lerCorpoJson, type EventoHttp, type RespostaHttp } from "./http";

export interface Dependencias {
  repo: Repositorio;
  obterSegredo: () => Promise<string>;
  agora: () => Date;
}

const FUSO = "America/Sao_Paulo";

/** Data de hoje (AAAA-MM-DD) no fuso do casal. */
export function hojeNoFuso(agora: Date): DataISO {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

function semBarraFinal(caminho: string): string {
  return caminho.length > 1 && caminho.endsWith("/") ? caminho.slice(0, -1) : caminho;
}

export function criarManipulador(dep: Dependencias) {
  async function login(evento: EventoHttp): Promise<RespostaHttp> {
    const corpo = lerCorpoJson(evento);
    const usuario = await autenticar(dep.repo, corpo?.usuario, corpo?.senha);
    if (!usuario) {
      return erroHttp(401, "CREDENCIAIS_INVALIDAS", "Usuário ou senha incorretos.");
    }
    const token = emitirToken(usuario, await dep.obterSegredo(), dep.agora());
    return json(200, { token, usuario });
  }

  async function lerLedger(): Promise<Lancamento[]> {
    return dep.repo.listarLancamentos();
  }

  async function rotear(evento: EventoHttp): Promise<RespostaHttp> {
    const metodo = evento.requestContext.http.method.toUpperCase();
    const caminho = semBarraFinal(evento.rawPath);

    if (metodo === "POST" && caminho === "/api/login") return login(evento);

    const usuario = await autenticarRequisicao(
      evento.headers?.authorization,
      dep.obterSegredo,
      dep.agora(),
    );
    if (!usuario) return erroHttp(401, "NAO_AUTENTICADO", "Faça login para continuar.");

    const agora = dep.agora();
    const hoje = hojeNoFuso(agora);

    if (metodo === "GET" && caminho === "/api/saldo") {
      return json(200, montarSaldo(calcular(await lerLedger())));
    }

    if (metodo === "GET" && caminho === "/api/historico") {
      return json(200, { itens: montarHistorico(calcular(await lerLedger())) });
    }

    if (metodo === "POST" && caminho === "/api/lancamentos") {
      const lido = lerNovoLancamento(lerCorpoJson(evento), usuario, hoje);
      if (lido.erros) return json(400, { erros: lido.erros });

      const existentes = await lerLedger();
      const erros = validarNovoLancamento(existentes, lido.novo, hoje);
      if (erros.length > 0) return json(400, { erros });

      const lancamento = {
        ...lido.novo,
        id: gerarId(agora.getTime()),
        criadoEm: agora.toISOString(),
      } as Lancamento;
      await dep.repo.gravarLancamento(lancamento);
      return json(201, {
        id: lancamento.id,
        saldo: montarSaldo(calcular([...existentes, lancamento])),
      });
    }

    const remocao = /^\/api\/lancamentos\/([^/]+)$/.exec(caminho);
    if (metodo === "DELETE" && remocao) {
      const id = decodeURIComponent(remocao[1] as string);
      const existentes = await lerLedger();
      const erro = validarRemocao(existentes, id);
      if (erro) {
        return erroHttp(erro.codigo === "LANCAMENTO_INEXISTENTE" ? 404 : 409, erro.codigo, erro.mensagem);
      }
      const alvo = existentes.find((l) => l.id === id) as Lancamento;
      await dep.repo.removerLancamento(alvo);
      const restantes = existentes.filter((l) => l.id !== id);
      return json(200, { saldo: montarSaldo(calcular(restantes)) });
    }

    if (metodo === "POST" && caminho === "/api/proporcao/preview") {
      const proporcao = lerProporcao(lerCorpoJson(evento)?.proporcao);
      if (!proporcao || !proporcaoValida(proporcao)) {
        return erroHttp(400, "PROPORCAO_INVALIDA", "A proporção deve somar 100%.");
      }
      return json(200, simularProporcao(await lerLedger(), proporcao, hoje));
    }

    return erroHttp(404, "ROTA_INEXISTENTE", "Rota não encontrada.");
  }

  return async function manipular(evento: EventoHttp): Promise<RespostaHttp> {
    try {
      return await rotear(evento);
    } catch (e) {
      console.error("erro não tratado", e);
      return erroHttp(500, "ERRO_INTERNO", "Algo deu errado. Tente de novo.");
    }
  };
}
