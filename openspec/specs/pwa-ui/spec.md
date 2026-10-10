# pwa-ui Specification

## Purpose
Define a experiência de uso no celular: instalação como PWA, telas principais e o fluxo de confirmações, para registrar e consultar as contas com poucos toques.

## Requirements

### Requirement: Instalação como PWA
O app SHALL ser instalável na tela inicial do celular, com manifest e ícone, e SHALL abrir em tela cheia. O layout MUST ser pensado para telas estreitas em pé, com alvos de toque grandes, e MUST NOT exigir rolagem horizontal.

#### Scenario: Instalação
- **WHEN** o usuário adiciona o app à tela inicial
- **THEN** o app abre em tela cheia, sem a barra do navegador

### Requirement: Tela de login
O app SHALL apresentar uma tela de login com a escolha entre `ariel` e `isabella` e um campo de senha. Após o login, o app SHALL guardar o token no aparelho e MUST NOT pedir login de novo enquanto o token for válido.

#### Scenario: Primeiro acesso
- **WHEN** o usuário abre o app sem token
- **THEN** a tela de login é exibida

#### Scenario: Acesso posterior
- **WHEN** o usuário abre o app com token válido
- **THEN** a tela de Saldo é exibida direto

#### Scenario: Sessão expirada
- **WHEN** a API responde 401
- **THEN** o app descarta o token e volta ao login

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

### Requirement: Tela de Histórico em cards
O app SHALL exibir o histórico como lista de cards, do mais recente ao mais antigo, cada um mostrando conta, quem pagou, valor total, proporção, valor devido a cada pessoa e saldo acumulado. Cards de acerto e de proporção SHALL ser visualmente distintos dos de despesa. Cards de ciclos fechados SHALL aparecer sem a ação de remover.

#### Scenario: Card de despesa
- **WHEN** o histórico tem uma despesa
- **THEN** o card mostra os seis campos

#### Scenario: Card de ciclo fechado
- **WHEN** um lançamento pertence a um ciclo fechado
- **THEN** o card não oferece a ação de remover

### Requirement: Confirmações
O app SHALL exigir confirmação explícita para remover um lançamento e para registrar um acerto, e SHALL exigir o passo de preview para mudar a proporção. O app MUST NOT exigir confirmação para registrar uma compra.

#### Scenario: Confirmar remoção
- **WHEN** o usuário toca em Remover em um card
- **THEN** o app pede confirmação e só remove se o usuário confirmar

#### Scenario: Cancelar acerto
- **WHEN** o usuário cancela na confirmação do acerto aberto por "Adicionar acerto"
- **THEN** nenhum lançamento é gravado

### Requirement: Tela de Proporção com preview
O app SHALL permitir informar a nova proporção e SHALL mostrar o preview com o saldo antes e depois da mudança, com ação explícita de salvar.

#### Scenario: Preview
- **WHEN** o usuário digita uma nova proporção
- **THEN** o app mostra o saldo atual e o saldo resultante, sem gravar

#### Scenario: Salvar proporção
- **WHEN** o usuário confirma no preview
- **THEN** o lançamento de proporção é gravado e aparece no histórico

### Requirement: Menu de configurações
A tela de Saldo SHALL ter, no canto superior direito, um botão de configurações que abre um menu com as opções "Proporção" e "Sair". "Proporção" SHALL levar à tela de Proporção, e "Sair" SHALL encerrar a sessão (descartar o token e voltar ao login) sem pedir confirmação. O botão MUST ter nome acessível ("Configurações") e alvo de toque grande, e o menu SHALL fechar ao escolher uma opção, ao tocar fora dele ou ao pressionar Esc. A tela de Saldo MUST NOT ter outro botão "Sair" fora do menu.

#### Scenario: Abrir o menu
- **WHEN** o usuário toca no botão de configurações
- **THEN** o menu aparece com as opções "Proporção" e "Sair"

#### Scenario: Ir para a Proporção
- **WHEN** o usuário abre o menu e toca em "Proporção"
- **THEN** o menu fecha e a tela de Proporção é exibida

#### Scenario: Sair
- **WHEN** o usuário abre o menu e toca em "Sair"
- **THEN** o token é descartado e a tela de login é exibida

#### Scenario: Fechar sem escolher
- **WHEN** o menu está aberto e o usuário toca fora dele ou pressiona Esc
- **THEN** o menu fecha e nada mais acontece

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
