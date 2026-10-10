import { obterSaldo } from "../api";
import { formatarMoeda, formatarPorcentagem, formatarPorcentagemDecimal, nomePessoa } from "../formato";
import { proporcaoEfetiva } from "../proporcaoEfetiva";
import { lembrarProporcao } from "../proporcaoVigente";
import { caixaDeErro, carregando, linhaDaTabela, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import { menuConfiguracoes } from "../ui/menu";
import type { Saldo } from "../tipos";

function conteudo(s: Saldo, ctx: Contexto): HTMLElement {
  const c = s.cicloAberto;
  const devedor = s.saldo ? nomePessoa(s.saldo.devedor) : null;
  const efetiva = proporcaoEfetiva(c.parte, c.totalDespesas);

  return h(
    "div",
    { class: "saldo" },
    h(
      "section",
      { class: "painel painel-ciclo" },
      h("h2", null, "Ciclo atual"),
      h(
        "div",
        { class: "metricas" },
        h(
          "div",
          { class: "metrica" },
          h("p", { class: "rotulo" }, "Total das contas"),
          h("p", { class: "total-valor" }, formatarMoeda(c.totalDespesas)),
        ),
        h(
          "div",
          { class: s.saldo ? "metrica divida" : "metrica divida quitada", dataset: { devedor: devedor ?? "" } },
          h("p", { class: "rotulo" }, s.saldo ? `${devedor} deve` : "Quites"),
          h("p", { class: "divida-valor" }, formatarMoeda(s.saldo?.valor ?? 0)),
        ),
      ),
      h(
        "table",
        { class: "tabela-ciclo" },
        h(
          "thead",
          null,
          h("tr", null, h("td"), h("th", { scope: "col" }, "Ariel"), h("th", { scope: "col" }, "Isabella")),
        ),
        h(
          "tbody",
          null,
          linhaDaTabela(
            "Proporção",
            formatarPorcentagem(s.proporcao.ariel),
            formatarPorcentagem(s.proporcao.isabella),
            "suave",
          ),
          linhaDaTabela(
            "Efetiva",
            efetiva ? formatarPorcentagemDecimal(efetiva.ariel) : "—",
            efetiva ? formatarPorcentagemDecimal(efetiva.isabella) : "—",
            "suave",
          ),
          linhaDaTabela("Pagou", formatarMoeda(c.pago.ariel), formatarMoeda(c.pago.isabella)),
          linhaDaTabela("Parte", formatarMoeda(c.parte.ariel), formatarMoeda(c.parte.isabella)),
        ),
      ),
    ),
    h(
      "div",
      { class: "acoes" },
      h(
        "button",
        { class: "botao grande destaque", type: "button", onclick: () => ctx.navegar("/compra") },
        "+ Adicionar conta",
      ),
      h(
        "button",
        {
          class: "botao grande secundario",
          type: "button",
          disabled: !s.saldo,
          onclick: () => ctx.navegar("/acerto"),
        },
        "Adicionar acerto",
      ),
      h(
        "div",
        { class: "atalhos" },
        h("button", { class: "botao secundario", type: "button", onclick: () => ctx.navegar("/historico") }, "Histórico"),
        h("button", { class: "botao secundario", type: "button", onclick: () => ctx.navegar("/deposito") }, "Depósito"),
      ),
    ),
  );
}

export function telaSaldo(ctx: Contexto, aoSair: () => void): HTMLElement {
  const raiz = h("main", { class: "tela" });
  const corpo = h("div", null, carregando());

  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      const saldo = await obterSaldo();
      lembrarProporcao(saldo.proporcao);
      corpo.replaceChildren(conteudo(saldo, ctx));
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };

  raiz.append(
    h(
      "header",
      { class: "topo" },
      h("h1", null, `Olá, ${nomePessoa(ctx.usuario)}`),
      menuConfiguracoes([
        { rotulo: "Proporção", aoEscolher: () => ctx.navegar("/proporcao") },
        { rotulo: "Sair", aoEscolher: aoSair },
      ]),
    ),
    corpo,
  );
  void carregar();
  return raiz;
}
