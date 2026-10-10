# ledger Specification

## Purpose
Registra o que Ariel e Isabella pagam e acertam entre si, e calcula sempre a partir do histórico quanto cada um deve ao outro, organizado em ciclos que fecham quando a dívida é zerada.

## Requirements

### Requirement: Tipos de lançamento
O sistema SHALL manter um histórico de lançamentos de três tipos: `despesa`, `acerto` e `proporcao`. Todo lançamento MUST ter data, ordem de criação e o usuário que o registrou. Valores monetários SHALL ser inteiros em centavos e proporções SHALL ser percentuais inteiros entre 0 e 100.

#### Scenario: Lançamento registrado
- **WHEN** um usuário autenticado registra um lançamento válido
- **THEN** o lançamento é gravado no histórico com data, ordem de criação e autor

### Requirement: Registro de despesa
O sistema SHALL permitir registrar uma despesa com descrição, valor total, quem pagou e data. A despesa MAY ter uma proporção customizada; sem ela, usa a proporção vigente do ciclo. O registro de despesa MUST NOT exigir confirmação adicional.

#### Scenario: Despesa com proporção padrão
- **WHEN** Ariel registra uma despesa de R$ 120,00 sem proporção customizada
- **THEN** a despesa é gravada marcada como "proporção padrão" e entra no cálculo com a proporção vigente do ciclo

#### Scenario: Despesa com proporção customizada
- **WHEN** Isabella registra uma despesa de R$ 100,00 com proporção customizada 70/30
- **THEN** a despesa é gravada com 70/30 e essa proporção nunca é alterada por mudanças de proporção posteriores

#### Scenario: Valor inválido
- **WHEN** o valor é zero, negativo ou ausente
- **THEN** o sistema recusa o registro

### Requirement: Cálculo do saldo
O sistema SHALL calcular o saldo sempre a partir do histórico de lançamentos, sem usar valores compilados. A parte de cada pessoa em uma despesa SHALL ser calculada pela proporção aplicável; a parte de quem não pagou é arredondada e a de quem pagou é o restante, de modo que a soma das partes seja sempre igual ao valor total. Um acerto SHALL reduzir a dívida de quem pagou. O saldo SHALL ser apresentado como "X deve R$ Y a Z", nunca como número negativo.

#### Scenario: Saldo após uma despesa
- **WHEN** Ariel paga R$ 100,00 em proporção 50/50 e não há outros lançamentos
- **THEN** o saldo é "Isabella deve R$ 50,00 ao Ariel"

#### Scenario: Arredondamento
- **WHEN** uma despesa de R$ 0,01 é dividida 50/50
- **THEN** a soma das duas partes é R$ 0,01

#### Scenario: Saldo invertido
- **WHEN** Isabella deve R$ 100,00 ao Ariel e Isabella registra um acerto de R$ 130,00
- **THEN** o saldo é "Ariel deve R$ 30,00 a Isabella"

### Requirement: Registro de acerto
O sistema SHALL permitir registrar um acerto ("paguei"): quem pagou, valor e data. O valor SHALL vir preenchido com o saldo atual e MUST poder ser editado. O acerto MUST exigir confirmação antes de ser gravado e SHALL entrar no histórico como lançamento.

#### Scenario: Acerto total
- **WHEN** Isabella deve R$ 50,00 ao Ariel e Isabella confirma um acerto de R$ 50,00
- **THEN** o acerto é gravado e o saldo passa a zero

#### Scenario: Acerto sem confirmação
- **WHEN** o usuário abandona a confirmação do acerto
- **THEN** nada é gravado

### Requirement: Ciclos de contas
O sistema SHALL tratar como ciclo aberto os lançamentos desde o último acerto que zerou o saldo. Um acerto que leve o saldo exatamente a zero SHALL fechar o ciclo; um acerto parcial ou que inverta o saldo MUST NOT fechar o ciclo. Um ciclo fechado MUST NOT ser reaberto. O ciclo SHALL ser derivado do histórico e não gravado como estado.

#### Scenario: Acerto parcial
- **WHEN** Isabella deve R$ 100,00 e registra um acerto de R$ 40,00
- **THEN** o saldo passa a R$ 60,00 e o ciclo continua aberto

#### Scenario: Acerto que zera
- **WHEN** o saldo é R$ 60,00 e é registrado um acerto de R$ 60,00
- **THEN** o ciclo fecha e os lançamentos dele ficam congelados

#### Scenario: Ciclo novo após fechamento
- **WHEN** um novo lançamento é registrado depois do fechamento
- **THEN** ele pertence a um novo ciclo aberto

### Requirement: Regras de data
A data de um lançamento SHALL ter como padrão a data atual e MUST poder ser ajustada. A data MUST NOT ser posterior a hoje e MUST NOT ser anterior à data do acerto que fechou o último ciclo. No mesmo dia do fechamento a data é válida, e lançamentos de mesma data SHALL ser ordenados pela ordem de criação.

#### Scenario: Data retroativa dentro do ciclo aberto
- **WHEN** o usuário registra uma despesa com data de dois dias atrás, posterior ao último fechamento
- **THEN** o lançamento é aceito e ordenado no histórico pela data

#### Scenario: Data anterior ao fechamento
- **WHEN** a data informada é anterior à do último acerto que fechou um ciclo
- **THEN** o sistema recusa o registro

#### Scenario: Data futura
- **WHEN** a data informada é posterior a hoje
- **THEN** o sistema recusa o registro

### Requirement: Mudança de proporção como lançamento
O sistema SHALL registrar cada mudança de proporção como lançamento `proporcao` visível no histórico, informando a proporção anterior e a nova. A proporção vigente de um ciclo SHALL ser a do último lançamento `proporcao` feito até o fim do ciclo. Em ciclo aberto, ela SHALL valer para todas as despesas "proporção padrão" do ciclo, inclusive as anteriores ao lançamento; despesas customizadas MUST NOT ser alteradas; ciclos fechados MUST NOT ser alterados. O primeiro lançamento `proporcao` SHALL ser 50/50, criado na inicialização.

#### Scenario: Reaplicação ao ciclo aberto
- **WHEN** o ciclo aberto tem uma despesa de R$ 100,00 paga por Ariel em 50/50 e a proporção passa a 60/40 (Ariel/Isabella)
- **THEN** o saldo passa de "Isabella deve R$ 50,00 ao Ariel" para "Isabella deve R$ 40,00 ao Ariel"

#### Scenario: Despesa customizada preservada
- **WHEN** a proporção muda e há uma despesa com proporção customizada no ciclo aberto
- **THEN** essa despesa continua com a sua proporção

#### Scenario: Ciclo fechado preservado
- **WHEN** a proporção muda depois do fechamento de um ciclo
- **THEN** o saldo e as partes dos lançamentos daquele ciclo permanecem como estavam

#### Scenario: Preview antes de salvar
- **WHEN** o usuário informa uma nova proporção
- **THEN** o sistema mostra o saldo antes e depois e só grava o lançamento quando o usuário confirma

### Requirement: Remoção de lançamentos
O sistema SHALL permitir remover definitivamente um lançamento do ciclo aberto, após confirmação do usuário. O lançamento MUST ser excluído do histórico. O sistema MUST NOT permitir remover lançamentos de ciclos fechados, incluindo o acerto que fechou o ciclo. A remoção de um lançamento `proporcao` SHALL restaurar a proporção anterior.

#### Scenario: Remoção confirmada
- **WHEN** o usuário confirma a remoção de uma despesa do ciclo aberto
- **THEN** o registro é excluído e o saldo é recalculado sem ele

#### Scenario: Remoção em ciclo fechado
- **WHEN** o usuário tenta remover um lançamento de um ciclo fechado
- **THEN** o sistema recusa a remoção

#### Scenario: Remoção do acerto que fechou o ciclo
- **WHEN** o usuário tenta remover o acerto que zerou o saldo de um ciclo
- **THEN** o sistema recusa a remoção

### Requirement: Consulta de saldo e histórico
O sistema SHALL expor o saldo atual, o balanço do ciclo aberto (total pago e parte devida de cada pessoa) e o histórico completo. Cada item do histórico SHALL incluir descrição, quem pagou, valor total, proporção, valor devido a cada pessoa e saldo acumulado após o lançamento.

#### Scenario: Saldo acumulado
- **WHEN** o histórico tem uma despesa seguida de um acerto parcial
- **THEN** o item do acerto mostra o saldo acumulado depois dele

#### Scenario: Item de proporção
- **WHEN** o histórico contém um lançamento `proporcao`
- **THEN** o item mostra a proporção anterior, a nova e o saldo antes e depois
