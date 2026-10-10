## MODIFIED Requirements

### Requirement: Tela de Saldo como inicial
Depois do login, o app SHALL exibir a tela de Saldo, cujo primeiro bloco é o painel "Ciclo atual" com o resumo do ciclo aberto. O painel SHALL mostrar, lado a lado no topo, o valor total das contas ("Total das contas") e a dívida do ciclo, com o texto "{Nome} deve" (o nome de quem deve) e o valor logo abaixo; quando não houver dívida, a dívida SHALL ser exibida como "Quites" com R$ 0,00. Se as duas métricas não couberem lado a lado, a dívida SHALL passar para baixo do total. Abaixo delas, o painel SHALL mostrar uma tabela com uma coluna para cada pessoa ("Ariel" e "Isabella") e quatro linhas: "Proporção" (a divisão vigente, em porcentagem), "Efetiva" (a parte de cada pessoa dividida pelo total das contas do ciclo, em porcentagem com no máximo uma casa decimal, ou "—" quando o ciclo não tem contas), "Pagou" (quanto a pessoa pagou no ciclo) e "Parte" (quanto a pessoa deve arcar no ciclo). A tela MUST NOT exibir um card de saldo separado do painel do ciclo. Abaixo do painel, a tela MUST ter, empilhados e com a mesma largura total, o botão "Adicionar conta" (em destaque) e o botão "Adicionar acerto", e em seguida os acessos ao Histórico e à calculadora de depósito ("Depósito") lado a lado. A tela MUST NOT oferecer a Proporção como atalho na área principal; esse acesso fica no menu de configurações.

#### Scenario: Saldo exibido
- **WHEN** o usuário entra no app
- **THEN** vê o painel "Ciclo atual" no topo, com o total das contas e a dívida do ciclo aberto, e abaixo dele o botão de adicionar conta em destaque

#### Scenario: Dívida do ciclo
- **WHEN** a Isabella deve R$ 48,00 ao Ariel
- **THEN** a métrica da dívida mostra "Isabella deve" e, abaixo, "R$ 48,00", sem citar o Ariel

#### Scenario: Saldo zerado
- **WHEN** o saldo do ciclo aberto é zero
- **THEN** a métrica da dívida mostra "Quites" e "R$ 0,00", e o botão "Adicionar acerto" fica desabilitado

#### Scenario: Resumo do ciclo em tabela
- **WHEN** o ciclo aberto tem contas de R$ 120,00 pagas pelo Ariel, na proporção 60/40
- **THEN** o painel mostra o total R$ 120,00 e, na tabela, a linha "Proporção" com 60% e 40%, a linha "Efetiva" com 60% e 40%, a linha "Pagou" com R$ 120,00 e R$ 0,00 e a linha "Parte" com R$ 72,00 e R$ 48,00, nas colunas do Ariel e da Isabella respectivamente

#### Scenario: Proporção efetiva com conta customizada
- **WHEN** o ciclo aberto tem uma conta de R$ 100,00 na proporção vigente 60/40 e uma conta de R$ 20,00 com proporção customizada 50/50
- **THEN** a linha "Proporção" mostra 60% e 40%, e a linha "Efetiva" mostra 58,3% e 41,7%

#### Scenario: Proporção efetiva inteira sem casa decimal
- **WHEN** a parte de cada pessoa dividida pelo total resulta em porcentagens inteiras
- **THEN** a linha "Efetiva" mostra os valores sem casa decimal (por exemplo, 60% e 40%)

#### Scenario: Ciclo sem contas
- **WHEN** o ciclo aberto não tem nenhuma conta
- **THEN** o painel mostra o total R$ 0,00, a tabela com a proporção vigente, "—" na linha "Efetiva" e valores zerados nas demais linhas

#### Scenario: Tela estreita
- **WHEN** o total e a dívida não cabem lado a lado na largura da tela
- **THEN** a dívida é exibida abaixo do total, sem rolagem horizontal

#### Scenario: Botões de ação
- **WHEN** o usuário está na tela de Saldo
- **THEN** os botões "Adicionar conta" e "Adicionar acerto" ocupam a largura toda, um sob o outro, e "Histórico" e "Depósito" aparecem lado a lado logo abaixo

#### Scenario: Sem atalho de Proporção
- **WHEN** o usuário está na tela de Saldo
- **THEN** os atalhos visíveis são "Adicionar conta", "Adicionar acerto", "Histórico" e "Depósito", e nenhum leva direto à Proporção

### Requirement: Confirmações
O app SHALL exigir confirmação explícita para remover um lançamento e para registrar um acerto, e SHALL exigir o passo de preview para mudar a proporção. O app MUST NOT exigir confirmação para registrar uma compra.

#### Scenario: Confirmar remoção
- **WHEN** o usuário toca em Remover em um card
- **THEN** o app pede confirmação e só remove se o usuário confirmar

#### Scenario: Cancelar acerto
- **WHEN** o usuário cancela na confirmação do acerto aberto por "Adicionar acerto"
- **THEN** nenhum lançamento é gravado
