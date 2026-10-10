import { obterHistorico, obterSaldo, registrar } from "../api";
import {
  converterPercentual,
  dividirDespesa,
  percentualDe,
  percentualValido,
  proporcaoDoPagador,
  proporcaoParaGravar,
} from "../divisao";
import { formatarMoeda, formatarPorcentagem, formatarValorCampo, hoje, lerValor, nomePessoa, textoProporcao } from "../formato";
import { calcularSugestoes, type Sugestao } from "../sugestoes";
import {
  campoData,
  caixaDeErro,
  carregando,
  linhaDaTabela,
  mensagemDeErro,
  seletorPessoa,
  topo,
  type Contexto,
} from "../ui/componentes";
import { h } from "../ui/dom";
import type { ItemHistorico, Pessoa, Proporcao, Saldo } from "../tipos";

const SEM_VALOR = "—";

/** Lê o campo de proporção: um inteiro de 0 a 100, ou `null` se vazio ou inválido. */
function lerPercentual(texto: string): number | null {
  if (texto.trim() === "") return null;
  const n = Number(texto);
  return percentualValido(n) ? n : null;
}

/** Texto da divisão de uma sugestão, para a lista. */
function textoDivisao(s: Sugestao, vigente: Proporcao): string {
  return s.proporcao.customizada
    ? `Ariel ${s.proporcao.ariel}% · Isabella ${100 - s.proporcao.ariel}%`
    : `Padrão (${textoProporcao(vigente)})`;
}

function formulario(saldo: Saldo, historico: ItemHistorico[] | null, ctx: Contexto): HTMLElement {
  const vigente = saldo.proporcao;

  const descricao = h("input", {
    name: "descricao",
    type: "text",
    autocomplete: "off",
    placeholder: "Ex.: mercado, luz, internet",
    required: true,
  });
  const valor = h("input", {
    name: "valor",
    type: "text",
    inputMode: "decimal",
    autocomplete: "off",
    placeholder: "0,00",
    required: true,
  });
  const data = h("input", {
    name: "data",
    type: "date",
    value: hoje(),
    max: hoje(),
    ...(saldo.dataUltimoFechamento ? { min: saldo.dataUltimoFechamento } : {}),
    required: true,
  });

  // Quem pagou e a proporção (percentual de quem pagou, 0 a 100).
  let pagador: Pessoa = ctx.usuario;
  const rotuloPct = h("span", { class: "rotulo" }, "");
  const pct = h("input", {
    name: "pct",
    type: "number",
    inputMode: "numeric",
    min: 0,
    max: 100,
    step: 1,
    placeholder: "50",
    value: String(percentualDe(pagador, vigente)),
  });

  // Resumo da divisão, no estilo da tabela do ciclo da tela de Saldo.
  const resumo = h("tbody");
  const atualizarResumo = () => {
    rotuloPct.textContent = `% ${pagador === "ariel" ? "do" : "da"} ${nomePessoa(pagador)}`;
    const n = lerPercentual(pct.value);
    const centavos = lerValor(valor.value);
    const divisao = n === null ? null : proporcaoDoPagador(pagador, n);
    const partes = divisao && centavos !== null ? dividirDespesa(centavos, pagador, divisao) : null;
    resumo.replaceChildren(
      linhaDaTabela(
        "Proporção",
        divisao ? formatarPorcentagem(divisao.ariel) : SEM_VALOR,
        divisao ? formatarPorcentagem(divisao.isabella) : SEM_VALOR,
        "suave",
      ),
      linhaDaTabela(
        "Parte",
        partes ? formatarMoeda(partes.ariel) : SEM_VALOR,
        partes ? formatarMoeda(partes.isabella) : SEM_VALOR,
      ),
    );
  };
  pct.addEventListener("input", atualizarResumo);
  valor.addEventListener("input", atualizarResumo);

  // Alternar quem pagou mantém a divisão: o campo passa a ser o percentual da nova pessoa.
  // As sugestões também mudam, porque cada pessoa tem as suas contas.
  let aoTrocarPagador = () => {};
  const quem = seletorPessoa(pagador, (p) => {
    if (p === pagador) return;
    pagador = p;
    const n = lerPercentual(pct.value);
    if (n !== null) pct.value = String(converterPercentual(n));
    atualizarResumo();
    aoTrocarPagador();
  });
  atualizarResumo();

  const erro = h("p", { class: "erro-campo", role: "alert", hidden: true });
  const enviar = h("button", { class: "botao grande", type: "submit" }, "Registrar");
  const mostrarErro = (texto: string) => {
    erro.textContent = texto;
    erro.hidden = false;
  };

  const form = h(
    "form",
    {
      class: "formulario",
      novalidate: true,
      onsubmit: async (ev: Event) => {
        ev.preventDefault();
        erro.hidden = true;

        const centavos = lerValor(valor.value);
        if (centavos === null) return mostrarErro("Informe um valor maior que zero.");
        if (descricao.value.trim() === "") return mostrarErro("Informe a descrição da conta.");
        const n = lerPercentual(pct.value);
        if (n === null) return mostrarErro("Informe o percentual de 0 a 100");

        enviar.disabled = true;
        enviar.textContent = "Registrando…";
        try {
          await registrar({
            tipo: "despesa",
            descricao: descricao.value.trim(),
            valor: centavos,
            pagoPor: pagador,
            data: data.value,
            proporcao: proporcaoParaGravar(proporcaoDoPagador(pagador, n), vigente),
          });
          ctx.avisar("Conta registrada.");
          ctx.navegar("/");
        } catch (e) {
          mostrarErro(mensagemDeErro(e));
          enviar.disabled = false;
          enviar.textContent = "Registrar";
        }
      },
    },
    h("label", { class: "campo" }, h("span", { class: "rotulo" }, "Descrição"), descricao),
    h("label", { class: "campo" }, h("span", { class: "rotulo" }, "Valor (R$)"), valor),
    h("label", { class: "campo" }, h("span", { class: "rotulo" }, "Data"), campoData(data)),
    h("label", { class: "campo" }, rotuloPct, pct),
    h(
      "table",
      { class: "tabela-ciclo resumo-divisao", "aria-label": "Resumo da divisão" },
      h("thead", null, h("tr", null, h("td"), h("th", { scope: "col" }, "Ariel"), h("th", { scope: "col" }, "Isabella"))),
      resumo,
    ),
    erro,
    enviar,
  );

  // "Quem pagou" fica no topo, acima das sugestões; vale para o formulário todo.
  const campoQuem = h("div", { class: "campo" }, h("span", { class: "rotulo" }, "Quem pagou"), quem.elemento);

  // Sem histórico (falhou ao carregar) não há botão de sugestões.
  if (!historico) return h("div", { class: "compra" }, campoQuem, form);

  const aplicar = (s: Sugestao) => {
    descricao.value = s.descricao;
    valor.value = formatarValorCampo(s.valor);
    const divisao = s.proporcao.customizada
      ? { ariel: s.proporcao.ariel, isabella: 100 - s.proporcao.ariel }
      : vigente;
    pct.value = String(percentualDe(pagador, divisao));
    atualizarResumo();
  };

  // Só as contas pagas por quem está marcado em "Quem pagou": evita escolher a sugestão da outra pessoa.
  const lista = h("div", { class: "sugestoes" });
  const montarLista = () => {
    const sugestoes = calcularSugestoes(historico, pagador);
    lista.replaceChildren(
      sugestoes.length === 0
        ? h("p", { class: "vazio" }, `Ainda não há sugestões para ${nomePessoa(pagador)}.`)
        : h(
            "ul",
            null,
            ...sugestoes.map((s) =>
              h(
                "li",
                null,
                h(
                  "button",
                  { type: "button", class: "sugestao", onclick: () => aplicar(s) },
                  h("span", { class: "sugestao-descricao" }, s.descricao),
                  h("span", { class: "sugestao-valor" }, formatarMoeda(s.valor)),
                  h("span", { class: "sugestao-divisao" }, textoDivisao(s, vigente)),
                ),
              ),
            ),
          ),
    );
  };
  montarLista();
  aoTrocarPagador = montarLista;
  // "Sugestões" é só um rótulo: a lista fica sempre à vista, com todas as contas.
  const campoSugestoes = h("div", { class: "campo sugestoes-campo" }, h("span", { class: "rotulo" }, "Sugestões"), lista);

  return h("div", { class: "compra" }, campoQuem, campoSugestoes, form);
}

export function telaCompra(ctx: Contexto): HTMLElement {
  const raiz = h("main", { class: "tela" }, topo("Adicionar conta", () => ctx.navegar("/")));
  const corpo = h("div", null, carregando());
  raiz.append(corpo);

  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      // O histórico só alimenta as sugestões: se falhar, o formulário segue sem elas.
      const [saldo, historico] = await Promise.all([
        obterSaldo(),
        obterHistorico().catch(() => null),
      ]);
      corpo.replaceChildren(formulario(saldo, historico, ctx));
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };
  void carregar();
  return raiz;
}
