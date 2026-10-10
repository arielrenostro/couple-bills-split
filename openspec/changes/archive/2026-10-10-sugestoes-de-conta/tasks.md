## 1. Lógica pura

- [x] 1.1 Criar o módulo de divisão em `frontend/src` (partes em centavos com a regra do backend, conversão de percentual entre quem pagou e a outra pessoa, e decisão padrão ou customizada) e verificar com `npm run typecheck -w frontend`
- [x] 1.2 Cobrir em `frontend/test` as partes (soma exata, centavo arredondado para quem não pagou, valores como R$ 0,05 e 50/50) reproduzindo os casos de `backend/test/domain`, e a conversão ao trocar o pagador (60 vira 40, 100 vira 0, ida e volta devolve o valor original), e verificar que os testes passam
- [x] 1.3 Cobrir a decisão ao gravar (divisão igual à vigente envia `null`, diferente envia `{ariel, isabella}`, inclusive quando o pagador é a Isabella) e verificar que os testes passam
- [x] 1.4 Criar o módulo de sugestões em `frontend/src` (recebe `ItemHistorico[]` e a pessoa marcada em "Quem pagou", devolve até 5 sugestões com descrição, valor e a decisão `{ customizada: false }` ou `{ customizada: true, ariel }`) e verificar com `npm run typecheck -w frontend`
- [x] 1.5 Cobrir em `frontend/test` o filtro por despesa e por `pagoPor` igual à pessoa marcada, e verificar que acertos, mudanças de proporção e despesas pagas pela outra pessoa não geram sugestões, mesmo quando foram lançadas por quem está logado
- [x] 1.6 Cobrir a janela de ciclos (aberto mais os 3 fechados mais recentes, inclusive com o aberto vazio logo após um fechamento) e verificar que uma conta só de ciclo mais antigo não aparece
- [x] 1.7 Cobrir a normalização da descrição (caixa, acentos, espaços nas pontas e repetidos) e verificar que "Plano de saúde" e "plano de saude " viram uma sugestão com a grafia mais recente
- [x] 1.8 Cobrir o ranking (ciclos distintos, depois lançamentos, depois recência), o limite de 5 e o valor e a divisão do último lançamento por `(data, id)`, e verificar que `npm test -w frontend` passa

## 2. Tela de Compra

- [x] 2.1 Reordenar os campos de `frontend/src/telas/compra.ts` para quem pagou (no topo, acima da seção de sugestões), descrição, valor, data e proporção, e verificar no navegador a ordem na tela
- [x] 2.2 Trocar os botões "Padrão"/"Customizada" e o bloco customizado por um único campo de proporção (inteiro de 0 a 100) com rótulo "% do Ariel" ou "% da Isabella" conforme o pagador, valor inicial igual à proporção vigente do pagador e a validação "Informe o percentual de 0 a 100", e verificar no navegador o valor inicial e o erro com campo vazio, 101 e 1,5
- [x] 2.3 Converter o campo ao alternar "Quem pagou" mantendo a divisão, e verificar no navegador que 60 com o Ariel vira 40 com a Isabella e volta a 60
- [x] 2.4 Adicionar o resumo da divisão abaixo da proporção (tabela Ariel/Isabella com "Proporção" e "Parte", reutilizando `tabela-ciclo`), atualizado ao mudar valor, pagador ou proporção e com "—" nas partes quando o valor é inválido, e verificar no navegador com R$ 100,00 a 60%, com R$ 0,05 a 50% e com valor vazio
- [x] 2.5 Gravar `proporcao: null` quando a divisão é igual à vigente e `{ariel, isabella}` quando difere, e verificar no Histórico que uma conta com divisão igual à padrão aparece como padrão e uma diferente como customizada
- [x] 2.6 Chamar `obterHistorico()` em paralelo com `obterSaldo()`, sem derrubar o formulário se o histórico falhar, e verificar manualmente que, com `/api/historico` bloqueado, o formulário registra uma conta normalmente e a seção de sugestões não aparece
- [x] 2.7 Adicionar a seção "Sugestões" (rótulo, sem botão) com a lista sempre à vista e o dobro de espaço até "Descrição" (com mensagem "ainda não há sugestões" quando vazia) usando `h()` sem `innerHTML`, recalculando a lista ao alternar "Quem pagou", e verificar no navegador que a lista aparece sem tocar em nada e mostra descrição, valor e divisão
- [x] 2.8 Preencher descrição, valor e o campo de proporção ao tocar em uma sugestão (padrão usa a vigente de hoje, customizada converte a divisão guardada para o pagador atual), atualizando o resumo, sem alterar a data nem "Quem pagou", e verificar no navegador com uma sugestão padrão e uma customizada de 100% do Ariel, com cada um dos dois como pagador
- [x] 2.9 Ajustar `frontend/src/estilos.css` para o campo de proporção, o resumo, o botão e a lista, reutilizando as classes existentes e os tokens atuais, e verificar em tela estreita que não há rolagem horizontal e os alvos de toque são grandes

## 3. Entrega

- [x] 3.1 Atualizar `frontend/e2e/roteiro.mjs` e `frontend/e2e/pwa.mjs` para o campo único de proporção (hoje usam "Padrão"/"Customizada") e para cobrir uma sugestão, rodando somente contra o servidor local com tabela nova e nunca contra o site publicado, e verificar que `npm run e2e` passa
- [x] 3.2 Subir `CACHE` em `frontend/public/sw.js` uma única vez, depois de integrar as mudanças em andamento da feature de depósito, e verificar que o valor mudou
- [x] 3.3 Rodar `npm run typecheck -w frontend`, `npm test` e `openspec validate sugestoes-de-conta --strict` e verificar que todos passam
