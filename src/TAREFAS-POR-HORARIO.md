# Tarefas Por Horário

Este módulo permite gerenciar tarefas agendadas por horário específico, que podem ser configuradas para ocorrer em determinados dias da semana.

## Funcionalidades

1. **Criar Tarefa por Horário**: Cria uma nova tarefa que deve ser executada em horários específicos em dias da semana selecionados.
2. **Editar Tarefa por Horário**: Permite modificar a descrição, dias da semana, horário e status de uma tarefa existente.
3. **Excluir Tarefa por Horário**: Remove permanentemente uma tarefa por horário do sistema.
4. **Alterar Status**: Atualiza o status da tarefa (Pendente, Em andamento, Finalizada, Aguardando, Urgente).
5. **Registrar Logs**: Qualquer ação nas tarefas é registrada para auditoria.

## Estrutura no Firebase

### Coleção: `tarefas_por_horario`

Cada documento nesta coleção representa uma tarefa agendada por horário.

```javascript
{
  id: "id_gerado_automaticamente",
  descricao: "Reunião com equipe de desenvolvimento",
  diasDaSemana: ["Segunda", "Quarta", "Sexta"],
  horario: "14:30",
  status: "Pendente",
  criadoEm: timestamp,
  atualizadoEm: timestamp,
  criadoPor: {
    uid: "123456",
    email: "usuario@exemplo.com",
    displayName: "Nome do Usuário"
  },
  ultimaAtualizacaoPor: {
    uid: "123456",
    email: "usuario@exemplo.com",
    displayName: "Nome do Usuário"
  }
}
```

### Campos

- **id**: Identificador único da tarefa.
- **descricao**: Descrição da tarefa a ser realizada.
- **diasDaSemana**: Array contendo os dias da semana em que a tarefa deve ser executada.
- **horario**: Horário específico para a execução da tarefa no formato HH:MM.
- **status**: Situação atual da tarefa. Possíveis valores:
  - Pendente
  - Em andamento
  - Finalizada
  - Aguardando
  - Urgente
- **criadoEm**: Timestamp da criação da tarefa.
- **atualizadoEm**: Timestamp da última atualização da tarefa.
- **criadoPor**: Informações do usuário que criou a tarefa.
- **ultimaAtualizacaoPor**: Informações do último usuário que atualizou a tarefa.

## Logs de Ações

Todas as ações realizadas nas tarefas por horário são registradas na coleção `task_logs` com as seguintes informações:

- **ação**: Tipo de ação realizada (create_scheduled, edit_scheduled, delete_scheduled, status_change_scheduled).
- **taskId**: ID da tarefa afetada.
- **descricao**: Descrição da tarefa afetada.
- **usuario**: Informações do usuário que realizou a ação.
- **timestamp**: Data e hora da ação.
- **details**: Detalhes adicionais sobre a ação, incluindo:
  - **taskType**: "agendada"
  - **diasDaSemana**: Dias da semana em que a tarefa ocorre
  - **horario**: Horário da tarefa
  - **oldStatus**: Status anterior (para ações de mudança de status)
  - **newStatus**: Novo status (para ações de mudança de status)

## Interface do Usuário

A interface apresenta uma tabela com as seguintes colunas:
- Descrição
- Dias da Semana
- Horário
- Status
- Ações (Editar/Excluir)

O botão "Nova Tarefa Por Horário" permite criar novas tarefas.

## Regras de Negócio

1. Uma tarefa por horário sempre precisa ter pelo menos um dia da semana selecionado.
2. O horário é um campo obrigatório e deve estar no formato HH:MM.
3. Apenas usuários com permissões adequadas podem excluir tarefas.
4. Todos os usuários podem criar, editar e atualizar o status das tarefas.
5. Todas as ações são registradas em logs para auditoria. 