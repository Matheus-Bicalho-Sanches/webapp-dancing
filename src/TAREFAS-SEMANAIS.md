# Tarefas Semanais - Documentação

Este documento descreve a implementação da funcionalidade de Tarefas Semanais na aplicação.

## Visão Geral

A aba "Semanais" no módulo de Tarefas permite gerenciar tarefas que são realizadas semanalmente em dias específicos. Estas tarefas são independentes das outras abas e são gerenciadas em sua própria coleção no Firebase.

## Funcionalidades

1. **Adicionar nova tarefa semanal**
   - Descrição da tarefa
   - Dia da semana específico (Segunda a Domingo)
   - Status inicial

2. **Gerenciar tarefas semanais**
   - Visualizar todas as tarefas semanais
   - Editar descrição e dia da semana
   - Alterar status (Pendente, Em andamento, Finalizada, Aguardando, Urgente)
   - Excluir tarefas (apenas usuários master)

3. **Reset automático de tarefas**
   - Tarefas marcadas como "Finalizada" são automaticamente resetadas para "Pendente" quando o dia da semana correto chega novamente
   - O campo "Feito em" mostra a última data em que a tarefa foi concluída

## Coleção no Firebase

- **Nome da coleção**: `tarefas_semanais`
- **Campos**:
  - `descricao`: String (descrição da tarefa)
  - `diaDaSemana`: Number (1-7, onde 1 = Segunda-feira, 7 = Domingo)
  - `status`: String (Pendente, Em andamento, Finalizada, Aguardando, Urgente)
  - `ultimaExecucao`: Timestamp (data/hora da última vez que foi marcada como Finalizada)
  - `createdAt`: Timestamp
  - `createdBy`: String (ID do usuário que criou)
  - `updatedAt`: Timestamp
  - `updatedBy`: String (ID do usuário que atualizou por último)

## Como Testar o Reset Automático

Para testar a funcionalidade de reset automático das tarefas semanais, você pode usar o script de teste disponível em `src/testWeeklyTaskReset.js`. Este script permite simular diferentes dias da semana sem precisar esperar o dia real.

### Passos para testar:

1. Acesse a página de Tarefas na aba "Semanais"
2. Abra o console do navegador (F12 ou Ctrl+Shift+I)
3. Copie e cole o conteúdo do arquivo `src/testWeeklyTaskReset.js` no console
4. Use os comandos disponíveis:

```javascript
// Sobrescrever a função getDay para permitir simulação
overrideGetDayOfWeek()

// Simular um dia da semana específico (1-7)
// Exemplo: Segunda-feira = 1, Domingo = 7
simulateDayOfWeek(3) // Simula quarta-feira

// Ver tarefas programadas para o dia atual simulado
showTasksForToday(weeklyTasks)

// Testar manualmente o reset
testWeeklyReset(weeklyTasks)

// Remover simulação e voltar ao dia real
resetDayOfWeekSimulation()
```

### Casos de teste recomendados:

1. Crie tarefas para diferentes dias da semana
2. Marque algumas como "Finalizada"
3. Simule o dia da semana correspondente
4. Recarregue a página e observe se o status foi alterado para "Pendente"
5. Verifique na aba "Logs" se o reset foi registrado corretamente

## Registros de Log

Todas as ações relacionadas às tarefas semanais são registradas na coleção `task_logs` e podem ser visualizadas na aba "Logs". Os registros incluem:

- Criação de novas tarefas semanais
- Edição de tarefas
- Alterações de status
- Exclusão de tarefas
- Resets automáticos

## Permissões

- **Visualização**: Todos os usuários autenticados
- **Criação/Edição**: Usuários master e administrative
- **Exclusão**: Apenas usuários master 