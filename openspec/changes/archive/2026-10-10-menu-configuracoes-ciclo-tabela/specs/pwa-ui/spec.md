## MODIFIED Requirements

### Requirement: Tela de Saldo como inicial
Depois do login, o app SHALL exibir a tela de Saldo, com a frase do saldo ("X deve R$ Y a Z") e o resumo do ciclo aberto. O resumo do ciclo aberto SHALL mostrar primeiro o valor total das contas e, depois dele, uma tabela com uma coluna para cada pessoa ("Ariel" e "Isabella") e três linhas: "Proporção" (a divisão vigente, em porcentagem), "Pagou" (quanto a pessoa pagou no ciclo) e "Parte" (quanto a pessoa deve arcar no ciclo). A tela MUST ter um botão bem visível para adicionar uma compra e acessos ao Histórico e ao acerto ("Paguei"). A tela MUST NOT oferecer a Proporção como atalho na área principal; esse acesso fica no menu de configurações.

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
- **THEN** os atalhos visíveis são apenas "Paguei" e "Histórico"

## ADDED Requirements

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
