# Tarefas Mensais - Documentação

Este documento descreve a implementação da funcionalidade de Tarefas Mensais na aplicação.

## Visão Geral

A aba "Mensais" no módulo de Tarefas permite gerenciar tarefas que são realizadas mensalmente em dias específicos do mês. Estas tarefas são independentes das outras abas e são gerenciadas em sua própria coleção no Firebase.

## Funcionalidades

1. **Adicionar nova tarefa mensal**
   - Descrição da tarefa
   - Dia do mês específico (1 a 31)
   - Status inicial

2. **Gerenciar tarefas mensais**
   - Visualizar todas as tarefas mensais
   - Editar descrição e dia do mês
   - Alterar status (Pendente, Em andamento, Finalizada, Aguardando, Urgente)
   - Excluir tarefas (apenas usuários master)

3. **Reset automático de tarefas**
   - Tarefas marcadas como "Finalizada" são automaticamente resetadas para "Pendente" quando o dia do mês correto chega novamente
   - O campo "Feito em" mostra a última data em que a tarefa foi concluída

## Coleção no Firebase

- **Nome da coleção**: `tarefas_mensais`
- **Campos**:
  - `descricao`: String (descrição da tarefa)
  - `diaDoMes`: Number (1-31, dia do mês)
  - `status`: String (Pendente, Em andamento, Finalizada, Aguardando, Urgente)
  - `ultimaExecucao`: Timestamp (data/hora da última vez que foi marcada como Finalizada)
  - `createdAt`: Timestamp
  - `createdBy`: String (ID do usuário que criou)
  - `updatedAt`: Timestamp
  - `updatedBy`: String (ID do usuário que atualizou por último)

## Como Testar o Reset Automático

Para testar a funcionalidade de reset automático das tarefas mensais, você pode observar o comportamento quando:

1. Uma tarefa configurada para o dia atual do mês é marcada como "Finalizada"
2. Após ser finalizada, ela permanecerá nesse estado até o próximo mês, quando o dia correspondente ocorrer novamente
3. No dia correspondente do próximo mês, a tarefa será automaticamente resetada para "Pendente"

### Considerações sobre dias do mês

- Para dias que não existem em alguns meses (como 31 em fevereiro), a tarefa só será exibida como pendente nos meses que possuem esse dia
- O sistema verifica automaticamente o dia atual do mês para determinar quais tarefas devem ser resetadas

## Registros de Log

Todas as ações relacionadas às tarefas mensais são registradas na coleção `task_logs` e podem ser visualizadas na aba "Logs". Os registros incluem:

- Criação de novas tarefas mensais
- Edição de tarefas
- Alterações de status
- Exclusão de tarefas
- Resets automáticos

## Permissões

- **Visualização**: Todos os usuários autenticados
- **Criação/Edição**: Usuários master e administrative
- **Exclusão**: Apenas usuários master 