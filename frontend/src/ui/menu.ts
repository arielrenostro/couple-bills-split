import { h } from "./dom";
import { iconeEngrenagem } from "./icones";

export interface ItemMenu {
  rotulo: string;
  aoEscolher(): void;
}

/**
 * Botão de configurações que abre um menu logo abaixo dele. O menu é um
 * `<dialog>` (como em `confirmar()`): Esc, foco e devolução do foco vêm do
 * navegador; tocar fora ou escolher um item também fecham.
 */
export function menuConfiguracoes(itens: ItemMenu[]): HTMLElement {
  const botao = h("button", {
    class: "configuracoes",
    type: "button",
    "aria-label": "Configurações",
    "aria-haspopup": "menu",
    "aria-expanded": "false",
  });
  botao.append(iconeEngrenagem());

  botao.addEventListener("click", () => {
    const dialogo = h("dialog", { class: "menu", "aria-label": "Configurações" });
    const lista = h("div", { class: "menu-itens", role: "menu" });
    for (const item of itens) {
      lista.append(
        h(
          "button",
          {
            class: "menu-item",
            type: "button",
            role: "menuitem",
            onclick: () => {
              dialogo.close();
              item.aoEscolher();
            },
          },
          item.rotulo,
        ),
      );
    }
    dialogo.append(lista);
    dialogo.addEventListener("click", (ev) => {
      if (ev.target === dialogo) dialogo.close();
    });
    dialogo.addEventListener("close", () => {
      dialogo.remove();
      botao.setAttribute("aria-expanded", "false");
      if (botao.isConnected) botao.focus();
    });

    // Ancora o menu no canto direito do botão, qualquer que seja a largura da tela.
    const caixa = botao.getBoundingClientRect();
    dialogo.style.top = `${caixa.bottom + 4}px`;
    dialogo.style.right = `${Math.max(8, document.documentElement.clientWidth - caixa.right)}px`;

    document.body.append(dialogo);
    dialogo.showModal();
    botao.setAttribute("aria-expanded", "true");
  });

  return botao;
}
