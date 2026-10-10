## MODIFIED Requirements

### Requirement: Tela de Compra
O app SHALL oferecer um formulário de compra com os campos nesta ordem: quem pagou (padrão: usuário logado), descrição, valor (teclado numérico), data (padrão: hoje) e proporção. O campo "Quem pagou" SHALL ficar no topo da tela, acima da seção de sugestões. A proporção SHALL ser um único campo numérico editável, conforme o requirement "Campo de proporção relativo a quem pagou", e MUST NOT haver escolha separada entre proporção padrão e customizada. O formulário SHALL exibir, abaixo da proporção, o resumo da divisão, conforme o requirement "Resumo da divisão na tela de Compra", e SHALL oferecer um botão de sugestões de conta recorrente, conforme o requirement "Sugestões de conta recorrente". O botão de registrar MUST gravar sem pedir confirmação adicional.

#### Scenario: Registrar compra
- **WHEN** o usuário preenche descrição e valor e toca em Registrar
- **THEN** a compra é gravada e o app volta à tela de Saldo atualizada

#### Scenario: Proporção customizada
- **WHEN** o usuário edita o campo de proporção para uma divisão diferente da padrão vigente
- **THEN** o resumo da divisão reflete a nova divisão e, ao registrar, a compra é gravada com proporção customizada, sem precisar escolher um modo antes

#### Scenario: Ordem dos campos
- **WHEN** o usuário abre a tela de Compra
- **THEN** os campos aparecem na ordem quem pagou, descrição, valor, data e proporção, com "Quem pagou" acima da seção de sugestões

#### Scenario: Formulário sem usar sugestões
- **WHEN** o usuário preenche o formulário sem tocar em nenhuma sugestão
- **THEN** o registro funciona exatamente como antes

## ADDED Requirements

### Requirement: Campo de proporção relativo a quem pagou
O campo de proporção da tela de Compra SHALL expressar o percentual de quem pagou, com rótulo que nomeia essa pessoa (por exemplo "% do Ariel" ou "% da Isabella"), e SHALL aceitar apenas números inteiros de 0 a 100. A divisão da compra SHALL ser: quem pagou com o percentual do campo e a outra pessoa com o restante até 100.

Ao abrir a tela, o campo SHALL vir preenchido com o percentual da proporção padrão vigente para quem pagou. Sempre que o usuário alternar "Quem pagou", o campo SHALL ser convertido para o percentual da nova pessoa, mantendo a mesma divisão entre as duas (o novo valor é 100 menos o valor anterior), sem voltar à proporção padrão.

Ao registrar, se a divisão resultante for igual à proporção padrão vigente, a compra SHALL ser gravada com a proporção padrão, e caso contrário SHALL ser gravada com proporção customizada. O valor do campo MUST ser validado antes de gravar.

#### Scenario: Valor inicial
- **WHEN** a proporção padrão vigente é Ariel 60% e Isabella 40%, e a Isabella abre a tela de Compra
- **THEN** o rótulo é "% da Isabella" e o campo vem com 40

#### Scenario: Alternar quem pagou converte o campo
- **WHEN** o Ariel está como pagador com o campo em 60 (divisão Ariel 60% e Isabella 40%) e o usuário alterna para Isabella
- **THEN** o rótulo passa a "% da Isabella" e o campo passa a 40, e a divisão continua Ariel 60% e Isabella 40%

#### Scenario: Valor editado se mantém ao alternar
- **WHEN** o usuário digita 100 com o Ariel como pagador (divisão Ariel 100% e Isabella 0%) e alterna para Isabella
- **THEN** o campo passa a 0, e a divisão continua Ariel 100% e Isabella 0%

#### Scenario: Divisão igual à padrão
- **WHEN** a divisão resultante é igual à proporção padrão vigente e o usuário toca em Registrar
- **THEN** a compra é gravada com a proporção padrão

#### Scenario: Divisão diferente da padrão
- **WHEN** a divisão resultante difere da proporção padrão vigente e o usuário toca em Registrar
- **THEN** a compra é gravada com proporção customizada com essa divisão

#### Scenario: Valor inválido
- **WHEN** o campo está vazio, não é inteiro ou está fora de 0 a 100 e o usuário toca em Registrar
- **THEN** o app mostra o erro "Informe o percentual de 0 a 100" e nada é gravado

### Requirement: Resumo da divisão na tela de Compra
Abaixo do campo de proporção, a tela de Compra SHALL exibir o resumo da divisão em uma tabela com colunas Ariel e Isabella, no mesmo estilo da tabela do ciclo atual da tela de Saldo, com as linhas "Proporção" (percentual de cada um) e "Parte" (valor em reais devido por cada um). O resumo SHALL ser atualizado a cada mudança de valor, quem pagou ou proporção. A parte de quem não pagou SHALL ser arredondada para o centavo e a de quem pagou SHALL ser o restante, de modo que as duas somem exatamente o valor, como o ledger calcula.

#### Scenario: Resumo com valor e proporção
- **WHEN** o Ariel paga uma compra de R$ 100,00 com o campo em 60
- **THEN** o resumo mostra Proporção 60% e 40%, e Parte R$ 60,00 para o Ariel e R$ 40,00 para a Isabella

#### Scenario: Resumo acompanha a troca de pagador
- **WHEN** o usuário alterna quem pagou
- **THEN** o percentual de cada um no resumo não muda, porque a divisão é mantida

#### Scenario: Soma exata
- **WHEN** o valor é R$ 0,05 e a divisão é 50% e 50%
- **THEN** as duas partes somam exatamente R$ 0,05, com a parte de quem não pagou arredondada e a de quem pagou como o restante

#### Scenario: Valor ainda não informado
- **WHEN** o campo de valor está vazio ou inválido
- **THEN** o resumo mostra os percentuais e as partes em branco ("—"), sem erro

### Requirement: Sugestões de conta recorrente
A tela de Compra SHALL exibir, entre "Quem pagou" e "Descrição", uma seção com o rótulo "Sugestões" (não um botão) que lista, sempre à vista e sem precisar abrir, as contas recorrentes de quem está marcado em "Quem pagou". As sugestões SHALL ser calculadas a partir do histórico de lançamentos do servidor, considerando apenas despesas pagas por quem está marcado em "Quem pagou" (quem pagou, não quem lançou) no ciclo aberto e nos 3 ciclos fechados mais recentes. A lista SHALL ser recalculada sempre que "Quem pagou" mudar. Entre a lista e o campo "Descrição" SHALL haver o dobro do espaço usado entre os demais campos do formulário. Despesas pagas pela outra pessoa, acertos e mudanças de proporção MUST NOT gerar sugestões, e o app MUST NOT guardar esse histórico no aparelho.

A lista SHALL ter no máximo uma sugestão por descrição, e descrições que diferem só em maiúsculas, acentos ou espaços nas pontas e repetidos SHALL ser tratadas como a mesma conta. A sugestão SHALL mostrar a grafia da descrição e os valores (valor e divisão) do último lançamento dessa conta, na ordem de data e, em empate, de criação. A lista SHALL ser ordenada pelo número de ciclos distintos em que a descrição aparece, depois pelo número de lançamentos, depois pelo lançamento mais recente, e SHALL mostrar no máximo 5 sugestões, todas visíveis ao mesmo tempo.

#### Scenario: Preencher a partir de uma sugestão
- **WHEN** o usuário toca em uma sugestão
- **THEN** o formulário é preenchido com a descrição, o valor e a proporção dessa sugestão, o resumo da divisão é atualizado e a lista continua à vista

#### Scenario: Data e quem pagou não mudam
- **WHEN** o usuário toca em uma sugestão
- **THEN** a data continua sendo hoje e "Quem pagou" continua como estava, sem ser alterado pela sugestão

#### Scenario: Sugestão com proporção padrão
- **WHEN** o último lançamento da conta usava a proporção padrão e o usuário toca na sugestão
- **THEN** o campo de proporção recebe o percentual da proporção padrão vigente hoje para quem está como pagador, e não os percentuais daquele lançamento

#### Scenario: Sugestão com proporção customizada
- **WHEN** o último lançamento da conta tinha proporção customizada (por exemplo, Ariel 100% e Isabella 0%) e o usuário toca na sugestão
- **THEN** o campo recebe o percentual de quem está como pagador nessa divisão (100 se o Ariel paga, 0 se a Isabella paga), mantendo a mesma divisão

#### Scenario: Valores do último lançamento
- **WHEN** a mesma descrição foi lançada com valores diferentes em ciclos diferentes
- **THEN** a sugestão traz o valor do lançamento mais recente

#### Scenario: Uma sugestão por descrição
- **WHEN** "Plano de saúde" e "plano de saude " aparecem em lançamentos do usuário
- **THEN** a lista tem uma só sugestão para essa conta, com a grafia do lançamento mais recente

#### Scenario: Ranking por recorrência
- **WHEN** uma descrição aparece em 3 ciclos e outra aparece 4 vezes em um só ciclo
- **THEN** a de 3 ciclos vem antes na lista

#### Scenario: Recorrência por quem pagou
- **WHEN** a Isabella pagou o plano de saúde nos últimos ciclos e "Quem pagou" está como Ariel
- **THEN** o plano de saúde não aparece nas sugestões

#### Scenario: Sugestões acompanham quem pagou
- **WHEN** o plano de saúde é sempre pago pela Isabella e o usuário alterna "Quem pagou" de Ariel para Isabella
- **THEN** a lista de sugestões passa a mostrar o plano de saúde, e ao voltar para Ariel ele deixa de aparecer

#### Scenario: Quem lançou não importa
- **WHEN** o Ariel lançou uma conta que a Isabella pagou
- **THEN** ela aparece nas sugestões com "Quem pagou" como Isabella e não aparece com Ariel

#### Scenario: Ciclos antigos
- **WHEN** uma conta só foi lançada em um ciclo fechado anterior aos 3 ciclos fechados mais recentes
- **THEN** ela não aparece nas sugestões

#### Scenario: Sem sugestões
- **WHEN** quem está marcado em "Quem pagou" não pagou despesas nos ciclos considerados
- **THEN** o app informa que ainda não há sugestões para essa pessoa e o formulário segue utilizável

#### Scenario: Histórico indisponível
- **WHEN** o histórico não carrega, por exemplo sem conexão
- **THEN** o formulário de compra continua funcionando e a seção de sugestões não é exibida
