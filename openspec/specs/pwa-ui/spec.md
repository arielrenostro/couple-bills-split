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

### Requirement: Tela de Compra
O app SHALL oferecer um formulário de compra com valor (teclado numérico), quem pagou (padrão: usuário logado), descrição, data (padrão: hoje) e escolha entre proporção padrão e customizada. O botão de registrar MUST gravar sem pedir confirmação adicional.

#### Scenario: Registrar compra
- **WHEN** o usuário preenche valor e descrição e toca em Registrar
- **THEN** a compra é gravada e o app volta à tela de Saldo atualizada

#### Scenario: Proporção customizada
- **WHEN** o usuário escolhe proporção customizada
- **THEN** o formulário exibe o campo para informar a divisão

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
- **WHEN** o usuário cancela na confirmação do "Paguei"
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
