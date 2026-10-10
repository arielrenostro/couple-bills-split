## Why

Algumas contas se repetem todo ciclo com a mesma descrição, o mesmo valor e a mesma proporção (o plano de saúde que a Isabella lança com 100% para o Ariel, as contas do cartão alimentação com a proporção padrão). Hoje cada uma é digitada de novo, com risco de erro de valor ou de esquecer de marcar a proporção customizada.

## What Changes

- A tela de Compra ganha uma seção "Sugestões", sempre à vista (um rótulo, sem botão para abrir), que lista as contas recorrentes de quem está marcado em "Quem pagou" e, ao tocar em uma, preenche valor, descrição e proporção. A seção tem o dobro do espaço normal entre campos até o campo "Descrição".
- As sugestões são calculadas no frontend a partir do histórico já devolvido por `GET /api/historico`, considerando só as despesas pagas por quem está marcado em "Quem pagou" (e não por quem as lançou) nos 3 ciclos fechados mais recentes e no ciclo aberto. A lista muda quando "Quem pagou" muda, para não oferecer a conta da outra pessoa. Nada é gravado no aparelho e a API não muda.
- Há uma sugestão por descrição (ignorando maiúsculas, acentos e espaços extras). Ela traz os valores do último lançamento dessa descrição. A data continua sendo a de hoje e "Quem pagou" continua como estava, sem ser alterado pela sugestão.
- As sugestões são ordenadas por recorrência: em quantos ciclos a descrição aparece, depois quantos lançamentos tem, depois o mais recente.
- Se o histórico não carregar, o formulário continua funcionando normalmente e a seção de sugestões não aparece.
- Os campos do formulário passam à ordem quem pagou, descrição, valor, data e proporção, com "Quem pagou" no topo, acima da seção de sugestões.
- A proporção vira um único campo editável, o percentual de quem pagou, e saem os botões "Padrão" e "Customizada". Ao alternar "Quem pagou", o campo é convertido para o percentual da nova pessoa, mantendo a mesma divisão. Ao registrar, uma divisão igual à padrão vigente é gravada como padrão e qualquer outra como customizada.
- Abaixo da proporção, um resumo da divisão (percentual e parte em reais de Ariel e Isabella) espelha a tabela do ciclo atual da tela de Saldo e se atualiza enquanto o usuário preenche.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `pwa-ui`: o requirement "Tela de Compra" passa a definir a nova ordem dos campos, o campo único de proporção e a seção de sugestões. Três requirements novos detalham o comportamento: "Campo de proporção relativo a quem pagou", "Resumo da divisão na tela de Compra" e "Sugestões de conta recorrente".

## Impact

- Código: `frontend/src/telas/compra.ts` (ordem dos campos, campo único de proporção, resumo, seção de sugestões e preenchimento), módulos novos em `frontend/src` com funções puras e testáveis (sugestões, divisão e conversão de proporção), `frontend/src/estilos.css` e os roteiros em `frontend/e2e`, que hoje usam os botões "Padrão"/"Customizada".
- Frontend: a tela de Compra passa a chamar `obterHistorico()` em paralelo com `obterSaldo()`. Sem mudança em `public/sw.js` além de subir `CACHE`, para os aparelhos instalados receberem a tela nova.
- Backend, infra, DynamoDB e specs `ledger` e `auth`: sem mudança.
- A API continua recebendo `proporcao: null` para a padrão ou `{ariel, isabella}` para a customizada; só muda como o formulário decide qual enviar.
- Não é objetivo desta mudança funcionar offline, guardar histórico no aparelho, sugerir contas de outro usuário nem otimizar o tamanho da resposta de `/api/historico`.
