## MODIFIED Requirements

### Requirement: Tela de Saldo como inicial
Depois do login, o app SHALL exibir a tela de Saldo, com a frase do saldo ("X deve R$ Y a Z") e o resumo do ciclo aberto. O resumo do ciclo aberto SHALL mostrar primeiro o valor total das contas e, depois dele, uma tabela com uma coluna para cada pessoa ("Ariel" e "Isabella") e três linhas: "Proporção" (a divisão vigente, em porcentagem), "Pagou" (quanto a pessoa pagou no ciclo) e "Parte" (quanto a pessoa deve arcar no ciclo). A tela MUST ter um botão bem visível para adicionar uma compra e acessos ao Histórico, ao acerto ("Paguei") e à calculadora de depósito ("Depósito"). A tela MUST NOT oferecer a Proporção como atalho na área principal; esse acesso fica no menu de configurações.

#### Scenario: Saldo exibido
- **WHEN** o usuário entra no app
- **THEN** vê o saldo do ciclo aberto e o botão de adicionar compra em destaque

#### Scenario: Saldo zerado
- **WHEN** o saldo do ciclo aberto é zero
- **THEN** a tela informa que não há dívida

#### Scenario: Resumo do ciclo em tabela
- **WHEN** o ciclo aberto tem contas de R$ 120,00 pagas pelo Ariel, na proporção 60/40
- **THEN** o resumo mostra o total R$ 120,00 e, na tabela, a linha "Proporção" com 60% e 40%, a linha "Pagou" com R$ 120,00 e R$ 0,00 e a linha "Parte" com R$ 72,00 e R$ 48,00, nas colunas do Ariel e da Isabella respectivamente

#### Scenario: Ciclo sem contas
- **WHEN** o ciclo aberto não tem nenhuma conta
- **THEN** o resumo mostra o total R$ 0,00 e a tabela com a proporção vigente e valores zerados

#### Scenario: Sem atalho de Proporção
- **WHEN** o usuário está na tela de Saldo
- **THEN** os atalhos visíveis são "Paguei", "Histórico" e "Depósito", e nenhum leva direto à Proporção

## ADDED Requirements

### Requirement: Calculadora de depósito
O app SHALL oferecer, na tela de Saldo, um acesso "Depósito" que leva a uma calculadora do valor que cada pessoa deve depositar na conta conjunta. Na calculadora, o usuário SHALL informar o valor total a depositar, no mesmo formato aceito no campo de valor da compra, e o app SHALL mostrar, a cada alteração do valor e sem botão de calcular, a parte de Ariel e a parte de Isabella, calculadas pela proporção vigente do app, junto com o percentual de cada um. A soma das duas partes MUST ser exatamente o valor informado; quando a divisão não for exata em centavos, a parte do Ariel SHALL ser arredondada para o centavo mais próximo (metade para cima) e a da Isabella SHALL ser o restante. Enquanto o valor estiver vazio ou inválido, o app SHALL não mostrar partes e, se houver texto inválido, SHALL indicar que o valor deve ser maior que zero. Ao ser aberta a partir da tela de Saldo, a calculadora SHALL usar a proporção que a tela de Saldo acabou de exibir, sem nova consulta ao servidor, e só consultá-la quando ela não estiver disponível (por exemplo, ao abrir a calculadora direto, sem passar pela tela de Saldo). A calculadora MUST NOT gravar nada: nenhum lançamento, nenhuma chamada de escrita à API e nenhum dado persistido no aparelho, e MUST NOT alterar o saldo, o ciclo, o histórico ou a proporção.

#### Scenario: Abrir a calculadora
- **WHEN** o usuário toca em "Depósito" na tela de Saldo
- **THEN** a tela de Depósito é exibida com o campo de valor vazio e sem partes calculadas

#### Scenario: Dividir pela proporção vigente
- **WHEN** a proporção vigente é 60/40 e o usuário informa R$ 1.000,00
- **THEN** o app mostra Ariel 60% com R$ 600,00 e Isabella 40% com R$ 400,00

#### Scenario: Centavo que sobra
- **WHEN** a proporção vigente é 50/50 e o usuário informa R$ 100,01
- **THEN** o app mostra R$ 50,01 para o Ariel e R$ 50,00 para a Isabella, somando R$ 100,01

#### Scenario: Resultado acompanha a digitação
- **WHEN** o usuário altera o valor informado
- **THEN** as partes são recalculadas na hora, sem tocar em nenhum botão

#### Scenario: Proporção que mudou
- **WHEN** o usuário muda a proporção para 70/30, volta à tela de Saldo e abre a calculadora com R$ 1.000,00
- **THEN** o app mostra R$ 700,00 para o Ariel e R$ 300,00 para a Isabella

#### Scenario: Valor vazio
- **WHEN** o campo de valor está vazio
- **THEN** o app não mostra valores de partes e não exibe mensagem de erro

#### Scenario: Valor inválido
- **WHEN** o usuário informa um texto que não é valor, ou zero
- **THEN** o app não mostra valores de partes e informa que o valor deve ser maior que zero

#### Scenario: Nada é gravado
- **WHEN** o usuário calcula um depósito e volta à tela de Saldo
- **THEN** o saldo, o ciclo aberto e o histórico estão exatamente como antes, e o valor digitado não é lembrado ao reabrir a calculadora

#### Scenario: Sem nova consulta
- **WHEN** o usuário abre a calculadora a partir da tela de Saldo
- **THEN** a calculadora aparece na hora, com a proporção exibida na tela de Saldo, sem pedir o saldo ao servidor de novo

#### Scenario: Abertura direta
- **WHEN** a calculadora é aberta sem passar pela tela de Saldo (por exemplo, recarregando a página nela)
- **THEN** o app busca a proporção vigente e só então mostra a calculadora

#### Scenario: Proporção indisponível
- **WHEN** a calculadora é aberta direto e a proporção vigente não carrega
- **THEN** o app mostra o erro com a opção de tentar de novo, como nas demais telas
