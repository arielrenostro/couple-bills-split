## Purpose

Define a experiência de uso no celular: instalação como PWA, telas principais e o fluxo de confirmações, para registrar e consultar as contas com poucos toques.

## ADDED Requirements

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
Depois do login, o app SHALL exibir a tela de Saldo, com a proporção vigente, o total do ciclo aberto, o quanto cada pessoa pagou e a parte devida de cada um, e a frase do saldo ("X deve R$ Y a Z"). A tela MUST ter um botão bem visível para adicionar uma compra e acessos ao Histórico, à Proporção e ao acerto ("Paguei").

#### Scenario: Saldo exibido
- **WHEN** o usuário entra no app
- **THEN** vê o saldo do ciclo aberto e o botão de adicionar compra em destaque

#### Scenario: Saldo zerado
- **WHEN** o saldo do ciclo aberto é zero
- **THEN** a tela informa que não há dívida

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
