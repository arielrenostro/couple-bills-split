## Purpose

Controla o acesso ao app: o casal entra escolhendo um dos dois usuários e informando uma senha única, e recebe uma sessão de longa duração para não precisar logar de novo no celular.

## ADDED Requirements

### Requirement: Login com usuário e senha única
O sistema SHALL permitir login escolhendo um usuário entre `ariel` e `isabella` e informando a senha compartilhada. Nenhum outro usuário MUST ser aceito.

#### Scenario: Login válido
- **WHEN** o usuário escolhe `ariel` e informa a senha correta
- **THEN** o sistema responde com um token de sessão e a identidade `ariel`

#### Scenario: Senha incorreta
- **WHEN** o usuário informa uma senha incorreta
- **THEN** o sistema recusa o login com erro de credenciais e não emite token

#### Scenario: Usuário desconhecido
- **WHEN** a requisição de login informa um usuário diferente de `ariel` e `isabella`
- **THEN** o sistema recusa o login e não emite token

### Requirement: Senha armazenada com hash e salt
O sistema SHALL guardar a senha compartilhada como `sha256(senha + salt)` em um item único de configuração no DynamoDB, no formato `{ salt, hash }`, e MUST NOT guardar a senha em texto puro. O valor inicial da senha SHALL ser `batman`. A comparação do hash MUST ser feita em tempo constante.

#### Scenario: Configuração inicial
- **WHEN** o sistema é provisionado pela primeira vez
- **THEN** o item de configuração contém `salt` e o `hash` correspondente à senha `batman`

#### Scenario: Verificação da senha
- **WHEN** uma senha é informada no login
- **THEN** o sistema calcula `sha256(senha + salt)` e compara com o `hash` gravado, aceitando só se forem iguais

### Requirement: Sessão por JWT de longa duração
Após o login, o sistema SHALL emitir um JWT assinado (HS256) com validade de 3650 dias, contendo o usuário autenticado. O segredo de assinatura SHALL ser persistido no mesmo item de configuração do DynamoDB e MUST ser gerado automaticamente na primeira execução caso ainda não exista.

#### Scenario: Token válido
- **WHEN** uma requisição à API traz um JWT assinado com o segredo vigente e dentro da validade
- **THEN** o sistema processa a requisição em nome do usuário do token

#### Scenario: Token expirado ou adulterado
- **WHEN** a requisição traz um JWT expirado, com assinatura inválida ou malformado
- **THEN** o sistema responde 401 e não processa a requisição

#### Scenario: Rotação do segredo
- **WHEN** o segredo de assinatura gravado no DynamoDB é substituído
- **THEN** todos os tokens emitidos com o segredo anterior passam a ser rejeitados

### Requirement: Rotas protegidas
Todas as rotas da API, exceto o login, SHALL exigir um JWT válido.

#### Scenario: Acesso sem token
- **WHEN** uma rota de lançamentos ou de saldo é chamada sem token
- **THEN** o sistema responde 401
