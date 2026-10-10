import { obterSaldo } from "../api";
import { formatarMoeda, formatarPorcentagem, fraseSaldo, nomePessoa } from "../formato";
import { caixaDeErro, carregando, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import { menuConfiguracoes } from "../ui/menu";
import type { Saldo } from "../tipos";

function linhaDaTabela(rotulo: string, ariel: string, isabella: string, classe?: string): HTMLElement {
  return h(
    "tr",
    { class: classe },
    h("th", { scope: "row" }, rotulo),
    h("td", null, ariel),
    h("td", null, isabella),
  );
}

function conteudo(s: Saldo, ctx: Contexto): HTMLElement {
  const c = s.cicloAberto;
  const devedor = s.saldo ? nomePessoa(s.saldo.devedor) : null;

  return h(
    "div",
    { class: "saldo" },
    h(
      "section",
      { class: s.saldo ? "painel saldo-principal" : "painel saldo-principal quitado" },
      h("p", { class: "rotulo" }, s.saldo ? "Saldo" : "Tudo certo"),
      h("p", { class: "frase-saldo", dataset: { devedor: devedor ?? "" } }, fraseSaldo(s.saldo)),
    ),
    h(
      "button",
      { class: "botao grande destaque", type: "button", onclick: () => ctx.navegar("/compra") },
      "+ Adicionar conta",
    ),
    h(
      "div",
      { class: "atalhos" },
      h(
        "button",
        {
          class: "botao secundario",
          type: "button",
          disabled: !s.saldo,
          onclick: () => ctx.navegar("/acerto"),
        },
        "Paguei",
      ),
      h("button", { class: "botao secundario", type: "button", onclick: () => ctx.navegar("/historico") }, "Histórico"),
    ),
    h(
      "section",
      { class: "painel" },
      h("h2", null, "Ciclo atual"),
      h(
        "div",
        { class: "total-ciclo" },
        h("p", { class: "rotulo" }, "Total das contas"),
        h("p", { class: "total-valor" }, formatarMoeda(c.totalDespesas)),
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
          linhaDaTabela("Pagou", formatarMoeda(c.pago.ariel), formatarMoeda(c.pago.isabella)),
          linhaDaTabela("Parte", formatarMoeda(c.parte.ariel), formatarMoeda(c.parte.isabella)),
        ),
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
      corpo.replaceChildren(conteudo(await obterSaldo(), ctx));
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
