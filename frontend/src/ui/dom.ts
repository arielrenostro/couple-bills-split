type Filho = Node | string | number | null | undefined | false;
type Atributos = Record<string, unknown> | null;

/**
 * Cria um elemento. Textos entram como nós de texto (nunca como HTML), então
 * descrições digitadas pelo usuário não podem injetar marcação.
 *
 * Atributos: `class`, `on<evento>` (função), `dataset` (objeto); o resto vai
 * como propriedade do elemento quando existir nele, ou como atributo.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos?: Atributos,
  ...filhos: Filho[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos ?? {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (nome === "class") el.className = String(valor);
    else if (nome === "dataset") Object.assign(el.dataset, valor as Record<string, string>);
    else if (nome.startsWith("on") && typeof valor === "function") {
      el.addEventListener(nome.slice(2).toLowerCase(), valor as EventListener);
    } else if (nome in el) (el as any)[nome] = valor;
    else el.setAttribute(nome, valor === true ? "" : String(valor));
  }
  anexar(el, filhos);
  return el;
}

export function anexar(pai: Node, filhos: Filho[]): void {
  for (const f of filhos) {
    if (f === null || f === undefined || f === false) continue;
    pai.appendChild(typeof f === "object" ? f : document.createTextNode(String(f)));
  }
}

export function limpar(el: Element): void {
  el.replaceChildren();
}
