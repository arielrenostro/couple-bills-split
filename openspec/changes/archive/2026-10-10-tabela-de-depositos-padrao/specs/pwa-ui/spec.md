## ADDED Requirements

### Requirement: Tabela de depósitos padrão
A tela de Depósito SHALL exibir, abaixo do resultado da calculadora, uma tabela de valores prontos com as colunas "Valor total", "Ariel" e "Isabella" e dez linhas, de R$ 1.000 a R$ 10.000, de mil em mil. Em cada linha, as partes do Ariel e da Isabella SHALL ser calculadas pela proporção vigente do app, com a mesma regra de divisão da calculadora. A tabela SHALL aparecer já preenchida ao abrir a tela e MUST NOT depender do campo de valor nem mudar enquanto o usuário digita. Todos os valores das células, inclusive o valor total, SHALL ser exibidos com o símbolo "R$" e duas casas decimais, no mesmo formato do resultado da calculadora. A tabela MUST NOT exigir rolagem horizontal em telas estreitas.

#### Scenario: Tabela ao abrir
- **WHEN** a proporção vigente é 60/40 e o usuário abre a tela de Depósito
- **THEN** a tabela mostra dez linhas, a primeira com R$ 1.000,00, R$ 600,00 e R$ 400,00 e a última com R$ 10.000,00, R$ 6.000,00 e R$ 4.000,00, sob as colunas "Valor total", "Ariel" e "Isabella"

#### Scenario: Outra proporção
- **WHEN** a proporção vigente é 70/30
- **THEN** a linha de 3.000 mostra R$ 2.100,00 para o Ariel e R$ 900,00 para a Isabella

#### Scenario: Independente do campo de valor
- **WHEN** o usuário digita um valor no campo da calculadora
- **THEN** o resultado da calculadora muda e a tabela continua exatamente igual

#### Scenario: Soma das partes
- **WHEN** a tabela é exibida com qualquer proporção vigente
- **THEN** em todas as linhas, a parte do Ariel somada à da Isabella é igual ao valor total da linha

#### Scenario: Tela estreita
- **WHEN** a tela de Depósito é aberta com 320px de largura
- **THEN** a tabela cabe sem rolagem horizontal, inclusive na linha de R$ 10.000,00
