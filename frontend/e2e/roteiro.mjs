// Roteiro de ponta a ponta no navegador, com viewport de celular.
//
//   node e2e/roteiro.mjs <url-do-app> <pasta-das-capturas> [caminho-do-chromium]
//
// Pré-requisitos: API em execução (npm run dev:api no backend) e o app servido
// (vite preview). Usa uma tabela limpa: rode contra uma tabela recém-criada.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const [url = "http://127.0.0.1:4173", pasta = "capturas", exe] = process.argv.slice(2);
mkdirSync(pasta, { recursive: true });

const executablePath =
  exe ??
  resolve(
    homedir(),
    ".cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
  );

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});
const page = await context.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && erros.push(`console: ${m.text()}`));

let passos = 0;
const nbsp = (s) => s.replace(/ /g, " ");

async function ok(descricao, fn) {
  try {
    await fn();
    passos += 1;
    console.log(`  ok  ${descricao}`);
  } catch (e) {
    console.log(`FALHA ${descricao}\n      ${String(e.message).split("\n")[0]}`);
    await page.screenshot({ path: `${pasta}/falha-${passos}.png` });
    await browser.close();
    process.exit(1);
  }
}

async function texto(seletor) {
  return nbsp((await page.locator(seletor).first().innerText()).replace(/\s+/g, " ").trim());
}
async function esperaTexto(seletor, esperado) {
  await page.waitForFunction(
    ([s, e]) => document.querySelector(s)?.textContent?.replace(/ /g, " ").includes(e),
    [seletor, esperado],
    { timeout: 5000 },
  );
}
async function foto(nome) {
  await page.screenshot({ path: `${pasta}/${nome}.png`, fullPage: true });
}
async function semRolagemHorizontal() {
  const [largura, janela] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  if (largura > janela) throw new Error(`rolagem horizontal: ${largura} > ${janela}`);
}
const botao = (nome) => page.getByRole("button", { name: nome, exact: true });
async function escolherNoMenu(item) {
  await botao("Configurações").click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}
async function esperaDivida(rotulo, valor) {
  await page.waitForFunction(
    ([r, v]) => {
      const ps = [...(document.querySelectorAll(".divida p") ?? [])].map((p) => p.textContent.replace(/\u00a0/g, " "));
      return ps.join(" ") === `${r} ${v}`;
    },
    [rotulo, valor],
    { timeout: 5000 },
  );
}
async function celulasDaTabela() {
  return page.$$eval(".tabela-ciclo tbody tr", (linhas) =>
    linhas.map((l) => [...l.children].map((c) => c.textContent.replace(/\u00a0/g, " "))),
  );
}

await page.goto(url);

await ok("abre na tela de login sem sessão", async () => {
  await page.waitForSelector("form.login");
  if (!page.url().endsWith("#/login")) throw new Error(`URL: ${page.url()}`);
  await semRolagemHorizontal();
  await foto("01-login");
});

await ok("senha errada mostra erro e não entra", async () => {
  await page.fill('input[name="senha"]', "errada");
  await botao("Entrar").click();
  await page.waitForSelector(".erro-campo:not([hidden])");
  if (!(await texto(".erro-campo")).includes("incorretos")) throw new Error(await texto(".erro-campo"));
});

await ok("login do Ariel leva ao saldo", async () => {
  await page.fill('input[name="senha"]', "batman");
  await botao("Entrar").click();
  await page.waitForSelector(".divida");
  if (!(await texto(".topo h1")).includes("Ariel")) throw new Error(await texto(".topo h1"));
});

await ok("saldo inicial: ninguém deve nada, botão de adicionar em destaque", async () => {
  if ((await texto(".divida")) !== `Quites ${nbsp("R$ 0,00")}`) throw new Error(await texto(".divida"));
  const destaque = page.getByRole("button", { name: "+ Adicionar conta" });
  const caixa = await destaque.boundingBox();
  if (!caixa || caixa.height < 56) throw new Error(`botão pequeno: ${caixa?.height}`);
  if (!(await botao("Adicionar acerto").isDisabled())) throw new Error("Adicionar acerto deveria estar desabilitado sem saldo");
  if ((await botao("Sair").count()) !== 0) throw new Error("Sair deveria existir só dentro do menu");
  if ((await botao("Proporção").count()) !== 0) throw new Error("Proporção deveria existir só dentro do menu");
  if ((await texto(".total-valor")) !== nbsp("R$ 0,00")) throw new Error(await texto(".total-valor"));
  await semRolagemHorizontal();
  await foto("02-saldo-zerado");
});

await ok("registra conta com proporção padrão (R$ 120,00 pago pelo Ariel)", async () => {
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  const rotulos = await page.$$eval(".compra .rotulo", (ls) => ls.map((l) => l.textContent));
  if (JSON.stringify(rotulos) !== JSON.stringify(["Quem pagou", "Sugestões", "Descrição", "Valor (R$)", "Data", "% do Ariel"])) throw new Error(JSON.stringify(rotulos));
  if ((await page.locator('.segmento[data-proporcao]').count()) !== 0) throw new Error("ainda há Padrão/Customizada");
  if ((await page.inputValue('input[name="pct"]')) !== "50") throw new Error(await page.inputValue('input[name="pct"]'));
  await page.fill('input[name="valor"]', "120,00");
  await page.fill('input[name="descricao"]', "Mercado");
  await foto("03-compra");
  await botao("Registrar").click();
  await esperaDivida("Isabella deve", "R$ 60,00");
  if (!(await page.locator(".aviso").count())) throw new Error("sem aviso de sucesso");
});

await ok("compra: as sugestões são de quem está marcado em Quem pagou (a outra pessoa ainda não tem nenhuma)", async () => {
  // Só o Ariel pagou algo até agora (o Mercado).
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  const itens = await page.$$eval(".sugestao", (bs) => bs.map((b) => b.textContent.replace(/\u00a0/g, " ")));
  if (itens.length !== 1 || !itens[0].includes("Mercado") || !itens[0].includes("R$ 120,00") || !itens[0].includes("Padrão (50/50)")) throw new Error(JSON.stringify(itens));
  // Com a Isabella marcada a lista troca na hora e diz que ela não tem sugestões.
  await page.locator('.segmento[data-pessoa="isabella"]').first().click();
  if ((await page.locator(".sugestao").count()) !== 0) throw new Error("sugestão do Ariel apareceu para a Isabella");
  if ((await texto(".sugestoes .vazio")) !== "Ainda não há sugestões para Isabella.") throw new Error(await texto(".sugestoes .vazio"));
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Isabella deve", "R$ 60,00");
});

await ok("compra: campo de proporção valida, converte ao trocar o pagador e o resumo acompanha", async () => {
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  const resumo = async () =>
    page.$$eval(".resumo-divisao tbody tr", (ls) => ls.map((l) => [...l.children].map((c) => c.textContent.replace(/\u00a0/g, " "))));
  const pct = 'input[name="pct"]';
  // Valor vazio: percentuais aparecem e as partes ficam em branco.
  if (JSON.stringify(await resumo()) !== JSON.stringify([["Proporção", "50%", "50%"], ["Parte", "—", "—"]])) throw new Error(JSON.stringify(await resumo()));
  await page.fill('input[name="valor"]', "100");
  await page.fill('input[name="descricao"]', "Teste");
  await page.fill(pct, "60");
  if (JSON.stringify(await resumo()) !== JSON.stringify([["Proporção", "60%", "40%"], ["Parte", nbsp("R$ 60,00"), nbsp("R$ 40,00")]])) throw new Error(JSON.stringify(await resumo()));
  await page.locator('.segmento[data-pessoa="isabella"]').first().click();
  if ((await page.inputValue(pct)) !== "40") throw new Error(`esperava 40, veio ${await page.inputValue(pct)}`);
  if ((await texto('form.formulario > .campo:has(input[name="pct"]) .rotulo')) !== "% da Isabella") throw new Error("rótulo não trocou");
  if (JSON.stringify(await resumo()) !== JSON.stringify([["Proporção", "60%", "40%"], ["Parte", nbsp("R$ 60,00"), nbsp("R$ 40,00")]])) throw new Error("a divisão mudou ao trocar o pagador");
  await page.locator('.segmento[data-pessoa="ariel"]').first().click();
  if ((await page.inputValue(pct)) !== "60") throw new Error(`ida e volta deveria dar 60, veio ${await page.inputValue(pct)}`);
  // R$ 0,05 em 50/50: quem não pagou (Isabella) arredonda para cima e a soma fecha.
  await page.fill('input[name="valor"]', "0,05");
  await page.fill(pct, "50");
  if (JSON.stringify(await resumo()) !== JSON.stringify([["Proporção", "50%", "50%"], ["Parte", nbsp("R$ 0,02"), nbsp("R$ 0,03")]])) throw new Error(JSON.stringify(await resumo()));
  // Validação: vazio, 101 e 1,5 são recusados sem gravar.
  for (const invalido of ["", "101", "1.5"]) {
    await page.fill(pct, invalido);
    await botao("Registrar").click();
    await page.waitForSelector(".erro-campo:not([hidden])");
    if ((await texto(".erro-campo")) !== "Informe o percentual de 0 a 100") throw new Error(`"${invalido}": ${await texto(".erro-campo")}`);
  }
  await foto("03b-compra-resumo");
  await semRolagemHorizontal();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Isabella deve", "R$ 60,00");
});

await ok("registra conta 70/30 paga pela Isabella, com o histórico indisponível", async () => {
  // Sem /api/historico o formulário segue funcionando e não oferece sugestões.
  await page.route("**/api/historico", (rota) => rota.abort());
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  if ((await page.locator(".sugestoes-campo").count()) !== 0) throw new Error("seção de sugestões sem histórico");
  await page.fill('input[name="valor"]', "100");
  await page.fill('input[name="descricao"]', "Luz");
  await page.locator('.segmento[data-pessoa="isabella"]').first().click();
  await page.fill('input[name="pct"]', "30");
  const resumo = await page.$$eval(".resumo-divisao tbody tr", (ls) => ls.map((l) => [...l.children].map((c) => c.textContent.replace(/\u00a0/g, " "))));
  if (JSON.stringify(resumo) !== JSON.stringify([["Proporção", "70%", "30%"], ["Parte", nbsp("R$ 70,00"), nbsp("R$ 30,00")]])) throw new Error(JSON.stringify(resumo));
  await foto("04-compra-customizada");
  await botao("Registrar").click();
  // 60,00 que a Isabella devia - 70,00 da parte do Ariel = Ariel deve 10,00.
  await esperaDivida("Ariel deve", "R$ 10,00");
  await page.unroute("**/api/historico");
});

await ok("valor inválido na compra é recusado sem gravar", async () => {
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  await page.fill('input[name="valor"]', "0");
  await page.fill('input[name="descricao"]', "Teste");
  await botao("Registrar").click();
  await page.waitForSelector(".erro-campo:not([hidden])");
  await page.getByRole("button", { name: "Voltar" }).click();
  await esperaDivida("Ariel deve", "R$ 10,00");
});

await ok("sugestões: mudam com Quem pagou e preenchem a divisão guardada", async () => {
  // Mercado: pago pelo Ariel (padrão). Luz: paga pela Isabella, Ariel 70% e Isabella 30%.
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  const lista = async () => page.$$eval(".sugestao", (bs) => bs.map((b) => b.textContent.replace(/\u00a0/g, " ")));
  const partes = async () => page.$$eval(".resumo-divisao tbody tr", (ls) => ls.map((l) => [...l.children].map((c) => c.textContent.replace(/\u00a0/g, " "))));
  let itens = await lista();
  if (itens.length !== 1 || !itens[0].startsWith("Mercado") || !itens[0].includes("Padrão (50/50)")) throw new Error(`Ariel: ${JSON.stringify(itens)}`);
  const alvo = await page.locator(".sugestao").first().boundingBox();
  if (!alvo || alvo.height < 44) throw new Error(`alvo de toque pequeno: ${alvo?.height}`);

  // Trocar o pagador mostra só as contas da Isabella.
  await page.locator('.segmento[data-pessoa="isabella"]').first().click();
  itens = await lista();
  if (itens.length !== 1 || !itens[0].startsWith("Luz") || !itens[0].includes("R$ 100,00") || !itens[0].includes("Ariel 70% · Isabella 30%")) throw new Error(`Isabella: ${JSON.stringify(itens)}`);
  await semRolagemHorizontal();
  // "Sugestões" é um rótulo (não um botão) e o espaço até a Descrição é o dobro do normal entre campos.
  if ((await page.getByRole("button", { name: "Sugestões", exact: true }).count()) !== 0) throw new Error("Sugestões deveria ser só um rótulo");
  const caixa = (seletor) => page.locator(seletor).first().boundingBox();
  const [sug, desc, val] = [await caixa(".sugestoes-campo"), await caixa(".campo:has(input[name=\"descricao\"])"), await caixa(".campo:has(input[name=\"valor\"])")];
  const entreCampos = val.y - (desc.y + desc.height);
  const aposSugestoes = desc.y - (sug.y + sug.height);
  if (Math.abs(aposSugestoes - 2 * entreCampos) > 1) throw new Error(`espaço após as sugestões ${aposSugestoes}, entre campos ${entreCampos}`);
  await foto("04a-sugestoes");

  // Tocar na Luz: preenche, a lista continua à vista, mantém data e pagador, e a divisão vira 30 para a Isabella.
  const data = await page.inputValue('input[name="data"]');
  await page.locator(".sugestao").first().click();
  if (!(await page.locator(".sugestoes").isVisible())) throw new Error("a lista sumiu");
  if ((await page.inputValue('input[name="descricao"]')) !== "Luz") throw new Error("descrição");
  if ((await page.inputValue('input[name="valor"]')) !== "100,00") throw new Error("valor");
  if ((await page.inputValue('input[name="pct"]')) !== "30") throw new Error(`pct ${await page.inputValue('input[name="pct"]')}`);
  if ((await page.inputValue('input[name="data"]')) !== data) throw new Error("a data mudou");
  if ((await page.locator('.segmento[data-pessoa="isabella"][aria-checked="true"]').count()) !== 1) throw new Error("a sugestão mudou quem pagou");
  if (JSON.stringify(await partes()) !== JSON.stringify([["Proporção", "70%", "30%"], ["Parte", nbsp("R$ 70,00"), nbsp("R$ 30,00")]])) throw new Error(JSON.stringify(await partes()));

  // De volta ao Ariel: a divisão se mantém (70) e a lista é a dele.
  await page.locator('.segmento[data-pessoa="ariel"]').first().click();
  if ((await page.inputValue('input[name="pct"]')) !== "70") throw new Error(`pct ${await page.inputValue('input[name="pct"]')}`);
  itens = await lista();
  if (itens.length !== 1 || !itens[0].startsWith("Mercado")) throw new Error(`Ariel de novo: ${JSON.stringify(itens)}`);
  // Sugestão padrão usa a proporção vigente de hoje (50/50).
  await page.locator(".sugestao").first().click();
  if ((await page.inputValue('input[name="pct"]')) !== "50") throw new Error(`pct ${await page.inputValue('input[name="pct"]')}`);
  if ((await page.inputValue('input[name="descricao"]')) !== "Mercado") throw new Error("descrição");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Ariel deve", "R$ 10,00");
});

await ok("menu: abre, fecha por Esc e por toque fora, e marca aria-expanded", async () => {
  await botao("Configurações").click();
  await page.getByRole("menuitem", { name: "Proporção", exact: true }).waitFor();
  if ((await botao("Configurações").getAttribute("aria-expanded")) !== "true") throw new Error("aria-expanded deveria ser true");
  await foto("04b-menu");
  await page.keyboard.press("Escape");
  await page.waitForSelector("dialog.menu", { state: "detached" });
  if ((await botao("Configurações").getAttribute("aria-expanded")) !== "false") throw new Error("aria-expanded deveria ser false");
  await botao("Configurações").click();
  await page.mouse.click(20, 600);
  await page.waitForSelector("dialog.menu", { state: "detached" });
  if (!page.url().endsWith("#/") && !page.url().endsWith("/")) throw new Error(`URL mudou: ${page.url()}`);
});

await ok("proporção: preview não grava; confirmar grava e reaplica ao ciclo", async () => {
  await escolherNoMenu("Proporção");
  await page.waitForSelector('input[name="pctAriel"]');
  await page.fill('input[name="pctAriel"]', "60");
  await botao("Ver prévia").click();
  await page.waitForSelector(".previa");
  await foto("05-previa-proporcao");
  if (!(await texto(".previa .antes")).includes("Ariel deve R$ 10,00 à Isabella")) throw new Error(await texto(".previa .antes"));
  if (!(await texto(".previa .depois")).includes("Ariel deve R$ 22,00 à Isabella")) throw new Error(await texto(".previa .depois"));

  // Corrigir a partir da prévia não grava nada.
  await botao("Corrigir proporção").click();
  await page.waitForSelector('input[name="pctAriel"]');
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Ariel deve", "R$ 10,00");

  await escolherNoMenu("Proporção");
  await page.fill('input[name="pctAriel"]', "60");
  await botao("Ver prévia").click();
  await page.waitForSelector(".previa");
  await botao("Confirmar e salvar").click();
  await esperaDivida("Ariel deve", "R$ 22,00");
});

await ok("home: Efetiva difere da Proporção quando há conta customizada", async () => {
  // Mercado 120 (60/40: Ariel 72) + Luz 100 (70/30: Ariel 70) = Ariel 142 de 220 = 64,5%.
  const esperado = [
    ["Proporção", "60%", "40%"],
    ["Efetiva", "64,5%", "35,5%"],
  ];
  const linhas = (await celulasDaTabela()).slice(0, 2);
  if (JSON.stringify(linhas) !== JSON.stringify(esperado)) throw new Error(JSON.stringify(linhas));
});

await ok("histórico: cards com os campos, proporção alterada visível", async () => {
  await botao("Histórico").click();
  await page.waitForSelector(".cartao");
  const cartoes = await page.locator(".cartao").count();
  if (cartoes !== 4) throw new Error(`esperava 4 cartões (50/50 inicial, 2 contas, 60/40), vieram ${cartoes}`);
  const mercado = await texto('.cartao[data-tipo="despesa"]:has-text("Mercado")');
  for (const trecho of ["Quem pagou Ariel", "Valor total R$ 120,00", "Proporção 60/40", "Parte do Ariel R$ 72,00", "Parte da Isabella R$ 48,00", "Saldo acumulado"]) {
    if (!mercado.includes(trecho)) throw new Error(`faltou "${trecho}" em: ${mercado}`);
  }
  const luz = await texto('.cartao[data-tipo="despesa"]:has-text("Luz")');
  if (!luz.includes("customizada") || !luz.includes("Proporção 70/30")) throw new Error(luz);
  const prop = await texto('.cartao[data-tipo="proporcao"]');
  if (!prop.includes("→") || !prop.includes("Saldo antes") || !prop.includes("Saldo depois")) throw new Error(prop);
  await semRolagemHorizontal();
  await foto("06-historico");
});

await ok("remover pede confirmação; cancelar não remove", async () => {
  await page.locator('.cartao:has-text("Luz")').getByRole("button", { name: "Remover" }).click();
  await page.waitForSelector("dialog[open]");
  await foto("07-confirmar-remocao");
  await page.locator('dialog button[data-acao="cancelar"]').click();
  await page.waitForSelector("dialog", { state: "detached" });
  if ((await page.locator(".cartao").count()) !== 4) throw new Error("removeu mesmo cancelando");
});

await ok("confirmar a remoção apaga o lançamento e recalcula o saldo", async () => {
  await page.locator('.cartao:has-text("Luz")').getByRole("button", { name: "Remover" }).click();
  await page.waitForSelector("dialog[open]");
  await page.locator('dialog button[data-acao="confirmar"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".cartao").length === 3);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  // Sobra só o mercado (Ariel pagou 120): a Isabella deve 40% = 48,00.
  await esperaDivida("Isabella deve", "R$ 48,00");
  if (!(await texto(".total-valor")).includes("120,00")) throw new Error(await texto(".total-valor"));
  const esperado = [
    ["Proporção", "60%", "40%"],
    ["Efetiva", "60%", "40%"],
    ["Pagou", nbsp("R$ 120,00"), nbsp("R$ 0,00")],
    ["Parte", nbsp("R$ 72,00"), nbsp("R$ 48,00")],
  ];
  if (JSON.stringify(await celulasDaTabela()) !== JSON.stringify(esperado)) throw new Error(JSON.stringify(await celulasDaTabela()));
  await semRolagemHorizontal();
  await foto("04c-ciclo-tabela");
});

await ok("depósito: divide pela proporção vigente, ao vivo, sem gravar nada", async () => {
  const atalhos = await page.$$eval(".atalhos .botao", (bs) => bs.map((b) => b.textContent));
  if (JSON.stringify(atalhos) !== JSON.stringify(["Histórico", "Depósito"])) throw new Error(JSON.stringify(atalhos));
  const consultasAoSaldo = [];
  const contar = (r) => r.url().includes("/api/saldo") && consultasAoSaldo.push(r.url());
  page.on("request", contar);
  await botao("Depósito").click();
  await page.waitForSelector('input[name="valor"]');
  page.off("request", contar);
  if (consultasAoSaldo.length !== 0) throw new Error(`a calculadora consultou /api/saldo: ${consultasAoSaldo.length}x`);
  if (!(await page.locator('input[name="valor"]').evaluate((el) => el === document.activeElement))) throw new Error("campo sem foco");
  const partes = async () => page.$$eval(".partes dd", (ds) => ds.map((d) => d.textContent.replace(/\u00a0/g, " ")));
  if (JSON.stringify(await partes()) !== JSON.stringify(["—", "—"])) throw new Error(JSON.stringify(await partes()));
  if (!(await page.locator(".erro-campo").isHidden())) throw new Error("erro com campo vazio");
  await page.fill('input[name="valor"]', "abc");
  if (!(await texto(".erro-campo")).includes("maior que zero")) throw new Error("sem erro para valor inválido");
  if (JSON.stringify(await partes()) !== JSON.stringify(["—", "—"])) throw new Error(JSON.stringify(await partes()));
  await page.fill('input[name="valor"]', "1.000,00");
  if (JSON.stringify(await partes()) !== JSON.stringify([nbsp("R$ 600,00"), nbsp("R$ 400,00")])) throw new Error(JSON.stringify(await partes()));
  if (!(await page.locator(".erro-campo").isHidden())) throw new Error("erro com valor válido");
  await page.fill('input[name="valor"]', "100,01");
  if (JSON.stringify(await partes()) !== JSON.stringify([nbsp("R$ 60,01"), nbsp("R$ 40,00")])) throw new Error(JSON.stringify(await partes()));
  if (!(await texto(".partes")).includes("60%") || !(await texto(".partes")).includes("40%")) throw new Error(await texto(".partes"));
  await semRolagemHorizontal();
  // Tabela de valores prontos: 60/40 vigente, fixa enquanto se digita.
  const tabela = async () => page.$$eval(".tabela-padroes tr", (ls) => ls.map((l) => [...l.children].map((c) => c.textContent.replace(/\u00a0/g, " "))));
  const linhasTabela = await tabela();
  if (JSON.stringify(linhasTabela[0]) !== JSON.stringify(["Valor total", "Ariel", "Isabella"])) throw new Error(JSON.stringify(linhasTabela[0]));
  if (linhasTabela.length !== 11) throw new Error(`esperava cabeçalho + 10 linhas, vieram ${linhasTabela.length}`);
  if (JSON.stringify(linhasTabela[1]) !== JSON.stringify(["R$ 1.000,00", "R$ 600,00", "R$ 400,00"])) throw new Error(JSON.stringify(linhasTabela[1]));
  if (JSON.stringify(linhasTabela[10]) !== JSON.stringify(["R$ 10.000,00", "R$ 6.000,00", "R$ 4.000,00"])) throw new Error(JSON.stringify(linhasTabela[10]));
  if ((await texto(".tabela-padroes caption")) !== "Valores prontos") throw new Error(await texto(".tabela-padroes caption"));
  await page.fill('input[name="valor"]', "777,77");
  if (JSON.stringify(await tabela()) !== JSON.stringify(linhasTabela)) throw new Error("a tabela mudou ao digitar");
  await foto("04d-deposito");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Isabella deve", "R$ 48,00");
  await botao("Depósito").click();
  await page.waitForSelector('input[name="valor"]');
  if ((await page.inputValue('input[name="valor"]')) !== "") throw new Error("valor lembrado ao reabrir");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await botao("Histórico").click();
  await page.waitForSelector(".cartao");
  if ((await page.locator(".cartao").count()) !== 3) throw new Error("o depósito gravou algo no histórico");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Isabella deve", "R$ 48,00");
});

await ok("depósito aberto direto (recarregando em #/deposito) busca a proporção e funciona", async () => {
  await page.evaluate(() => { location.hash = "/deposito"; });
  const consultas = [];
  page.on("request", (r) => r.url().includes("/api/saldo") && consultas.push(r.url()));
  await page.reload();
  await page.waitForSelector('input[name="valor"]');
  await page.fill('input[name="valor"]', "1000");
  const partes = await page.$$eval(".partes dd", (ds) => ds.map((d) => d.textContent.replace(/\u00a0/g, " ")));
  if (JSON.stringify(partes) !== JSON.stringify([nbsp("R$ 600,00"), nbsp("R$ 400,00")])) throw new Error(JSON.stringify(partes));
  if (consultas.length !== 1) throw new Error(`esperava 1 consulta a /api/saldo, vieram ${consultas.length}`);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Isabella deve", "R$ 48,00");
});

await ok("Adicionar acerto: valor vem com o saldo e a confirmação avisa que fecha o ciclo", async () => {
  await botao("Adicionar acerto").click();
  await page.waitForSelector('input[name="valor"]');
  if ((await page.inputValue('input[name="valor"]')) !== "48,00") throw new Error(await page.inputValue('input[name="valor"]'));
  if (!(await texto('.segmento[aria-checked="true"]')).includes("Isabella")) throw new Error("pagador padrão deveria ser a Isabella");
  await foto("08-paguei");
  await botao("Registrar acerto").click();
  await page.waitForSelector("dialog[open]");
  if (!(await texto("dialog p")).includes("fecha o ciclo")) throw new Error(await texto("dialog p"));
  await foto("09-confirmar-acerto");
});

await ok("cancelar o acerto não grava nada", async () => {
  await page.locator('dialog button[data-acao="cancelar"]').click();
  await page.waitForSelector("dialog", { state: "detached" });
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaDivida("Isabella deve", "R$ 48,00");
});

await ok("acerto parcial não fecha o ciclo", async () => {
  await botao("Adicionar acerto").click();
  await page.fill('input[name="valor"]', "8,00");
  await botao("Registrar acerto").click();
  await page.waitForSelector("dialog[open]");
  if (!(await texto("dialog p")).includes("continua aberto")) throw new Error(await texto("dialog p"));
  await page.locator('dialog button[data-acao="confirmar"]').click();
  await esperaDivida("Isabella deve", "R$ 40,00");
});

await ok("acerto total zera o saldo e fecha o ciclo", async () => {
  await botao("Adicionar acerto").click();
  await page.waitForSelector('input[name="valor"]');
  if ((await page.inputValue('input[name="valor"]')) !== "40,00") throw new Error(await page.inputValue('input[name="valor"]'));
  await botao("Registrar acerto").click();
  await page.waitForSelector("dialog[open]");
  await page.locator('dialog button[data-acao="confirmar"]').click();
  await esperaDivida("Quites", "R$ 0,00");
  await foto("10-saldo-fechado");
});

await ok("histórico: ciclo fechado sem botão remover e com etiqueta", async () => {
  await botao("Histórico").click();
  await page.waitForSelector(".cartao");
  if ((await page.getByRole("button", { name: "Remover" }).count()) !== 0) throw new Error("há Remover em ciclo fechado");
  if (!(await page.locator(".etiqueta.fecha").count())) throw new Error("sem etiqueta 'Fechou o ciclo'");
  if (!(await page.locator(".separador").count())) throw new Error("sem separador de ciclos fechados");
  await foto("11-historico-fechado");
});

await ok("nova conta depois do fechamento abre um ciclo novo e removível", async () => {
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.fill('input[name="valor"]', "30,00");
  await page.fill('input[name="descricao"]', "Água");
  await botao("Registrar").click();
  await esperaDivida("Isabella deve", "R$ 12,00");
  await botao("Histórico").click();
  await page.waitForSelector(".cartao");
  if ((await page.getByRole("button", { name: "Remover" }).count()) !== 1) throw new Error("só a conta nova deveria ser removível");
});

await ok("recarregar mantém a sessão; Sair volta ao login", async () => {
  await page.reload();
  await page.waitForSelector(".cartao");
  await page.goto(url);
  await page.waitForSelector(".divida");
  await escolherNoMenu("Sair");
  await page.waitForSelector("form.login");
  if (await page.evaluate(() => localStorage.getItem("contas.token"))) throw new Error("token não foi apagado");
});

await ok("token inválido volta ao login com aviso", async () => {
  await page.evaluate(() => {
    localStorage.setItem("contas.token", "lixo");
    localStorage.setItem("contas.usuario", "ariel");
  });
  await page.goto(url);
  await page.waitForSelector("form.login");
  if (!(await page.locator(".aviso").count())) throw new Error("sem aviso de sessão expirada");
});

await ok("sem erros no console do navegador", async () => {
  const relevantes = erros.filter((e) => !e.includes("401") && !e.includes("ERR_FAILED"));
  if (relevantes.length) throw new Error(relevantes.join(" | "));
});

await browser.close();
console.log(`\n${passos} passos ok`);
