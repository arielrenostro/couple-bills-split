import { obterSaldo, registrar } from "../api";
import { formatarData, formatarMoeda, formatarValorCampo, hoje, lerValor, nomePessoa, outra } from "../formato";
import { campo, caixaDeErro, carregando, confirmar, mensagemDeErro, seletorPessoa, topo, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import type { Saldo } from "../tipos";

function formulario(saldo: Saldo, ctx: Contexto): HTMLElement {
  if (!saldo.saldo) {
    return h("p", { class: "vazio" }, "Não há nada a acertar: ninguém deve nada.");
  }
  const { devedor, credor, valor: divida } = saldo.saldo;

  const valor = h("input", {
    name: "valor",
    type: "text",
    inputMode: "decimal",
    autocomplete: "off",
    value: formatarValorCampo(divida),
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
  const quem = seletorPessoa(devedor);
  const erro = h("p", { class: "erro-campo", role: "alert", hidden: true });
  const enviar = h("button", { class: "botao grande", type: "submit" }, "Registrar acerto");

  const mostrarErro = (texto: string) => {
    erro.textContent = texto;
    erro.hidden = false;
  };

  return h(
    "form",
    {
      class: "formulario",
      novalidate: true,
      onsubmit: async (ev: Event) => {
        ev.preventDefault();
        erro.hidden = true;

        const centavos = lerValor(valor.value);
        if (centavos === null) return mostrarErro("Informe um valor maior que zero.");

        const pagador = quem.valor();
        const recebedor = outra(pagador);
        // Saldo positivo: Isabella deve ao Ariel. Quem paga o outro "devolve" a dívida.
        const efeito = pagador === "ariel" ? centavos : -centavos;
        const saldoDepois = saldo.saldoAssinado + efeito;
        const fechaCiclo = saldoDepois === 0;

        const ok = await confirmar({
          titulo: "Confirmar acerto?",
          mensagem:
            `${nomePessoa(pagador)} pagou ${formatarMoeda(centavos)} a ${nomePessoa(recebedor)} em ${formatarData(data.value)}.` +
            (fechaCiclo
              ? " Isso zera o saldo e fecha o ciclo: os lançamentos dele não poderão mais ser removidos."
              : " O saldo não zera, então o ciclo continua aberto."),
          confirmar: "Confirmar acerto",
        });
        if (!ok) return;

        enviar.disabled = true;
        enviar.textContent = "Registrando…";
        try {
          await registrar({ tipo: "acerto", valor: centavos, pagoPor: pagador, data: data.value });
          ctx.avisar(fechaCiclo ? "Acerto registrado. Ciclo fechado." : "Acerto registrado.");
          ctx.navegar("/");
        } catch (e) {
          mostrarErro(mensagemDeErro(e));
          enviar.disabled = false;
          enviar.textContent = "Registrar acerto";
        }
      },
    },
    h(
      "p",
      { class: "contexto" },
      `${nomePessoa(devedor)} deve ${formatarMoeda(divida)} ${credor === "ariel" ? "ao" : "à"} ${nomePessoa(credor)}.`,
    ),
    h("div", { class: "campo" }, h("span", { class: "rotulo" }, "Quem pagou"), quem.elemento),
    campo("Valor (R$)", valor, "Já vem com o saldo inteiro; mude para um acerto parcial."),
    campo("Data", data),
    erro,
    enviar,
  );
}

export function telaAcerto(ctx: Contexto): HTMLElement {
  const raiz = h("main", { class: "tela" }, topo("Paguei", () => ctx.navegar("/")));
  const corpo = h("div", null, carregando());
  raiz.append(corpo);

  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      corpo.replaceChildren(formulario(await obterSaldo(), ctx));
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };
  void carregar();
  return raiz;
}
