## Context

A tela de Compra (`frontend/src/telas/compra.ts`) carrega só `obterSaldo()` antes de montar o formulário. O histórico completo já está disponível em `GET /api/historico` (`obterHistorico()`), e cada item de despesa traz `criadoPor`, `ciclo` (índice, 0 é o primeiro), `cicloFechado`, `descricao`, `valor`, `proporcao` e `proporcaoCustomizada`. O ciclo aberto é o de maior índice. O motivo e o escopo estão em `proposal.md`, e o comportamento exigido está em `specs/pwa-ui/spec.md`.

O frontend é TypeScript puro, uma função por tela, com testes de funções puras em `frontend/test` (vitest). O texto do usuário só entra no DOM via `h()`, nunca por `innerHTML`.

## Goals / Non-Goals

**Goals:**
- Cálculo das sugestões isolado em uma função pura, testável sem DOM nem rede.
- Nenhuma mudança no backend, na API ou no DynamoDB.
- Formulário de compra com campos na ordem pedida, um único campo de proporção e um resumo da divisão que reflete sempre o que será gravado.
- A falha do histórico nunca impede registrar uma conta.

**Non-Goals:**
- Guardar histórico ou sugestões no aparelho (`localStorage`).
- Filtrar ou paginar `/api/historico` no servidor. O ledger já é recalculado inteiro a cada leitura e o histórico de um casal é pequeno.
- Sugerir pelo valor estável entre ciclos, ou sugerir contas do outro usuário.

## Decisions

**D1. Fonte: `GET /api/historico`, calculado no cliente.** A tela de Compra chama `obterHistorico()` em paralelo com `obterSaldo()`. Alternativa descartada: histórico em `localStorage` (últimos N lançamentos). Ela funciona offline, mas cada aparelho começa vazio, não vê remoções nem o que foi lançado em outro aparelho, e precisa de lógica própria de ciclo e de migração. Como offline não é requisito, a API é mais simples e mais fiel ao dado real.

**D2. O critério é `pagoPor` igual ao "Quem pagou" marcado, não `criadoPor`.** O caso de uso é "a Isabella paga o plano de saúde todo ciclo": a conta é de quem paga, e oferecer a sugestão com a outra pessoa marcada daria a divisão e o pagador errados. A lista é recalculada sempre que "Quem pagou" muda, inclusive com a lista aberta, e como depende só do que está marcado, é a mesma nos dois aparelhos. Alternativa descartada: filtrar por `criadoPor === usuário logado`, que não acompanha o pagador marcado e deixa escolher a conta da pessoa errada.

**D3. Janela: ciclo aberto mais os 3 ciclos fechados mais recentes.** Com `ciclo` como índice, o corte é `ciclo >= indiceDoAberto - 3`. Isso garante 3 ciclos completos de histórico mesmo logo depois de um fechamento, quando o ciclo aberto está vazio. Alternativa: 3 ciclos contando o aberto, descartada porque nesse momento sobrariam só 2 ciclos reais.

**D4. Ranking por ciclos distintos, depois lançamentos, depois recência.** Contar só lançamentos favorece o "mercado" (muitas compras, valor variável) sobre o plano de saúde (uma por ciclo). Contar ciclos distintos mede o que de fato é recorrente. Contagem de lançamentos e recência só desempatam, e o resultado é determinístico. O topo da lista é cortado em 5 sugestões.

**D5. Chave de agrupamento normalizada.** A descrição é normalizada para comparar: `trim`, espaços internos colapsados, minúsculas e acentos removidos (`normalize("NFD")` sem as marcas combinantes). A sugestão exibe a grafia do último lançamento, e não a normalizada.

**D6. Sugestão de proporção padrão usa a vigente de hoje, não os percentuais antigos.** O item de histórico traz `proporcao` efetiva mesmo quando a despesa usa a padrão (`proporcaoCustomizada: false`). A sugestão carrega só a decisão: `{ customizada: false }` ou `{ customizada: true, ariel }`. Ao aplicar, "padrão" preenche o campo com a proporção vigente atual (vinda de `obterSaldo()`) e "customizada" preenche com a divisão guardada. Assim, se a proporção padrão mudou desde o último lançamento, a conta sugerida acompanha a vigente. Como a tela não tem mais o botão "Padrão" (D12), é a regra de gravação (D13) que a mantém como padrão.

**D7. "Último lançamento" segue a ordem do ledger, `(data, id)`.** A função ordena por esse par em vez de confiar na ordem em que a API devolve os itens.

**D8. Degradação silenciosa.** Se `obterHistorico()` falhar, o formulário monta normalmente e a seção de sugestões não aparece. A tela já exibe erro quando `obterSaldo()` falha, e esse comportamento não muda. Uma falha de 401 continua tratada em `api.ts` (descarta a sessão e volta ao login).

**D9. Apresentação das sugestões.** "Sugestões" é um rótulo, no mesmo estilo dos rótulos dos campos, e não um botão. A lista fica sempre à vista na própria tela, sem diálogo modal nem abrir e fechar, abaixo de "Quem pagou" e acima do formulário, com todas as sugestões (no máximo 5, D4), e cada item mostra descrição, valor e divisão. Tocar em um item preenche o formulário e a lista continua à vista. O espaço entre a lista e o campo "Descrição" é o dobro do espaço normal entre campos, para separar a escolha de uma conta recorrente do formulário em si. Alternativa descartada: botão que abre e fecha a lista, que esconde as contas e exige um toque a mais para ver o que há. Preencher o formulário usa os mesmos controles de hoje (descrição, valor e o campo único de proporção) e então atualiza o resumo da divisão como qualquer edição manual.

**D10. Estrutura de código.** A lógica pura vai para módulos novos em `frontend/src`: um de sugestões (recebe `ItemHistorico[]` e a pessoa marcada em "Quem pagou", devolve a lista), um de divisão (partes em centavos, conversão de percentual entre pagador e outra pessoa, e a decisão padrão ou customizada). `compra.ts` só liga esses módulos aos campos. Os testes ficam em `frontend/test`, no estilo dos existentes.

**D11. Ordem dos campos.** O formulário passa a quem pagou, descrição, valor, data e proporção, nessa ordem, com "quem pagou" no topo, acima da seção de sugestões. O resumo da divisão (D14) fica logo abaixo da proporção, e o botão de registrar fecha o formulário. "Quem pagou" vem antes da proporção, porque o rótulo e o valor do campo de proporção dependem dele, e no topo porque é a primeira escolha ao lançar e vale para os demais campos.

**D12. Um único campo de proporção, relativo a quem pagou.** Saem os botões "Padrão" e "Customizada" e o campo "% do Ariel" que só aparecia na customizada. O campo é sempre visível, aceita inteiros de 0 a 100 e tem o rótulo "% do Ariel" ou "% da Isabella" conforme o pagador. Alternativas descartadas: manter "% do Ariel" fixo (a troca de pagador não teria efeito no campo) e voltar ao padrão a cada troca (descartaria um valor digitado ou vindo de sugestão, como o plano de saúde 100% do Ariel).

**D13. Conversão ao trocar o pagador e decisão ao gravar.** Internamente a divisão é `{ariel, isabella}`, como no ledger. O campo mostra o percentual do pagador, e ao trocar o pagador o novo valor é `100 - valor anterior`, o que mantém a divisão. Ao registrar, a divisão é comparada com a proporção vigente: se for igual, envia `proporcao: null` (padrão), senão envia `{ariel, isabella}` (customizada). O backend não muda. Consequência aceita: quem digitar um valor igual ao padrão fica com uma compra "padrão", que acompanha uma mudança de proporção posterior no ciclo aberto, em vez de ficar congelada.

**D14. Resumo da divisão.** Uma tabela com colunas Ariel e Isabella e linhas "Proporção" e "Parte", reutilizando as classes `tabela-ciclo` da tela de Saldo. As partes são calculadas no cliente com a mesma regra de `backend/src/domain/divisao.ts`: a de quem não pagou é `floor((valor * pct + 50) / 100)` e a de quem pagou é o restante. O resumo é recalculado a cada alteração de valor, pagador ou proporção, e mostra "—" nas partes quando o valor é inválido. Alternativa descartada: importar a função do backend, que é outro workspace sem dependência compartilhada hoje. A cópia é pequena e os testes reproduzem os casos do backend para evitar divergência.

## Risks / Trade-offs

- [O histórico cresce com o tempo e é baixado inteiro a cada abertura da tela de Compra] → Aceito para um casal. Uma opção futura é um parâmetro de ciclos no endpoint, fora do escopo.
- [Latência extra na abertura da tela] → A chamada é paralela a `obterSaldo()`, e o botão pode aparecer depois do formulário, sem bloquear o uso.
- [Fechamento retroativo de ciclo (documentado em CLAUDE.md) muda o índice de ciclo de lançamentos antigos] → Como o dado vem sempre do servidor a cada abertura, a janela reflete o estado atual. Não há cache que fique inconsistente.
- [Contas de valor variável, como o mercado, podem aparecer no topo por serem recorrentes] → Aceito nesta versão. O refinamento por valor estável fica como evolução futura.
- [Descrições parecidas mas diferentes (por exemplo "luz" e "conta de luz") não se agrupam] → Aceito. Agrupar por semelhança exigiria heurística fraca e fora do pedido.
- [A regra de arredondamento é duplicada entre `divisao.ts` do backend e o cliente] → Testes do cliente reproduzem os casos do backend, incluindo a soma exata. O valor gravado vem sempre do backend, então um erro no resumo só afeta o que é exibido.
- [Uma divisão igual à padrão é sempre gravada como padrão, mesmo que a pessoa queira "fixar" aquela proporção] → Aceito. A mudança de proporção só retroage no ciclo aberto, como já descrito em CLAUDE.md, e quem quiser fixar uma divisão usa uma diferente da vigente.
- [Os roteiros E2E existentes clicam em "Padrão"/"Customizada"] → Atualizar `frontend/e2e/roteiro.mjs` e `frontend/e2e/pwa.mjs` para o campo único.
- [A feature de depósito está sendo desenvolvida em paralelo e também altera `estilos.css`, `main.ts` e `sw.js`] → Rebasear sobre essas mudanças antes de implementar e subir `CACHE` uma única vez na entrega.
- [Aparelhos instalados mantêm a tela antiga no cache do service worker] → Subir `CACHE` em `frontend/public/sw.js` ao entregar.

## Migration Plan

Mudança só de frontend e sem dados novos. A entrega é o `npm run deploy` de sempre. Para voltar atrás, basta publicar a versão anterior do frontend, porque nada é gravado no servidor nem no aparelho.
