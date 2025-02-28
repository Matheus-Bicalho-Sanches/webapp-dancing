/**
 * Script para testar o reset automático de tarefas mensais
 * 
 * Este script permite simular diferentes dias do mês para testar
 * o comportamento de reset das tarefas mensais.
 * 
 * Como usar:
 * 1. Acesse a página de Tarefas e navegue para a aba "Mensais"
 * 2. Abra o console do navegador (F12)
 * 3. Cole este script completo e execute
 * 4. Utilize as funções disponibilizadas para testar
 */

// Armazena a função original getDate para restaurar depois
let originalGetDate = Date.prototype.getDate;
let simulatedDayOfMonth = null;

/**
 * Sobrescreve a função getDate() para simular um dia específico do mês
 */
function overrideGetDateOfMonth() {
  Date.prototype.getDate = function() {
    if (simulatedDayOfMonth !== null) {
      return simulatedDayOfMonth;
    }
    return originalGetDate.call(this);
  };
  
  console.log('✅ Simulação de dia do mês ativada');
}

/**
 * Restaura a função getDate() original
 */
function resetDateOfMonthSimulation() {
  Date.prototype.getDate = originalGetDate;
  simulatedDayOfMonth = null;
  console.log('✅ Simulação de dia do mês desativada. Voltando ao dia real.');
}

/**
 * Simula um dia específico do mês
 * @param {number} day - Dia do mês a ser simulado (1-31)
 */
function simulateDayOfMonth(day) {
  if (day < 1 || day > 31) {
    console.error('❌ Dia inválido. Use um valor entre 1 e 31.');
    return;
  }
  
  simulatedDayOfMonth = day;
  console.log(`✅ Simulando dia ${day} do mês`);
}

/**
 * Mostra as tarefas programadas para o dia atual simulado
 * @param {Array} tasks - Array de tarefas mensais
 */
function showTasksForToday(tasks) {
  const today = new Date();
  const currentDay = today.getDate(); // Usa a função potencialmente simulada
  
  console.log(`📅 Dia atual${simulatedDayOfMonth !== null ? ' (simulado)' : ''}: ${currentDay}`);
  console.log('Tarefas para hoje:');
  
  const tasksForToday = tasks.filter(task => task.diaDoMes === currentDay);
  
  if (tasksForToday.length === 0) {
    console.log('- Nenhuma tarefa para hoje');
  } else {
    tasksForToday.forEach(task => {
      console.log(`- ${task.descricao} (Status: ${task.status})`);
    });
  }
}

/**
 * Testa manualmente o reset das tarefas mensais
 * @param {Array} tasks - Array de tarefas mensais
 */
function testMonthlyReset(tasks) {
  const today = new Date();
  const currentDay = today.getDate(); // Usa a função potencialmente simulada
  
  console.log(`🔄 Testando reset para o dia ${currentDay}${simulatedDayOfMonth !== null ? ' (simulado)' : ''} do mês`);
  
  const tasksToReset = tasks.filter(task => {
    // Verificar se o status é "Finalizada"
    if (task.status !== 'Finalizada') return false;
    
    // Verificar se hoje é o dia do mês para esta tarefa
    if (task.diaDoMes !== currentDay) return false;
    
    // Verificar se a tarefa já foi finalizada hoje
    if (task.ultimaExecucao) {
      const lastExecution = task.ultimaExecucao.toDate ? task.ultimaExecucao.toDate() : new Date(task.ultimaExecucao);
      const lastExecutionDay = lastExecution.getDate();
      const lastExecutionMonth = lastExecution.getMonth();
      const lastExecutionYear = lastExecution.getFullYear();
      
      const isToday = 
        lastExecutionDay === today.getDate() && 
        lastExecutionMonth === today.getMonth() && 
        lastExecutionYear === today.getFullYear();
        
      if (isToday) return false;
    }
    
    return true;
  });
  
  if (tasksToReset.length === 0) {
    console.log('✅ Nenhuma tarefa precisa ser resetada hoje');
  } else {
    console.log(`🔄 ${tasksToReset.length} tarefas precisam ser resetadas:`);
    tasksToReset.forEach(task => {
      console.log(`- ${task.descricao} (última execução: ${task.ultimaExecucao ? new Date(task.ultimaExecucao.toDate()).toLocaleDateString() : 'nunca'})`);
    });
  }
}

// Exibir instruções de uso
console.log(`
🔧 Funções disponíveis para teste de tarefas mensais:

1. overrideGetDateOfMonth()
   Ativa a simulação de dia do mês

2. simulateDayOfMonth(day)
   Simula um dia específico do mês (1-31)
   Exemplo: simulateDayOfMonth(15)

3. showTasksForToday(monthlyTasks)
   Mostra tarefas programadas para o dia atual (real ou simulado)

4. testMonthlyReset(monthlyTasks)
   Testa quais tarefas seriam resetadas no dia atual

5. resetDateOfMonthSimulation()
   Desativa a simulação e volta ao dia real

Exemplo de uso:
overrideGetDateOfMonth()
simulateDayOfMonth(10)
showTasksForToday(monthlyTasks)
testMonthlyReset(monthlyTasks)
resetDateOfMonthSimulation()
`); 