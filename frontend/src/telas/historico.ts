import { obterHistorico, remover } from "../api";
import { formatarData, formatarMoeda, fraseSaldoAssinado, nomePessoa, textoProporcao } from "../formato";
import { caixaDeErro, carregando, confirmar, mensagemDeErro, topo, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import type { ItemHistorico } from "../tipos";

function linha(rotulo: string, valor: string | HTMLElement): HTMLElement {
  return h("div", { class: "linha" }, h("dt", null, rotulo), h("dd", null, valor));
}

function titulo(i: ItemHistorico, inicial: boolean): string {
  if (i.tipo === "despesa") return i.descricao ?? "Conta";
  if (i.tipo === "acerto") return "Acerto";
  return inicial ? "Proporção inicial" : "Proporção alterada";
}

function descricaoParaConfirmar(i: ItemHistorico): string {
  if (i.tipo === "despesa") return `a conta "${i.descricao}" de ${formatarMoeda(i.valor ?? 0)}`;
  if (i.tipo === "acerto") return `o acerto de ${formatarMoeda(i.valor ?? 0)}`;
  return `a mudança de proporção para ${i.proporcao ? textoProporcao(i.proporcao) : ""}`;
}

function detalhes(i: ItemHistorico, inicial: boolean): HTMLElement[] {
  if (i.tipo === "despesa") {
    return [
      linha("Quem pagou", nomePessoa(i.pagoPor!)),
      linha("Valor total", formatarMoeda(i.valor!)),
      linha(
        "Proporção",
        h(
          "span",
          null,
          i.proporcao ? textoProporcao(i.proporcao) : "",
          i.proporcaoCustomizada ? h("span", { class: "etiqueta" }, "customizada") : null,
        ),
      ),
      linha("Parte do Ariel", formatarMoeda(i.partes?.ariel ?? 0)),
      linha("Parte da Isabella", formatarMoeda(i.partes?.isabella ?? 0)),
      linha("Saldo acumulado", fraseSaldoAssinado(i.saldoAcumulado)),
    ];
  }
  if (i.tipo === "acerto") {
    return [
      linha("Quem pagou", `${nomePessoa(i.pagoPor!)} pagou ao outro`),
      linha("Valor total", formatarMoeda(i.valor!)),
      linha("Saldo acumulado", fraseSaldoAssinado(i.saldoAcumulado)),
    ];
  }
  if (inicial) return [linha("Proporção", i.proporcao ? textoProporcao(i.proporcao) : "")];
  return [
    linha(
      "Proporção",
      `${i.proporcaoAnterior ? textoProporcao(i.proporcaoAnterior) : "—"} → ${i.proporcao ? textoProporcao(i.proporcao) : ""}`,
    ),
    linha("Saldo antes", fraseSaldoAssinado(i.saldoAntes ?? 0)),
    linha("Saldo depois", fraseSaldoAssinado(i.saldoDepois ?? 0)),
  ];
}

/** `inicial`: o lançamento de proporção que a inicialização criou (o mais antigo). */
function cartao(i: ItemHistorico, inicial: boolean, aoRemover: (i: ItemHistorico) => void): HTMLElement {
  return h(
    "article",
    { class: `cartao ${i.tipo}${i.cicloFechado ? " fechado" : ""}`, dataset: { id: i.id, tipo: i.tipo } },
    h(
      "header",
      null,
      h("h2", null, titulo(i, inicial)),
      h("time", { dateTime: i.data }, formatarData(i.data)),
    ),
    i.fechaCiclo ? h("p", { class: "etiqueta fecha" }, "Fechou o ciclo") : null,
    h("dl", null, ...detalhes(i, inicial)),
    i.removivel && !inicial
      ? h("button", { class: "botao perigo-suave", type: "button", onclick: () => aoRemover(i) }, "Remover")
      : null,
  );
}

export function telaHistorico(ctx: Contexto): HTMLElement {
  const raiz = h("main", { class: "tela" }, topo("Histórico", () => ctx.navegar("/")));
  const corpo = h("div", null, carregando());
  raiz.append(corpo);

  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      const itens = await obterHistorico();
      const lista = h("div", { class: "lista" });
      let separou = false;
      for (const [posicao, item] of itens.entries()) {
        if (item.cicloFechado && !separou) {
          separou = true;
          lista.append(h("p", { class: "separador" }, "Ciclos fechados"));
        }
        lista.append(cartao(item, item.tipo === "proporcao" && posicao === itens.length - 1, aoRemover));
      }
      corpo.replaceChildren(itens.length > 0 ? lista : h("p", { class: "vazio" }, "Nenhum lançamento ainda."));
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };

  const aoRemover = async (item: ItemHistorico) => {
    const ok = await confirmar({
      titulo: "Remover lançamento?",
      mensagem: `Vai apagar ${descricaoParaConfirmar(item)} de vez e recalcular o saldo.`,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    try {
      await remover(item.id);
      ctx.avisar("Lançamento removido.");
    } catch (e) {
      ctx.avisar(mensagemDeErro(e));
    }
    await carregar();
  };

  void carregar();
  return raiz;
}
